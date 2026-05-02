'use client';

import { useState, useEffect } from 'react';
import type { Message } from '@/app/chat/page';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import ChatBubble from '@/components/Chat/ChatBubble';
import MessageInput from '@/components/Chat/MessageInput';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ExpertDashboard() {
  const router = useRouter();
  const [requests, setRequests] = useState<any[]>([]);
  const [activeRequest, setActiveRequest] = useState<any | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [expertId, setExpertId] = useState<string | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoadingAuth(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/auth/login');
        return;
      }
      // Vérifier le rôle
      supabase.from('profiles').select('*').eq('id', session.user.id).single().then(({ data }) => {
        if (!data || data.role !== 'expert') {
          router.push('/');
        } else {
          setExpertId(session.user.id);
          setLoadingAuth(false);
          fetchPendingRequests(data.domains);
        }
      });
    });
  }, []);

  useEffect(() => {
    if (!expertId || !isSupabaseConfigured) return;

    // S'abonner aux nouvelles requêtes
    const requestSubscription = supabase
      .channel('public:support_requests')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_requests' }, payload => {
        if (payload.new.status === 'pending') {
          setRequests(prev => [payload.new, ...prev]);
          if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
            void Notification.requestPermission();
          }
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            new Notification('Les Artistes', { body: 'Nouvelle demande en attente.' });
          }
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'support_requests' }, payload => {
        if (payload.new.status !== 'pending') {
          setRequests(prev => prev.filter(r => r.id !== payload.new.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(requestSubscription);
    };
  }, [expertId]);

  useEffect(() => {
    if (!activeRequest || !isSupabaseConfigured || !expertId) return;

    // Charger les messages existants (historique IA)
    fetchMessages(activeRequest.id);

    // S'abonner aux nouveaux messages de l'utilisateur
    const messageSubscription = supabase
      .channel(`public:messages:request_id=eq.${activeRequest.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `request_id=eq.${activeRequest.id}` }, payload => {
        const newMsg = payload.new;
        if (String(newMsg.sender_id) !== String(expertId)) {
          setMessages(prev => [...prev, { id: newMsg.id, role: newMsg.role as Message['role'], content: newMsg.content }]);
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            new Notification('Les Artistes', { body: 'Nouveau message du client.' });
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(messageSubscription);
    };
  }, [activeRequest, expertId]);

  const fetchPendingRequests = async (domains: string[] = []) => {
    let query = supabase.from('support_requests').select('*').eq('status', 'pending');
    
    // Si l'expert a des domaines précis, on filtre. Sinon (ou en test), on prend tout.
    if (domains && domains.length > 0) {
      query = query.in('domain', domains);
    }
    
    const { data } = await query.order('created_at', { ascending: false });
    if (data) setRequests(data);
  };

  const fetchMessages = async (requestId: string) => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('request_id', requestId)
      .order('created_at', { ascending: true });
    
    if (data) {
      setMessages(data.map((m: any) => ({
        id: m.id,
        role: m.role,
        content: m.content
      })));
    }
  };

  const handleAccept = async (request: any) => {
    const { error } = await supabase
      .from('support_requests')
      .update({ status: 'active', expert_id: expertId })
      .eq('id', request.id);

    if (!error) {
      setActiveRequest(request);
      
      // Envoyer un message automatique de bienvenue
      await sendMessage("Bonjour, je suis l'expert assigné à votre demande. J'ai pris connaissance de votre historique. Comment puis-je vous aider ?");
    }
  };

  const sendMessage = async (text: string, imageBase64?: string | null) => {
    if (!activeRequest || !expertId) return;

    const msgId = crypto.randomUUID();
    const newMsg: Message = { id: msgId, role: 'expert', content: text };

    setMessages(prev => [...prev, newMsg]);

    const { error } = await supabase.from('messages').insert({
      id: msgId,
      request_id: activeRequest.id,
      sender_id: expertId,
      content: text,
      role: 'expert',
    });
    if (error) console.error(error);
  };
  if (loadingAuth) {
    return <div className="flex h-screen items-center justify-center bg-gray-50 font-bold text-gray-500">Vérification de l'accès...</div>;
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="flex min-h-[calc(100vh-5rem)] bg-gray-50 flex-col">
        <div className="flex-grow px-6 max-w-lg mx-auto text-center py-12">
          <h1 className="text-xl font-bold text-gray-900 mb-3">Configuration Supabase requise</h1>
          <p className="text-gray-600 text-sm leading-relaxed mb-4">
            Pour l’espace artisan, ajoutez dans <code className="bg-gray-200 px-1 rounded text-xs">.env</code> les variables{' '}
            <code className="bg-gray-200 px-1 rounded text-xs">NEXT_PUBLIC_SUPABASE_URL</code> et{' '}
            <code className="bg-gray-200 px-1 rounded text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, puis redémarrez{' '}
            <code className="bg-gray-200 px-1 rounded text-xs">npm run dev</code>.
          </p>
          <Link href="/" className="text-primary font-medium hover:underline">
            Retour à l’accueil
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-5rem)] bg-gray-50 flex-col">
      <div className="flex-grow flex overflow-hidden max-w-7xl w-full mx-auto py-4">
        
        {/* Sidebar des requêtes */}
        <div className="w-1/3 bg-white border-r border-gray-200 overflow-y-auto p-4">
          <h2 className="font-bold text-lg mb-4 text-primary">Demandes en attente ({requests.length})</h2>
          <div className="space-y-3">
            {requests.map(req => (
              <div key={req.id} className="p-4 border rounded-xl hover:shadow-md transition bg-bgLight">
                <div className="flex justify-between items-center mb-2">
                  <span className="bg-primary/10 text-primary px-2 py-1 rounded text-xs font-bold uppercase">{req.domain}</span>
                  <span className="text-xs text-gray-500">{new Date(req.created_at).toLocaleTimeString()}</span>
                </div>
                <p className="text-sm text-gray-700 line-clamp-2 mb-3">{req.context}</p>
                <button 
                  onClick={() => handleAccept(req)}
                  className="w-full bg-primary text-white py-2 rounded-lg text-sm font-semibold hover:bg-primaryLight transition"
                >
                  Accepter
                </button>
              </div>
            ))}
            {requests.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-10">Aucune demande en attente pour le moment.</p>
            )}
          </div>
        </div>

        {/* Zone de Chat de l'Expert */}
        <div className="w-2/3 flex flex-col bg-gray-50">
          {activeRequest ? (
            <>
              <div className="bg-white border-b px-6 py-4 flex justify-between items-center shadow-sm">
                <div>
                  <h3 className="font-bold text-gray-800">Intervention : {activeRequest.domain}</h3>
                  <p className="text-xs text-green-600 font-medium">Vous êtes connecté en direct avec le client</p>
                </div>
                <button 
                  onClick={() => setActiveRequest(null)}
                  className="text-sm text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg transition"
                >
                  Quitter la conversation
                </button>
              </div>
              <div className="flex-grow p-6 overflow-y-auto flex flex-col gap-4">
                {messages.map(msg => (
                  <ChatBubble key={msg.id} message={msg} />
                ))}
              </div>
              <MessageInput onSend={sendMessage} />
            </>
          ) : (
            <div className="flex-grow flex items-center justify-center text-gray-400 flex-col gap-4">
              <svg className="w-16 h-16 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"></path></svg>
              <p>Sélectionnez une demande à gauche pour commencer à discuter</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
