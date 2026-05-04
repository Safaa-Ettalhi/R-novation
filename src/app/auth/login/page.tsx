'use client';

import { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    // Si une session existe déjà (ex: après confirmation email), on force le logout
    // pour éviter d'avoir le formulaire de login ET l'état connecté en même temps.
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        await supabase.auth.signOut();
        // Optionnel: rafraîchir pour nettoyer tout état global
        window.location.reload();
      }
    };
    checkSession();

    const q = new URLSearchParams(window.location.search);
    if (q.get('registered') === '1') {
      setInfo('Veuillez vérifier votre email pour confirmer votre compte.');
    }
  }, []);

  const handleResendConfirmation = async () => {
    setError('');
    setInfo('');
    if (!isSupabaseConfigured || !email.trim()) {
      setError('Indiquez votre adresse e-mail ci-dessus, puis renvoyez la confirmation.');
      return;
    }
    setResendLoading(true);
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim(),
        options: origin ? { emailRedirectTo: `${origin}/auth/login` } : undefined,
      });
      if (resendError) throw resendError;
      setInfo('E-mail de confirmation renvoyé. Vérifiez votre boîte de réception et vos courriers indésirables.');
      setNeedsEmailConfirmation(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Impossible de renvoyer l’e-mail.';
      setError(msg);
    } finally {
      setResendLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setNeedsEmailConfirmation(false);
    if (!isSupabaseConfigured) {
      setError('Supabase n’est pas configuré. Ajoutez NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY dans .env.');
      return;
    }
    setLoading(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        const code = (signInError as { code?: string }).code;
        const msg = (signInError.message || '').toLowerCase();
        if (code === 'email_not_confirmed' || msg.includes('email not confirmed')) {
          setNeedsEmailConfirmation(true);
          setError(
            'Votre compte n’est pas encore vérifié. Cliquez sur le lien envoyé dans votre e-mail pour activer votre compte.'
          );
          setLoading(false);
          return;
        }
        if (msg.includes('invalid login credentials')) {
          throw new Error('Identifiants incorrects.');
        }
        throw signInError;
      }
      if (!data.user) throw new Error('Erreur de connexion');

      // Récupération de l'ID invité et fusion des données si nécessaire
      const guestId = localStorage.getItem('les_artistes_guest_id');
      if (guestId && guestId !== data.user.id) {
        try {
          await supabase.from('support_requests').update({ user_id: data.user.id }).eq('user_id', guestId);
          await supabase.from('messages').update({ sender_id: data.user.id }).eq('sender_id', guestId);
          await supabase.from('profiles').delete().eq('id', guestId);
        } catch (e) {
          console.error("Erreur lors de la fusion du compte invité", e);
        }
        localStorage.removeItem('les_artistes_guest_id');
      }

      const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single();

      // Route based on role — 'guest', 'client', or undefined all go to chat
      if (profile?.role === 'expert') router.push('/expert/dashboard');
      else if (profile?.role === 'admin') router.push('/admin/dashboard');
      else router.push('/chat');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Identifiants incorrects.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 font-serif">Connexion</h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Ou{' '}
          <Link href="/auth/register" className="font-medium text-primary hover:text-primaryLight transition">
            créez votre compte gratuitement
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {!isSupabaseConfigured && (
            <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-md mb-6 text-sm">
              Variables Supabase manquantes. Créez un projet sur{' '}
              <a href="https://supabase.com/dashboard" className="underline font-medium" target="_blank" rel="noreferrer">
                supabase.com
              </a>
              , puis copiez l’URL et la clé « anon » dans <code className="bg-amber-100 px-1 rounded">.env</code> sous{' '}
              <code className="bg-amber-100 px-1 rounded">NEXT_PUBLIC_SUPABASE_URL</code> et{' '}
              <code className="bg-amber-100 px-1 rounded">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>.
            </div>
          )}

          {info && (
            <div className="bg-blue-50 border border-blue-200 text-blue-900 px-4 py-3 rounded-md mb-6 text-sm">{info}</div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md mb-6 text-sm whitespace-pre-wrap">
              {error}
            </div>
          )}

          {needsEmailConfirmation && (
            <div className="mb-6">
              <button
                type="button"
                onClick={handleResendConfirmation}
                disabled={resendLoading}
                className="w-full py-2.5 px-4 rounded-md border border-primary text-primary text-sm font-semibold hover:bg-primary/5 disabled:opacity-50 transition"
              >
                {resendLoading ? 'Envoi…' : 'Renvoyer l’e-mail de confirmation'}
              </button>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label className="block text-sm font-medium text-gray-700">Adresse e-mail</label>
              <div className="mt-1">
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">Mot de passe</label>
                <Link href="/auth/forgot-password" className="text-sm font-medium text-primary hover:text-primaryLight transition">
                  Mot de passe oublié ?
                </Link>
              </div>
              <div className="mt-1 relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primaryLight focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition disabled:opacity-50"
              >
                {loading ? 'Connexion…' : 'Se connecter'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
