import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

/** False si les variables publiques Supabase ne sont pas définies (évite un crash au chargement). */
export const isSupabaseConfigured = Boolean(url && key);

/** Client factice pour le dev sans .env : pas de crash à l’import ; les appels réels échoueront tant que l’URL/clé ne sont pas les vôtres. */
const FALLBACK_URL = 'http://127.0.0.1:54321';
const FALLBACK_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

export const supabase = createClient(url || FALLBACK_URL, key || FALLBACK_KEY);
