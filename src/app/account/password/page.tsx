'use client';

import { useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Lock, ShieldCheck, Eye, EyeOff } from 'lucide-react';

export default function AccountPasswordPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showOldPassword, setShowOldPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);
        if (!isSupabaseConfigured) return;

        if (newPassword !== confirmPassword) {
            setMessage({ type: 'err', text: 'Les nouveaux mots de passe ne correspondent pas.' });
            return;
        }
        if (newPassword.length < 6) {
            setMessage({ type: 'err', text: 'Le mot de passe doit faire au moins 6 caractères.' });
            return;
        }

        setLoading(true);

        // 1. Vérifier l'ancien mot de passe (via re-connexion)
        const { data: sessionData } = await supabase.auth.getSession();
        const email = sessionData?.session?.user?.email;

        if (!email) {
            setMessage({ type: 'err', text: 'Utilisateur non identifié.' });
            setLoading(false);
            return;
        }

        const { error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password: oldPassword,
        });

        if (signInError) {
            setMessage({ type: 'err', text: 'L\'ancien mot de passe est incorrect.' });
            setLoading(false);
            return;
        }

        // 2. Mettre à jour le mot de passe
        const { error: updateError } = await supabase.auth.updateUser({
            password: newPassword,
        });

        if (updateError) {
            setMessage({ type: 'err', text: updateError.message });
        } else {
            setMessage({ type: 'ok', text: 'Votre mot de passe a été modifié avec succès.' });
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
        }

        setLoading(false);
    };

    return (
        <div className="max-w-xl mx-auto px-4 py-10">
            <div className="flex items-center gap-4 mb-6">
                <Link href="/account" className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors text-gray-500">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-primary font-serif">Sécurité</h1>
                    <p className="text-sm text-gray-600">Modifier votre mot de passe</p>
                </div>
            </div>

            {message && (
                <div className={`mb-6 px-4 py-3 rounded-xl flex gap-3 text-sm border ${message.type === 'ok' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-700'
                    }`}>
                    <div className="mt-0.5">
                        {message.type === 'ok' ? <ShieldCheck className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                    </div>
                    <div>{message.text}</div>
                </div>
            )}

            <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ancien mot de passe</label>
                    <div className="relative">
                        <input
                            type={showOldPassword ? 'text' : 'password'}
                            required
                            value={oldPassword}
                            onChange={(e) => setOldPassword(e.target.value)}
                            className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-xl shadow-sm focus:ring-primary focus:border-primary text-sm transition-colors"
                            placeholder="••••••••"
                        />
                        <button
                            type="button"
                            onClick={() => setShowOldPassword(!showOldPassword)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition"
                        >
                            {showOldPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                    </div>
                </div>

                <div className="h-px bg-gray-100" />

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nouveau mot de passe</label>
                    <div className="relative">
                        <input
                            type={showNewPassword ? 'text' : 'password'}
                            required
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-xl shadow-sm focus:ring-primary focus:border-primary text-sm transition-colors"
                            placeholder="Au moins 6 caractères"
                        />
                        <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition"
                        >
                            {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirmer le nouveau mot de passe</label>
                    <div className="relative">
                        <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-xl shadow-sm focus:ring-primary focus:border-primary text-sm transition-colors"
                            placeholder="••••••••"
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition"
                        >
                            {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                    </div>
                </div>

                <div className="pt-2">
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full inline-flex justify-center py-3 px-6 rounded-xl text-sm font-semibold text-white bg-primary hover:bg-primaryLight disabled:opacity-50 transition-colors shadow-sm"
                    >
                        {loading ? 'Modification en cours...' : 'Mettre à jour le mot de passe'}
                    </button>
                </div>
            </form>
        </div>
    );
}
