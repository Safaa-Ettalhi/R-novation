'use client';

import { useState, useRef, useEffect } from 'react';
import ChatBubble from '@/components/Chat/ChatBubble';
import MessageInput from '@/components/Chat/MessageInput';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export type Role = 'user' | 'ia' | 'expert' | 'system';

export interface Message {
  id: string;
  role: Role;
  content: string;
  isImage?: boolean;
  isEstimate?: boolean;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'ia',
      content: "Bonjour ! Je suis l'assistant virtuel des Artistes Rénov. Décrivez-moi votre projet ou votre problème de rénovation (ex: plomberie, électricité, peinture...) ou envoyez une photo."
    }
  ]);
  const [isExpertMode, setIsExpertMode] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [guestId, setGuestId] = useState<string>('');
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);

  const viewerId = sessionUserId ?? guestId;

  // Realtime State
  const [realtimeRequestId, setRealtimeRequestId] = useState<string | null>(null);
  const [isMatchmaking, setIsMatchmaking] = useState(false);
  const [isExpertConnected, setIsExpertConnected] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Generate or retrieve Guest ID
    let storedId = localStorage.getItem('les_artistes_guest_id');
    if (!storedId) {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        storedId = crypto.randomUUID();
      } else {
        storedId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      }
      localStorage.setItem('les_artistes_guest_id', storedId);
    }
    setGuestId(storedId);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      const uid = session?.user?.id ?? null;
      setSessionUserId(uid);
      if (uid) restoreHistory(uid);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const restoreHistory = async (userId: string) => {
    // Find the most recent pending or active request for this user
    const { data: reqData } = await supabase
      .from('support_requests')
      .select('id, status, domain')
      .eq('user_id', userId)
      .in('status', ['pending', 'active'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!reqData) return;

    setRealtimeRequestId(reqData.id);
    if (reqData.status === 'active') {
      setIsExpertConnected(true);
      setIsMatchmaking(false);
    } else {
      setIsMatchmaking(true);
    }

    const { data: msgs } = await supabase
      .from('messages')
      .select('*')
      .eq('request_id', reqData.id)
      .order('created_at', { ascending: true });

    if (msgs && msgs.length > 0) {
      const restored: Message[] = msgs
        // Filter out the expert-only join message — clients must not see it
        .filter((m: any) => !(m.role === 'system' && m.content === 'Vous avez rejoint la discussion.'))
        .map((m: any) => ({
          id: m.id,
          role: m.role as Role,
          content: m.content,
          isImage: m.is_image ?? false,
        }));
      setMessages(prev => {
        // Keep only the initial IA welcome, then append history
        const welcome = prev.filter(p => p.role === 'ia' && p.id === '1');
        return [...welcome, ...restored];
      });
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Écoute Supabase si on est en matchmaking
  useEffect(() => {
    if (!realtimeRequestId || !isSupabaseConfigured) return;

    // Écouter les changements sur la demande (ex: un expert accepte)
    const requestSub = supabase
      .channel(`public:support_requests:id=eq.${realtimeRequestId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'support_requests', filter: `id=eq.${realtimeRequestId}` }, payload => {
        if (payload.new.status === 'active') {
          setIsMatchmaking(false);
          setIsExpertConnected(true);
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'system',
            content: "Un expert vient de rejoindre la conversation en direct."
          }]);
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            new Notification('Les Artistes', { body: 'Un expert a rejoint la conversation.' });
          }
        }
      })
      .subscribe();

    // Écouter les nouveaux messages
    const messageSub = supabase
      .channel(`public:messages:request_id=eq.${realtimeRequestId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `request_id=eq.${realtimeRequestId}` }, payload => {
        const newMsg = payload.new;
        if (String(newMsg.sender_id) !== String(viewerId)) {
          // Skip expert-only join message — clients must not see "Vous avez rejoint la discussion."
          if (newMsg.role === 'system' && newMsg.content === 'Vous avez rejoint la discussion.') return;
          setMessages(prev => [...prev, {
            id: newMsg.id,
            role: newMsg.role as Role,
            content: newMsg.content,
            isImage: newMsg.is_image ?? false,
          }]);
          setIsTyping(false);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(requestSub);
      supabase.removeChannel(messageSub);
    };
  }, [realtimeRequestId, viewerId]);

  const toggleExpertMode = async () => {
    if (isMatchmaking || isExpertConnected) {
      // Disconnect or cancel
      setIsExpertMode(false);
      setIsMatchmaking(false);
      setIsExpertConnected(false);
      setRealtimeRequestId(null);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'ia',
        content: "Connexion avec l'artisan terminée. L'IA reprend le relais."
      }]);
      // TODO: Update request status to 'cancelled' or 'resolved' in Supabase
      return;
    }

    setIsExpertMode(true);
    await requestHumanExpert();
  };

  const requestHumanExpert = async () => {
    if (!isSupabaseConfigured) {
      setIsExpertMode(false);
      setIsMatchmaking(false);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'ia',
        content: 'Pour parler à un expert humain, ajoutez NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY dans votre fichier .env (projet Supabase), puis redémarrez le serveur.'
      }]);
      return;
    }

    setIsMatchmaking(true);
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      void Notification.requestPermission();
    }
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'user',
      content: "Je souhaite parler à un expert humain."
    }]);

    try {
      if (!viewerId) {
        setIsMatchmaking(false);
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'ia',
          content: 'Impossible de démarrer la mise en relation : identifiant temporaire indisponible. Réessayez dans un instant.'
        }]);
        return;
      }
      const res = await fetch('/api/matchmake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, userId: viewerId })
      });
      const data = await res.json();
      
      if (data.requestId) {
        setRealtimeRequestId(data.requestId);
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'ia',
          content: `J'ai détecté que votre problème concerne : ${data.domain}. Je cherche un artisan qualifié disponible pour prendre le relais...`
        }]);
      }
    } catch (e) {
      setIsMatchmaking(false);
      console.error(e);
    }
  };

  const handleSendMessage = async (text: string, imageBase64?: string | null) => {
    const tempId = Date.now().toString();
    
    if (imageBase64) {
      setMessages(prev => [...prev, { id: tempId + 'img', role: 'user', content: imageBase64, isImage: true }]);
      if (text) {
        setMessages(prev => [...prev, { id: tempId, role: 'user', content: text }]);
      }
    } else {
      setMessages(prev => [...prev, { id: tempId, role: 'user', content: text }]);
    }

    if (isExpertConnected && realtimeRequestId && isSupabaseConfigured) {
      // Send image message
      if (imageBase64) {
        await supabase.from('messages').insert({
          request_id: realtimeRequestId,
          sender_id: viewerId,
          content: imageBase64,
          role: 'user',
          is_image: true,
        });
      }
      // Send text message
      if (text) {
        await supabase.from('messages').insert({
          request_id: realtimeRequestId,
          sender_id: viewerId,
          content: text,
          role: 'user',
          is_image: false,
        });
      }
      return; // Do not call AI API
    }

    setIsTyping(true);

    try {
      // The backend API now handles multimodal images natively.
      let imageAnalysis = "";

      const lowerText = text.toLowerCase();
      if (isExpertMode && (lowerText.includes('devis') || lowerText.includes('estimation') || lowerText.includes('prix'))) {
        setIsTyping(false);
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'expert',
          content: "Très bien, je vous prépare le devis réel pour cette intervention immédiatement."
        }]);
        
        setIsTyping(true);
        const devisRes = await fetch('/api/devis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ context: text + " " + imageAnalysis })
        });
        const devisData = await devisRes.json();
        
        setIsTyping(false);
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'expert',
          content: JSON.stringify(devisData),
          isEstimate: true
        }]);
        return;
      }

      const chatRes = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages.map(m => ({ 
            role: m.role === 'user' ? 'user' : 'assistant', 
            content: m.content,
            isImage: m.isImage
          })).concat(
             imageBase64 ? [{ role: 'user', content: imageBase64, isImage: true }] : []
          ).concat(
             text ? [{ role: 'user', content: text, isImage: false }] : []
          ),
          isExpertMode
        })
      });
      
      const chatData = await chatRes.json();
      setIsTyping(false);
      
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: isExpertMode ? 'expert' : 'ia',
        content: chatData.reply || "Désolé, je n'ai pas pu générer une réponse."
      }]);

    } catch (e) {
      console.error(e);
      setIsTyping(false);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'ia',
        content: "Une erreur de connexion est survenue."
      }]);
    }
  };

  return (
    <>
      <main className="flex-grow pb-12 px-4 sm:px-6 flex flex-col items-center justify-center min-h-[calc(100vh-5rem)] pt-6 sm:pt-10">
        
        {/* Header Text */}
        <div className="text-center max-w-2xl mb-10 fade-in">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-primary mb-4 leading-tight font-serif">L'expertise rénovation,<br/>maintenant augmentée par l'IA</h1>
          <p className="text-base sm:text-lg text-gray-600">Discutez avec notre IA ou faites appel à un expert pour chiffrer vos travaux instantanément. Précision, réactivité et savoir-faire professionnel.</p>
        </div>

        {/* Chat App Container */}
        <div id="assistant" className="w-full max-w-3xl bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden flex flex-col h-[650px] fade-in" style={{animationDelay: '0.1s'}}>
          
          {/* Chat Header */}
          <div className="bg-primary px-6 py-4 flex justify-between items-center text-white shadow-sm z-10">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                </div>
                <span className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-primary rounded-full ${isExpertConnected ? 'bg-accent' : 'bg-green-400'}`}></span>
              </div>
              <div>
                <h2 className="font-bold text-lg leading-tight">
                  {isExpertConnected ? "Artisan Réel Connecté" : (isExpertMode ? "Expert IA" : "Assistant Les Artistes")}
                </h2>
                <p className="text-xs text-blue-200">
                  {isMatchmaking ? "Recherche en cours..." : "En ligne"}
                </p>
              </div>
            </div>

            {/* Actions Droite */}
            <div className="flex items-center space-x-3">
              <span id="mode-label" className="text-blue-100 font-medium text-sm transition-colors hidden sm:block">
                {isMatchmaking ? 'Recherche...' : (isExpertConnected ? 'Connecté' : 'Mode IA')}
              </span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" id="toggle-mode" className="sr-only peer" checked={isExpertMode} onChange={toggleExpertMode} />
                <div className="w-11 h-6 bg-blue-900 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent border border-blue-800"></div>
              </label>
            </div>
          </div>

          {/* Chat Messages Area */}
          <div id="chat-messages" className="flex-grow p-4 sm:p-6 overflow-y-auto scrollbar-hide bg-bgLight flex flex-col gap-5 relative">
            {messages.map((msg) => (
              <ChatBubble key={msg.id} message={msg} />
            ))}
            
            {(isTyping || isMatchmaking) && (
              <div className="flex w-full justify-start fade-in">
                <div className="bg-white border border-gray-100 shadow-sm rounded-2xl rounded-tl-sm px-5 py-4 max-w-[70%] text-gray-700 flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <MessageInput onSend={handleSendMessage} />

        </div>
      </main>
    </>
  );
}
