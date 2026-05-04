'use client';

import { useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import Link from 'next/link';
import {
  ArrowLeft, Lock, ShieldCheck, Eye, EyeOff, AlertCircle, CheckCircle2, Shield, User
} from 'lucide-react';

/** Password strength: 0–4 */
function getStrength(password: string): number {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score;
}

const STRENGTH_LABELS = ['', 'Faible', 'Moyen', 'Fort', 'Très fort'];
const STRENGTH_COLORS = ['', 'bg-red-400', 'bg-orange-400', 'bg-blue-500', 'bg-green-500'];

export default function AccountPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const strength = getStrength(newPassword);
  const passwordsMatch = newPassword && confirmPassword && newPassword === confirmPassword;
  const passwordsMismatch = newPassword && confirmPassword && newPassword !== confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (!isSupabaseConfigured) return;

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'err', text: 'Les mots de passe ne correspondent pas.' });
      return;
    }
    if (newPassword.length < 6) {
      setMessage({ type: 'err', text: 'Le mot de passe doit faire au moins 6 caractères.' });
      return;
    }

    setLoading(true);

    // Verify old password via re-sign-in
    const { data: sessionData } = await supabase.auth.getSession();
    const email = sessionData?.session?.user?.email;
    if (!email) {
      setMessage({ type: 'err', text: 'Utilisateur non identifié. Reconnectez-vous.' });
      setLoading(false);
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: oldPassword });
    if (signInError) {
      setMessage({ type: 'err', text: 'Mot de passe actuel incorrect.' });
      setLoading(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });

    if (updateError) {
      setMessage({ type: 'err', text: updateError.message });
    } else {
      setMessage({ type: 'ok', text: 'Votre mot de passe a été modifié avec succès !' });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-primary font-serif mb-2">Sécurité</h1>
          <p className="text-sm text-gray-600">
            Gérez la sécurité de votre compte.{' '}
            <Link href="/chat" className="text-primary font-medium hover:underline">
              Retour au chat
            </Link>
          </p>
        </div>
        {/* Tab nav consistent with /account */}
        <div className="flex gap-2">
          <Link href="/account" className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-medium transition-colors">
            <User className="w-4 h-4" />
            Profil
          </Link>
          <Link href="/account/password" className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium">
            <Shield className="w-4 h-4" />
            Sécurité
          </Link>
        </div>
      </div>

      {/* Feedback Banner */}
      {message && (
        <div className={`mb-6 px-5 py-4 rounded-xl flex items-start gap-3 text-sm border transition-all ${
          message.type === 'ok'
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {message.type === 'ok'
            ? <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0 text-green-500" />
            : <AlertCircle className="w-5 h-5 mt-0.5 shrink-0 text-red-500" />}
          <p className="font-medium">{message.text}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main form card */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gray-50/50">
              <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Lock className="w-4 h-4 text-primary" />
                Changer le mot de passe
              </h3>
              <p className="text-xs text-gray-500 mt-1">Votre ancien mot de passe sera requis pour confirmer.</p>
            </div>

            <div className="p-6 space-y-5">
              {/* Old password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Mot de passe actuel
                </label>
                <div className="relative">
                  <input
                    type={showOld ? 'text' : 'password'}
                    required
                    value={oldPassword}
                    onChange={e => setOldPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-colors"
                  />
                  <button type="button" onClick={() => setShowOld(!showOld)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-primary transition-colors">
                    {showOld ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="h-px bg-gray-100" />

              {/* New password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Nouveau mot de passe
                </label>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Minimum 6 caractères"
                    className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-colors"
                  />
                  <button type="button" onClick={() => setShowNew(!showNew)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-primary transition-colors">
                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {/* Strength meter */}
                {newPassword && (
                  <div className="mt-2">
                    <div className="flex gap-1 mb-1">
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${
                          i <= strength ? STRENGTH_COLORS[strength] : 'bg-gray-200'
                        }`} />
                      ))}
                    </div>
                    <p className={`text-xs font-medium ${strength >= 3 ? 'text-green-600' : strength >= 2 ? 'text-blue-600' : 'text-orange-500'}`}>
                      {STRENGTH_LABELS[strength]}
                    </p>
                  </div>
                )}
              </div>

              {/* Confirm password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Confirmer le nouveau mot de passe
                </label>
                <div className={`relative rounded-xl border transition-colors ${
                  passwordsMismatch ? 'border-red-300 bg-red-50/30' :
                  passwordsMatch ? 'border-green-300 bg-green-50/30' :
                  'border-gray-300'
                }`}>
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 pr-10 rounded-xl text-sm outline-none bg-transparent"
                  />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-primary transition-colors">
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {passwordsMismatch && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Les mots de passe ne correspondent pas.
                  </p>
                )}
                {passwordsMatch && (
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Les mots de passe correspondent.
                  </p>
                )}
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
              <button
                type="submit"
                disabled={loading || Boolean(passwordsMismatch)}
                className="w-full sm:w-auto inline-flex justify-center items-center gap-2 py-2.5 px-8 rounded-xl text-sm font-semibold text-white bg-primary hover:bg-primaryLight disabled:opacity-50 transition-colors shadow-sm"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Modification...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    Mettre à jour le mot de passe
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Side info card */}
        <div className="flex flex-col gap-4">
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-5 h-5 text-primary" />
              <h4 className="text-sm font-bold text-primary">Conseils de sécurité</h4>
            </div>
            <ul className="space-y-2 text-xs text-blue-800">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0 text-blue-500" />
                Utilisez au moins 8 caractères
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0 text-blue-500" />
                Mélangez lettres, chiffres et symboles
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0 text-blue-500" />
                Évitez les mots du dictionnaire
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0 text-blue-500" />
                N'utilisez pas le même mot de passe ailleurs
              </li>
            </ul>
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              <h4 className="text-sm font-bold text-amber-700">Mot de passe oublié ?</h4>
            </div>
            <p className="text-xs text-amber-700 mb-3">
              Si vous ne vous souvenez plus de votre mot de passe actuel, déconnectez-vous et utilisez la réinitialisation.
            </p>
            <Link href="/auth/forgot-password" className="text-xs font-semibold text-amber-700 underline hover:text-amber-900">
              Réinitialiser le mot de passe →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
