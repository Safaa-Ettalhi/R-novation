'use client';

import { useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const [isExpert, setIsExpert] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [domains, setDomains] = useState<string[]>([]);
  const [customDomain, setCustomDomain] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const availableDomains = [
    { id: 'plomberie', label: 'Plomberie' },
    { id: 'electricite', label: 'Électricité' },
    { id: 'peinture', label: 'Peinture' },
    { id: 'revetements', label: 'Revêtements' },
    { id: 'general', label: 'Rénovation Générale' },
    { id: 'autre', label: 'Autre (préciser)' }
  ];

  const handleDomainChange = (domain: string) => {
    setDomains(prev => 
      prev.includes(domain) ? prev.filter(d => d !== domain) : [...prev, domain]
    );
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!isSupabaseConfigured) {
      setError('Supabase n’est pas configuré. Ajoutez NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY dans .env.');
      return;
    }
    setLoading(true);

    if (isExpert && domains.length === 0) {
      setError("Veuillez sélectionner au moins un domaine d'expertise.");
      setLoading(false);
      return;
    }

    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const finalDomains = isExpert ? domains.map(d => d === 'autre' && customDomain.trim() ? customDomain.trim() : d) : [];

      if (isExpert && finalDomains.length === 0) {
        setError("Veuillez sélectionner au moins un domaine d'expertise.");
        setLoading(false);
        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: origin ? { emailRedirectTo: `${origin}/auth/login` } : undefined,
      });

      if (signUpError) {
        if (signUpError.message.includes('User already registered')) {
          throw new Error('Cet email est déjà utilisé.');
        }
        throw signUpError;
      }
      if (!data.user) throw new Error("Erreur de création de compte");

      const role = isExpert ? 'expert' : 'client';
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: data.user.id,
        email,
        full_name: fullName,
        role,
        domains: finalDomains,
      });

      if (profileError) throw profileError;

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

      if (!data.session) {
        router.push('/auth/login?registered=1');
        return;
      }

      if (role === 'expert') router.push('/expert/dashboard');
      else router.push('/chat');
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue lors de l'inscription.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 font-serif">
          Créer un compte
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Ou{' '}
          <Link href="/auth/login" className="font-medium text-primary hover:text-primaryLight transition">
            connectez-vous à votre compte existant
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
              , puis copiez l’URL et la clé « anon » dans <code className="bg-amber-100 px-1 rounded">.env</code>.
            </div>
          )}

          {/* Choix du rôle */}
          <div className="flex bg-gray-100 p-1 rounded-lg mb-6">
            <button
              type="button"
              onClick={() => setIsExpert(false)}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition ${!isExpert ? 'bg-white shadow-sm text-primary' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Client
            </button>
            <button
              type="button"
              onClick={() => setIsExpert(true)}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition ${isExpert ? 'bg-white shadow-sm text-primary' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Artisan Expert
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md mb-6 text-sm">
              {error}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleRegister}>
            <div>
              <label className="block text-sm font-medium text-gray-700">Nom complet</label>
              <div className="mt-1">
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Adresse Email</label>
              <div className="mt-1">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Mot de passe</label>
              <div className="mt-1">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                />
              </div>
            </div>

            {isExpert && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Domaines d'expertise</label>
                <div className="space-y-2 bg-gray-50 p-3 rounded-md border border-gray-200">
                  {availableDomains.map((domain) => (
                    <div key={domain.id} className="flex flex-col">
                      <div className="flex items-center">
                        <input
                          id={`domain-${domain.id}`}
                          type="checkbox"
                          checked={domains.includes(domain.id)}
                          onChange={() => handleDomainChange(domain.id)}
                          className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                        />
                        <label htmlFor={`domain-${domain.id}`} className="ml-2 block text-sm text-gray-900">
                          {domain.label}
                        </label>
                      </div>
                      {domain.id === 'autre' && domains.includes('autre') && (
                        <div className="mt-2 ml-6">
                          <input
                            type="text"
                            value={customDomain}
                            onChange={(e) => setCustomDomain(e.target.value)}
                            placeholder="Saisissez votre domaine"
                            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                            required
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primaryLight focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition disabled:opacity-50"
              >
                {loading ? 'Création en cours...' : "S'inscrire"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
