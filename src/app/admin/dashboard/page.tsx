'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ pending: 0, active: 0, profiles: 0 });

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace('/auth/login');
        return;
      }
      supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()
        .then(({ data }) => {
          if (!data || data.role !== 'admin') {
            router.replace('/');
            return;
          }
          Promise.all([
            supabase.from('support_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
            supabase.from('support_requests').select('*', { count: 'exact', head: true }).eq('status', 'active'),
            supabase.from('profiles').select('*', { count: 'exact', head: true }),
          ]).then(([a, b, c]) => {
            setStats({
              pending: a.count ?? 0,
              active: b.count ?? 0,
              profiles: c.count ?? 0,
            });
            setLoading(false);
          });
        });
    });
  }, [router]);

  if (!isSupabaseConfigured) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center text-sm text-gray-600">
        Supabase requis pour l&apos;administration.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-gray-500 font-medium">
        Vérification des droits…
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-primary font-serif mb-2">Administration</h1>
      <p className="text-sm text-gray-600 mb-8">
        Vue synthétique des données. Les comptes admin sont attribués manuellement en base (
        <code className="bg-gray-100 px-1 rounded text-xs">profiles.role = &apos;admin&apos;</code>
        ).
      </p>

      <div className="grid sm:grid-cols-3 gap-4 mb-10">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-semibold uppercase text-gray-400">Demandes en attente</p>
          <p className="text-3xl font-bold text-primary mt-1">{stats.pending}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-semibold uppercase text-gray-400">Demandes actives</p>
          <p className="text-3xl font-bold text-primary mt-1">{stats.active}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-semibold uppercase text-gray-400">Profils</p>
          <p className="text-3xl font-bold text-primary mt-1">{stats.profiles}</p>
        </div>
      </div>

      <Link href="/chat" className="text-primary font-medium text-sm hover:underline">
        ← Chat IA
      </Link>
    </div>
  );
}
