'use client';

import { useState, useEffect, useRef } from 'react';
import type { Message } from '@/app/chat/page';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import ChatBubble from '@/components/Chat/ChatBubble';
import MessageInput from '@/components/Chat/MessageInput';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, Briefcase, CheckCircle, Clock, MessageSquare, User, Wifi, WifiOff } from 'lucide-react';

export default function ExpertDashboard() {
  const router = useRouter();
  const [requests, setRequests] = useState<any[]>([]);
  const [activeRequest, setActiveRequest] = useState<any | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [expertId, setExpertId] = useState<string | null>(null);
  const [expertDomains, setExpertDomains] = useState<string[]>([]);
  const [expertName, setExpertName] = useState<string>('');
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Auth & Profile ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isSupabaseConfigured) { setLoadingAuth(false); return; }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/auth/login'); return; }
      supabase.from('profiles').select('*').eq('id', session.user.id).single().then(({ data }) => {
        if (!data || data.role !== 'expert') {
          router.push('/');
        } else {
          setExpertId(session.user.id);
          setExpertName(data.full_name || 'Expert');
          const domains: string[] = data.domains ?? [];
          setExpertDomains(domains);
          setLoadingAuth(false);
          // Fetch pending requests filtered by this expert's domains
          fetchPendingRequests(domains);
        }
      });
    });
  }, []);

  // ── Realtime: new requests filtered by expert's domain ───────────────────
  useEffect(() => {
    if (!expertId || !isSupabaseConfigured) return;

    const requestSub = supabase
      .channel('expert_dashboard_requests')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_requests' }, payload => {
        const req = payload.new as any;
        // Only notify if domain matches expert's competences
        const matches = expertDomains.length === 0 || expertDomains.includes(req.domain);
        if (req.status === 'pending' && matches) {
          // Fetch client name for the new request
          supabase.from('profiles').select('full_name').eq('id', req.user_id).single().then(({ data }) => {
            setRequests(prev => [{ ...req, clientName: data?.full_name || 'Client' }, ...prev]);
          });
          triggerNotification(`Nouvelle demande — ${req.domain}`);
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'support_requests' }, payload => {
        // Remove from list if no longer pending
        if (payload.new.status !== 'pending') {
          setRequests(prev => prev.filter(r => r.id !== payload.new.id));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(requestSub); };
  }, [expertId, expertDomains]);

  // ── Realtime: messages for the active conversation ────────────────────────
  useEffect(() => {
    if (!activeRequest || !isSupabaseConfigured || !expertId) return;

    // Load full history when joining a conversation
    fetchMessages(activeRequest.id);

    const msgSub = supabase
      .channel(`expert_msgs_${activeRequest.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `request_id=eq.${activeRequest.id}` }, payload => {
        const m = payload.new as any;
        // Only add incoming messages (not our own, already added optimistically)
        if (String(m.sender_id) !== String(expertId)) {
          // Skip the expert-only system join message on client side
          if (m.role === 'system' && m.content === 'Vous avez rejoint la discussion.') return;
          setMessages(prev => [...prev, {
            id: m.id,
            role: m.role as Message['role'],
            content: m.content,
            isImage: m.is_image ?? false,
          }]);
          triggerNotification('Nouveau message du client');
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(msgSub); };
  }, [activeRequest, expertId]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  function triggerNotification(body: string) {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission === 'default') void Notification.requestPermission();
    if (Notification.permission === 'granted') new Notification('Les Artistes', { body });
  }

  /**
   * Fetch pending requests matching this expert's domains.
   * Also fetches the client name for each request.
   */
  const fetchPendingRequests = async (domains: string[] = []) => {
    let q = supabase.from('support_requests').select('*').eq('status', 'pending');
    if (domains.length > 0) q = q.in('domain', domains);
    const { data } = await q.order('created_at', { ascending: false });
    if (!data) return;

    // Enrich each request with the client's display name
    const enriched = await Promise.all(
      data.map(async (req: any) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', req.user_id)
          .single();
        return { ...req, clientName: profile?.full_name || 'Client' };
      })
    );
    setRequests(enriched);
  };

  /**
   * Fetch the full message history for a request and restore it.
   * Filters out the expert-only "Vous avez rejoint" system message
   * that should NOT be shown to clients.
   */
  const fetchMessages = async (requestId: string) => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('request_id', requestId)
      .order('created_at', { ascending: true });

    if (data) {
      setMessages(data.map((m: any) => ({
        id: m.id,
        role: m.role as Message['role'],
        content: m.content,
        isImage: m.is_image ?? false,
      })));
    }
  };

  /**
   * Accept a request: update DB status, show expert-only join message locally,
   * then send a welcome message from the expert.
   */
  const handleAccept = async (request: any) => {
    setJoiningId(request.id);
    const { error } = await supabase
      .from('support_requests')
      .update({ status: 'active', expert_id: expertId })
      .eq('id', request.id);

    if (!error) {
      setActiveRequest(request);
      setRequests(prev => prev.filter(r => r.id !== request.id));

      // "Vous avez rejoint la discussion" — expert-only, shown locally, NOT saved to DB
      // This prevents the client from seeing this message
      const joinMsgId = `expert-join-${Date.now()}`;
      setMessages([{
        id: joinMsgId,
        role: 'system',
        content: 'Vous avez rejoint la discussion.',
      }]);

      // Send the expert's welcome message to the DB (visible to both)
      await sendExpertMessage(request.id, "Bonjour ! J'ai pris connaissance de l'historique de votre demande. Comment puis-je vous aider ?");
    }
    setJoiningId(null);
  };

  /**
   * Send a message as the expert — optimistically adds to local state,
   * then persists to Supabase.
   */
  const sendExpertMessage = async (requestId: string, text: string) => {
    if (!expertId) return;
    const msgId = crypto.randomUUID();
    const newMsg: Message = { id: msgId, role: 'expert', content: text };
    setMessages(prev => [...prev, newMsg]);
    await supabase.from('messages').insert({
      id: msgId,
      request_id: requestId,
      sender_id: expertId,
      content: text,
      role: 'expert',
      is_image: false,
    });
  };

  const sendMessage = async (text: string) => {
    if (!activeRequest || !expertId) return;
    await sendExpertMessage(activeRequest.id, text);
  };

  const handleLeave = () => {
    setActiveRequest(null);
    setMessages([]);
  };

  // ── Render states ─────────────────────────────────────────────────────────
  if (loadingAuth) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-gray-500 font-medium">Vérification de l&apos;accès...</p>
        </div>
      </div>
    );
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="flex min-h-[calc(100vh-5rem)] bg-gray-50 items-center justify-center p-6">
        <div className="max-w-md text-center bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          <WifiOff className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Configuration Supabase requise</h1>
          <p className="text-gray-600 text-sm mb-4">
            Ajoutez <code className="bg-gray-100 px-1 rounded text-xs">NEXT_PUBLIC_SUPABASE_URL</code> et{' '}
            <code className="bg-gray-100 px-1 rounded text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> dans votre fichier <code className="bg-gray-100 px-1 rounded text-xs">.env</code>.
          </p>
          <Link href="/" className="text-primary font-semibold hover:underline text-sm">← Retour à l&apos;accueil</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-5rem)] bg-gray-50">
      <div className="flex flex-1 overflow-hidden max-w-7xl w-full mx-auto">

        {/* ── Sidebar ──────────────────────────────────────────────────────── */}
        <aside className="w-80 shrink-0 bg-white border-r border-gray-100 flex flex-col shadow-sm">
          {/* Sidebar Header */}
          <div className="px-5 py-5 border-b border-gray-100 bg-primary text-white">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-xs text-blue-200 font-medium">Espace Expert</p>
                <h2 className="font-bold text-sm leading-tight">{expertName}</h2>
              </div>
            </div>
            {expertDomains.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3">
                {expertDomains.map(d => (
                  <span key={d} className="bg-white/15 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">{d}</span>
                ))}
              </div>
            )}
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 divide-x divide-gray-100 border-b border-gray-100">
            <div className="px-4 py-3 flex flex-col items-center">
              <p className="text-2xl font-bold text-primary">{requests.length}</p>
              <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">En attente</p>
            </div>
            <div className="px-4 py-3 flex flex-col items-center">
              <p className="text-2xl font-bold text-green-500">{activeRequest ? 1 : 0}</p>
              <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Active</p>
            </div>
          </div>

          {/* Request list */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {requests.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-center px-4">
                <Clock className="w-8 h-8 text-gray-200 mb-3" />
                <p className="text-sm text-gray-400">Aucune demande compatible pour le moment.</p>
                <p className="text-xs text-gray-300 mt-1">Vous serez notifié automatiquement.</p>
              </div>
            ) : (
              requests.map(req => (
                <div key={req.id} className={`rounded-xl border p-4 transition-all hover:shadow-md ${
                  activeRequest?.id === req.id
                    ? 'border-primary/40 bg-primary/5 shadow-sm'
                    : 'border-gray-100 bg-white hover:border-gray-200'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="bg-primary/10 text-primary px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide">
                      {req.domain}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {new Date(req.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  {/* Show real client name */}
                  <p className="text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                    <User className="w-3 h-3 text-gray-400" />
                    {req.clientName || 'Client'}
                  </p>
                  <p className="text-xs text-gray-600 line-clamp-2 mb-3 leading-relaxed">{req.context}</p>
                  <button
                    onClick={() => handleAccept(req)}
                    disabled={joiningId === req.id || !!activeRequest}
                    className="w-full bg-primary text-white py-2 rounded-lg text-xs font-bold hover:bg-primaryLight transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {joiningId === req.id ? (
                      <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />Connexion...</>
                    ) : (
                      <><CheckCircle className="w-3.5 h-3.5" />Accepter la demande</>
                    )}
                  </button>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* ── Chat Panel ───────────────────────────────────────────────────── */}
        <main className="flex-1 flex flex-col">
          {activeRequest ? (
            <>
              {/* Chat Header — shows client name and domain */}
              <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">
                      {activeRequest.clientName || 'Client'} —{' '}
                      <span className="text-primary capitalize font-medium">{activeRequest.domain}</span>
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                      <Wifi className="w-3 h-3 text-green-500" />
                      Connecté en direct
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleLeave}
                  className="text-xs text-red-500 hover:bg-red-50 border border-red-100 px-3 py-1.5 rounded-lg font-semibold transition-colors"
                >
                  Quitter
                </button>
              </div>

              {/* Messages — full history restored on mount */}
              <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-2 bg-gray-50">
                {messages.map(msg => (
                  // viewerRole="expert" ensures labels and bubble colors are correct
                  <ChatBubble key={msg.id} message={msg} viewerRole="expert" />
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* MessageInput with hideDevis=true — removes "Générer un devis" for experts */}
              <MessageInput onSend={sendMessage} hideDevis={true} />
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-gray-50">
              <div className="w-20 h-20 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center mb-5">
                <MessageSquare className="w-9 h-9 text-primary/30" />
              </div>
              <h3 className="font-bold text-gray-700 text-lg mb-2">Aucune conversation active</h3>
              <p className="text-sm text-gray-400 max-w-sm">
                Sélectionnez une demande dans le panneau gauche pour démarrer une conversation avec un client.
              </p>
              {requests.length > 0 && (
                <div className="mt-6 flex items-center gap-2 bg-accent/10 border border-accent/20 px-4 py-2.5 rounded-xl">
                  <Bell className="w-4 h-4 text-accent" />
                  <span className="text-sm font-semibold text-primary">
                    {requests.length} demande{requests.length > 1 ? 's' : ''} en attente
                  </span>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
