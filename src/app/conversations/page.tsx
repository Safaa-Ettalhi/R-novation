'use client';

import { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MessageSquare, Clock, CheckCircle, User, Briefcase, ArrowRight, WifiOff } from 'lucide-react';

interface Conversation {
  id: string;
  domain: string;
  context: string;
  status: 'pending' | 'active' | 'resolved';
  created_at: string;
  // Populated after fetch
  otherPartyName?: string;
  lastMessage?: string;
}

const STATUS_CONFIG = {
  pending:  { label: 'En attente',   cls: 'bg-amber-50 text-amber-700 border-amber-200',  dot: 'bg-amber-400' },
  active:   { label: 'En cours',     cls: 'bg-green-50 text-green-700 border-green-200',   dot: 'bg-green-400' },
  resolved: { label: 'Terminée',     cls: 'bg-gray-50 text-gray-500 border-gray-200',      dot: 'bg-gray-300' },
};

export default function ConversationsPage() {
  const router = useRouter();
  const [role, setRole] = useState<'client' | 'expert' | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Auth check ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isSupabaseConfigured) { setLoading(false); return; }
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/auth/login'); return; }
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();
      if (!profile || (profile.role !== 'client' && profile.role !== 'expert')) {
        router.push('/');
        return;
      }
      setUserId(session.user.id);
      setRole(profile.role as 'client' | 'expert');
      await fetchConversations(session.user.id, profile.role);
      setLoading(false);
    });
  }, []);

  // ── Fetch conversations ─────────────────────────────────────────────────────
  const fetchConversations = async (uid: string, userRole: string) => {
    let query = supabase
      .from('support_requests')
      .select('id, domain, context, status, created_at, user_id, expert_id')
      .order('created_at', { ascending: false });

    if (userRole === 'client') {
      query = query.eq('user_id', uid);
    } else {
      // Expert: show requests they accepted (active/resolved) + still pending in their domain
      query = query.or(`expert_id.eq.${uid},status.eq.pending`);
    }

    const { data: requests } = await query;
    if (!requests) return;

    // Collect all counterpart IDs to fetch their names in one shot
    const peerIds: string[] = [];
    requests.forEach((r: any) => {
      const peerId = userRole === 'client' ? r.expert_id : r.user_id;
      if (peerId) peerIds.push(peerId);
    });

    const profileMap: Record<string, string> = {};
    if (peerIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', [...new Set(peerIds)]);
      profiles?.forEach((p: any) => { if (p.full_name) profileMap[p.id] = p.full_name; });
    }

    // Fetch last message for each conversation
    const lastMsgMap: Record<string, string> = {};
    const reqIds = requests.map((r: any) => r.id);
    if (reqIds.length > 0) {
      for (const reqId of reqIds) {
        const { data: lastMsg } = await supabase
          .from('messages')
          .select('content, role, is_image')
          .eq('request_id', reqId)
          .not('role', 'eq', 'system')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (lastMsg) {
          lastMsgMap[reqId] = lastMsg.is_image ? '📷 Image' : (lastMsg.content?.slice(0, 80) ?? '');
        }
      }
    }

    setConversations(requests.map((r: any) => {
      const peerId = userRole === 'client' ? r.expert_id : r.user_id;
      return {
        id: r.id,
        domain: r.domain,
        context: r.context,
        status: r.status,
        created_at: r.created_at,
        otherPartyName: peerId ? profileMap[peerId] : undefined,
        lastMessage: lastMsgMap[r.id],
      };
    }));
  };

  // ── Handle click on a conversation ─────────────────────────────────────────
  const handleOpen = (conv: Conversation) => {
    if (role === 'expert') {
      router.push('/expert/dashboard');
    } else {
      router.push('/chat');
    }
  };

  // ── Loading state ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-[calc(100vh-5rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-gray-500 font-medium">Chargement des conversations...</p>
        </div>
      </div>
    );
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-5rem)] p-6">
        <div className="max-w-md text-center bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          <WifiOff className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Configuration requise</h1>
          <p className="text-gray-500 text-sm">Supabase n&apos;est pas configuré.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-primary font-serif mb-1">Mes conversations</h1>
          <p className="text-sm text-gray-500">
            {role === 'expert'
              ? 'Toutes vos interventions et demandes reçues.'
              : 'Historique de vos échanges avec nos artisans.'}
          </p>
        </div>
        <Link
          href={role === 'expert' ? '/expert/dashboard' : '/chat'}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primaryLight transition-colors shadow-sm"
        >
          {role === 'expert' ? <Briefcase className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
          {role === 'expert' ? 'Tableau de bord' : 'Nouvelle conversation'}
        </Link>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {(['pending', 'active', 'resolved'] as const).map(status => {
          const count = conversations.filter(c => c.status === status).length;
          const cfg = STATUS_CONFIG[status];
          return (
            <div key={status} className={`rounded-xl border p-4 text-center ${cfg.cls}`}>
              <p className="text-2xl font-bold">{count}</p>
              <p className="text-xs font-medium mt-0.5">{cfg.label}</p>
            </div>
          );
        })}
      </div>

      {/* Conversation list */}
      {conversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mb-5">
            <MessageSquare className="w-9 h-9 text-gray-200" />
          </div>
          <h3 className="font-bold text-gray-600 text-lg mb-2">Aucune conversation</h3>
          <p className="text-sm text-gray-400 max-w-sm mb-6">
            {role === 'expert'
              ? 'Vous n\'avez pas encore accepté de demandes.'
              : 'Démarrez une conversation avec notre assistant IA.'}
          </p>
          <Link href={role === 'expert' ? '/expert/dashboard' : '/chat'}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primaryLight transition-colors">
            {role === 'expert' ? 'Voir les demandes' : 'Commencer'}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {conversations.map(conv => {
            const cfg = STATUS_CONFIG[conv.status] ?? STATUS_CONFIG.pending;
            const date = new Date(conv.created_at);
            const dateStr = date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
            return (
              <button
                key={conv.id}
                onClick={() => handleOpen(conv)}
                className="w-full text-left bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-primary/20 transition-all p-5 group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 min-w-0">
                    {/* Domain icon */}
                    <div className="w-10 h-10 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      {role === 'expert'
                        ? <User className="w-5 h-5 text-primary/50" />
                        : <Briefcase className="w-5 h-5 text-primary/50" />}
                    </div>
                    <div className="min-w-0">
                      {/* Domain + status */}
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-bold text-sm text-gray-900 capitalize">{conv.domain}</span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wide ${cfg.cls}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                        </span>
                      </div>
                      {/* Other party */}
                      {conv.otherPartyName && (
                        <p className="text-xs text-gray-500 mb-1">
                          {role === 'expert' ? '👤 ' : '🔧 '}
                          {conv.otherPartyName}
                        </p>
                      )}
                      {/* Last message preview */}
                      {conv.lastMessage && (
                        <p className="text-sm text-gray-500 truncate">{conv.lastMessage}</p>
                      )}
                      {!conv.lastMessage && conv.context && (
                        <p className="text-sm text-gray-400 truncate italic">{conv.context.slice(0, 80)}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className="text-[11px] text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {dateStr}
                    </span>
                    <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-primary transition-colors" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
