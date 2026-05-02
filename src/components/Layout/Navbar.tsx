'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, ChevronDown, Home, LayoutDashboard, LogOut, Menu, User, X } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { ProfileRole } from '@/lib/profile-roles';
import { IconChatEstimator, IconLogoBuilding } from '@/components/Layout/NavIcons';

export default function Navbar() {
  const [session, setSession] = useState<{ user: { id: string; email?: string } } | null>(null);
  const [profile, setProfile] = useState<{
    role: ProfileRole;
    domains?: string[] | null;
    full_name?: string | null;
  } | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [expertPendingCount, setExpertPendingCount] = useState(0);
  const [navToast, setNavToast] = useState<string | null>(null);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase.from('profiles').select('role, domains, full_name').eq('id', userId).single();
    if (data?.role) {
      setProfile({
        role: data.role as ProfileRole,
        domains: data.domains,
        full_name: data.full_name,
      });
    } else setProfile(null);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s?.user) void fetchProfile(s.user.id);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s?.user) void fetchProfile(s.user.id);
      else setProfile(null);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const refreshExpertPending = useCallback(async () => {
    if (!session?.user || profile?.role !== 'expert') return;
    const domains = profile.domains?.filter(Boolean);
    let q = supabase.from('support_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending');
    if (domains && domains.length > 0) q = q.in('domain', domains);
    const { count } = await q;
    setExpertPendingCount(count ?? 0);
  }, [session?.user, profile?.role, profile?.domains]);

  useEffect(() => {
    if (!isSupabaseConfigured || !session?.user || profile?.role !== 'expert') {
      setExpertPendingCount(0);
      return;
    }
    void refreshExpertPending();
    const channel = supabase
      .channel('navbar_expert_requests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_requests' }, () => {
        void refreshExpertPending();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id, profile?.role, refreshExpertPending]);

  useEffect(() => {
    if (!isSupabaseConfigured || !session?.user || profile?.role !== 'client') return;
    const uid = session.user.id;
    const channel = supabase
      .channel(`navbar_client_${uid}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'support_requests',
          filter: `user_id=eq.${uid}`,
        },
        (payload) => {
          const next = payload.new as { status?: string };
          const prev = payload.old as { status?: string } | undefined;
          if (next.status === 'active' && (!prev?.status || prev.status !== 'active')) {
            setNavToast('Un expert a accepté votre demande — ouvrez le chat pour échanger.');
            if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
              new Notification('Les Artistes', { body: 'Un artisan a pris en charge votre demande.' });
            }
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id, profile?.role]);

  useEffect(() => {
    if (!navToast) return;
    const t = setTimeout(() => setNavToast(null), 8000);
    return () => clearTimeout(t);
  }, [navToast]);

  const handleLogout = async () => {
    setUserMenuOpen(false);
    setMobileOpen(false);
    await supabase.auth.signOut();
  };

  const loggedIn = Boolean(session?.user);
  const role = profile?.role;

  const navLinkClass =
    'group inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-primary transition-colors px-3 py-2 rounded-xl hover:bg-slate-50';

  const ctaPrimaryClass =
    'inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 sm:px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/20 ring-1 ring-white/10 transition-all hover:bg-primaryLight hover:shadow-xl hover:shadow-primary/25 hover:-translate-y-px active:translate-y-0';

  return (
    <>
      {navToast && (
        <div
          className="fixed top-[4.5rem] sm:top-24 left-1/2 z-[60] -translate-x-1/2 max-w-[min(92vw,28rem)] px-4 py-3 rounded-2xl bg-primary text-white text-sm shadow-2xl border border-white/10 flex items-start gap-3"
          role="status"
        >
          <Bell className="w-5 h-5 shrink-0 text-accent mt-0.5" aria-hidden />
          <span>{navToast}</span>
          <button
            type="button"
            className="ml-auto text-white/80 hover:text-white text-xs underline shrink-0"
            onClick={() => setNavToast(null)}
          >
            Fermer
          </button>
        </div>
      )}

      <header className="fixed inset-x-0 top-0 z-50">
        <div className="pointer-events-none absolute inset-x-0 top-full h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
        <nav
          className="border-b border-slate-200/70 bg-white/75 backdrop-blur-xl supports-[backdrop-filter]:bg-white/65 shadow-[0_8px_30px_rgb(9,44,86,0.06)]"
          aria-label="Navigation principale"
        >
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:h-[4.5rem] sm:gap-4 sm:px-6 lg:px-8">
            <Link
              href="/"
              className="group flex min-w-0 shrink-0 items-center gap-2.5 sm:gap-3"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/25 ring-1 ring-black/5 transition-transform duration-200 group-hover:scale-[1.02] group-hover:bg-primaryLight sm:h-11 sm:w-11">
                <IconLogoBuilding className="h-[22px] w-[22px] text-accent sm:h-6 sm:w-6" />
              </div>
              <div className="min-w-0 leading-tight">
                <p className="truncate text-base font-bold tracking-tight text-primary sm:text-lg">LES ARTISTES</p>
                <p className="-mt-0.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-accent sm:text-[10px]">
                  Rénovation
                </p>
              </div>
            </Link>

            {/* Desktop */}
            <div className="hidden items-center gap-1 lg:flex">
              {!loggedIn ? (
                <>
                  <div className="mr-1 flex items-center rounded-2xl bg-slate-50/90 p-1 ring-1 ring-slate-200/60 xl:mr-2">
                    <Link href="/" className={navLinkClass}>
                      <Home className="h-4 w-4 text-slate-400 group-hover:text-accent transition-colors" aria-hidden />
                      Accueil
                    </Link>
                    <Link href="/#expertise" className={navLinkClass}>
                      Services
                    </Link>
                    <Link href="/auth/login" className={navLinkClass}>
                      Connexion
                    </Link>
                    <Link href="/auth/register" className={navLinkClass}>
                      Inscription
                    </Link>
                  </div>
                  <Link href="/chat#assistant" className={`${ctaPrimaryClass} shrink-0`}>
                    <IconChatEstimator className="h-4 w-4 shrink-0 text-accent" />
                    Estimer avec l&apos;IA
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/chat#assistant" className={`${ctaPrimaryClass} shrink-0`}>
                    <IconChatEstimator className="h-4 w-4 shrink-0 text-accent" />
                    Estimer avec l&apos;IA
                  </Link>

                  {role === 'expert' && (
                    <Link
                      href="/expert/dashboard"
                      className="relative ml-2 inline-flex items-center gap-2 rounded-full border border-slate-200/90 bg-white px-4 py-2.5 text-sm font-semibold text-primary shadow-sm transition-colors hover:border-accent/35 hover:bg-bgLight"
                    >
                      <LayoutDashboard className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
                      Demandes
                      {expertPendingCount > 0 && (
                        <span className="absolute -right-1 -top-1 flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white shadow-sm">
                          {expertPendingCount > 9 ? '9+' : expertPendingCount}
                        </span>
                      )}
                    </Link>
                  )}

                  {role === 'admin' && (
                    <Link
                      href="/admin/dashboard"
                      className="ml-2 inline-flex items-center gap-2 rounded-full border border-slate-200/90 bg-white px-4 py-2.5 text-sm font-semibold text-primary shadow-sm transition-colors hover:bg-bgLight"
                    >
                      <LayoutDashboard className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
                      Admin
                    </Link>
                  )}

                  <div className="relative ml-3 border-l border-slate-200 pl-3">
                    <button
                      type="button"
                      onClick={() => setUserMenuOpen((v) => !v)}
                      className="flex items-center gap-2 rounded-full border border-transparent py-1.5 pl-1 pr-2 transition-colors hover:border-slate-200 hover:bg-slate-50"
                      aria-expanded={userMenuOpen}
                      aria-haspopup="menu"
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/10">
                        <User className="h-[18px] w-[18px]" aria-hidden />
                      </span>
                      <span className="hidden max-w-[10rem] truncate text-sm font-semibold text-slate-800 xl:inline">
                        {profile?.full_name || session?.user?.email?.split('@')[0] || 'Compte'}
                      </span>
                      <ChevronDown className={`h-4 w-4 text-slate-500 transition ${userMenuOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {userMenuOpen && (
                      <>
                        <button
                          type="button"
                          className="fixed inset-0 z-40 cursor-default bg-transparent"
                          aria-label="Fermer le menu"
                          onClick={() => setUserMenuOpen(false)}
                        />
                        <div
                          role="menu"
                          className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-slate-100 bg-white py-1 shadow-xl shadow-slate-900/10 ring-1 ring-slate-900/5"
                        >
                          <Link
                            href="/account"
                            role="menuitem"
                            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-bgLight"
                            onClick={() => setUserMenuOpen(false)}
                          >
                            <User className="h-4 w-4 text-primary" aria-hidden />
                            Mon profil
                          </Link>
                          <button
                            type="button"
                            role="menuitem"
                            className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                            onClick={handleLogout}
                          >
                            <LogOut className="h-4 w-4" aria-hidden />
                            Déconnexion
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Mobile */}
            <div className="flex shrink-0 items-center gap-2 lg:hidden">
              <Link
                href="/chat#assistant"
                aria-label="Estimer avec l’IA — ouvrir le simulateur"
                className={`${ctaPrimaryClass} max-w-[min(56vw,14rem)] pl-3 pr-3.5 py-2 text-xs sm:max-w-none sm:px-4 sm:py-2.5 sm:text-sm`}
                onClick={() => setMobileOpen(false)}
              >
                <IconChatEstimator className="h-4 w-4 shrink-0 text-accent" />
                <span className="truncate">Estimer avec l&apos;IA</span>
              </Link>
              {loggedIn && role === 'expert' && expertPendingCount > 0 && (
                <Link
                  href="/expert/dashboard"
                  className="relative rounded-xl p-2 text-primary hover:bg-slate-50"
                  aria-label={`${expertPendingCount} demandes en attente`}
                >
                  <Bell className="h-5 w-5" />
                  <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-accent ring-2 ring-white" />
                </Link>
              )}
              <button
                type="button"
                className="rounded-xl border border-slate-200 bg-white p-2 text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
                aria-expanded={mobileOpen}
                aria-label={mobileOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
                onClick={() => setMobileOpen((o) => !o)}
              >
                {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>

          {mobileOpen && (
            <div className="border-t border-slate-100 bg-white/95 px-4 py-4 shadow-inner lg:hidden">
              <div className="mx-auto flex max-w-7xl flex-col gap-0.5">
                {!loggedIn ? (
                  <>
                    <p className="px-3 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      Menu
                    </p>
                    <Link href="/" className={navLinkClass} onClick={() => setMobileOpen(false)}>
                      <Home className="h-4 w-4 text-slate-400" aria-hidden />
                      Accueil
                    </Link>
                    <Link href="/#expertise" className={navLinkClass} onClick={() => setMobileOpen(false)}>
                      Services
                    </Link>
                    <Link href="/auth/login" className={navLinkClass} onClick={() => setMobileOpen(false)}>
                      Connexion
                    </Link>
                    <Link href="/auth/register" className={navLinkClass} onClick={() => setMobileOpen(false)}>
                      Inscription
                    </Link>
                    <p className="px-3 pb-2 pt-4 text-center text-[11px] leading-snug text-slate-500">
                      Simulateur : bouton « Estimer avec l&apos;IA » en haut à droite.
                    </p>
                  </>
                ) : (
                  <>
                    {role === 'expert' && (
                      <Link href="/expert/dashboard" className={navLinkClass} onClick={() => setMobileOpen(false)}>
                        <LayoutDashboard className="h-4 w-4 text-slate-400" aria-hidden />
                        Demandes artisans {expertPendingCount > 0 ? `(${expertPendingCount})` : ''}
                      </Link>
                    )}
                    {role === 'admin' && (
                      <Link href="/admin/dashboard" className={navLinkClass} onClick={() => setMobileOpen(false)}>
                        <LayoutDashboard className="h-4 w-4 text-slate-400" aria-hidden />
                        Administration
                      </Link>
                    )}
                    <Link href="/account" className={navLinkClass} onClick={() => setMobileOpen(false)}>
                      <User className="h-4 w-4 text-slate-400" aria-hidden />
                      Mon profil
                    </Link>
                    <button
                      type="button"
                      className={`${navLinkClass} text-left text-red-600`}
                      onClick={handleLogout}
                    >
                      <LogOut className="h-4 w-4" aria-hidden />
                      Déconnexion
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </nav>
      </header>
    </>
  );
}
