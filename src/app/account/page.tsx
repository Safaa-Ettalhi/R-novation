'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { ProfileRole } from '@/lib/profile-roles';
import { Shield, User } from 'lucide-react';

const DOMAIN_OPTIONS = [
  { id: 'plomberie', label: 'Plomberie' },
  { id: 'electricite', label: 'Électricité' },
  { id: 'peinture', label: 'Peinture' },
  { id: 'revetements', label: 'Revêtements' },
  { id: 'general', label: 'Rénovation générale' },
  { id: 'autre', label: 'Autre (préciser)' }
];

export default function AccountPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  
  // Nouveaux champs
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('');
  const [birthDate, setBirthDate] = useState('');

  const [domains, setDomains] = useState<string[]>([]);
  const [customDomain, setCustomDomain] = useState('');
  
  const [role, setRole] = useState<ProfileRole | null>(null);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        router.replace('/auth/login');
        return;
      }
      setEmail(session.user.email ?? '');
      supabase
        .from('profiles')
        .select('full_name, domains, role, country, city, phone, gender, birth_date')
        .eq('id', session.user.id)
        .single()
        .then(({ data, error }) => {
          if (error || !data) {
            setLoading(false);
            return;
          }
          setFullName(data.full_name ?? '');
          setCountry(data.country ?? '');
          setCity(data.city ?? '');
          setPhone(data.phone ?? '');
          setGender(data.gender ?? '');
          setBirthDate(data.birth_date ?? '');
          
          let fetchedDomains = Array.isArray(data.domains) ? data.domains : [];
          // Extraction du domaine personnalisé
          const standardIds = DOMAIN_OPTIONS.map(d => d.id);
          const custom = fetchedDomains.find(d => !standardIds.includes(d) && d !== 'autre');
          if (custom) {
            setCustomDomain(custom);
            fetchedDomains = fetchedDomains.filter(d => d !== custom);
            if (!fetchedDomains.includes('autre')) fetchedDomains.push('autre');
          }

          setDomains(fetchedDomains);
          setRole((data.role as ProfileRole) ?? 'client');
          setLoading(false);
        });
    });
  }, [router]);

  const toggleDomain = (id: string) => {
    setDomains((prev) => (prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (!isSupabaseConfigured) return;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) {
      router.replace('/auth/login');
      return;
    }
    setSaving(true);
    if (!role) {
      setSaving(false);
      setMessage({ type: 'err', text: 'Profil incomplet. Rechargez la page.' });
      return;
    }

    const payload: Record<string, unknown> = {
      id: session.user.id,
      email: session.user.email ?? email,
      full_name: fullName,
      role,
      country,
      city,
      phone,
      gender: gender || null,
      birth_date: birthDate || null
    };

    if (role === 'expert') {
      const finalDomains = domains.map(d => d === 'autre' && customDomain.trim() ? customDomain.trim() : d).filter(d => d !== 'autre');
      if (finalDomains.length === 0) {
        setMessage({ type: 'err', text: 'Sélectionnez au moins un domaine.' });
        setSaving(false);
        return;
      }
      payload.domains = finalDomains;
    } else {
      payload.domains = [];
    }

    const { error } = await supabase.from('profiles').upsert(payload);
    setSaving(false);
    if (error) setMessage({ type: 'err', text: error.message });
    else setMessage({ type: 'ok', text: 'Profil enregistré avec succès.' });
  };

  if (!isSupabaseConfigured) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center text-sm text-gray-600">
        Configurez Supabase dans <code className="bg-gray-100 px-1 rounded">.env</code> pour gérer votre profil.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-gray-500 font-medium">
        Chargement du profil…
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-primary font-serif mb-2">Mon profil</h1>
          <p className="text-sm text-gray-600">
            Gérez vos informations personnelles et vos paramètres.{' '}
            <Link href="/chat" className="text-primary font-medium hover:underline">
              Retour au chat
            </Link>
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/account" className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium">
            <User className="w-4 h-4" />
            Profil
          </Link>
          <Link href="/account/password" className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-medium transition-colors">
            <Shield className="w-4 h-4" />
            Sécurité
          </Link>
        </div>
      </div>

      {message && (
        <div className={`mb-6 px-4 py-3 rounded-lg text-sm ${
          message.type === 'ok' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
          <h3 className="text-lg font-semibold text-gray-900">Informations générales</h3>
          <p className="text-sm text-gray-500">Ces informations seront utilisées pour votre compte.</p>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Nom complet</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-primary focus:border-primary text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Adresse e-mail</label>
              <input
                type="email"
                value={email}
                disabled
                className="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 text-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Téléphone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+33 6 12 34 56 78"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-primary focus:border-primary text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Date de naissance</label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-primary focus:border-primary text-sm text-gray-700"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Sexe</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-primary focus:border-primary text-sm bg-white"
              >
                <option value="">Sélectionnez...</option>
                <option value="homme">Homme</option>
                <option value="femme">Femme</option>
                <option value="autre">Autre</option>
                <option value="non_precise">Préfère ne pas préciser</option>
              </select>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Localisation</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Ville</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Paris, Lyon..."
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-primary focus:border-primary text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Pays</label>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="France"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-primary focus:border-primary text-sm"
                />
              </div>
            </div>
          </div>

          {role === 'expert' && (
            <div className="pt-6 border-t border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Expertise</h3>
              <p className="text-sm font-medium text-gray-700 mb-3">Domaines d&apos;intervention</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-bgLight p-4 rounded-xl border border-gray-200">
                {DOMAIN_OPTIONS.map((d) => (
                  <div key={d.id} className="flex flex-col">
                    <label className="flex items-center gap-2 text-sm text-gray-900 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={domains.includes(d.id)}
                        onChange={() => toggleDomain(d.id)}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      {d.label}
                    </label>
                    {d.id === 'autre' && domains.includes('autre') && (
                      <div className="mt-2 ml-6">
                        <input
                          type="text"
                          value={customDomain}
                          onChange={(e) => setCustomDomain(e.target.value)}
                          placeholder="Saisissez votre domaine"
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                          required
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500 bg-gray-200/50 px-3 py-1 rounded-full">
            Rôle : {role ?? '—'}
          </span>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex justify-center py-2.5 px-6 rounded-xl text-sm font-semibold text-white bg-primary hover:bg-primaryLight disabled:opacity-50 transition-colors shadow-sm"
          >
            {saving ? 'Enregistrement…' : 'Enregistrer les modifications'}
          </button>
        </div>
      </form>
    </div>
  );
}
