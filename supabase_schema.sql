-- Active: PostgreSQL
-- Schéma Supabase pour l'application Les Artistes Rénov
-- Ce fichier contient les tables nécessaires pour le matchmaking temps réel

-- 1. Table des Utilisateurs et Experts
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY, -- Référence à auth.users.id
    email TEXT NOT NULL,
    full_name TEXT,
    role TEXT CHECK (role IN ('guest', 'client', 'expert', 'admin')) DEFAULT 'client',
    domains TEXT[] DEFAULT '{}', -- ex: ['plomberie', 'electricite']
    country TEXT,
    city TEXT,
    phone TEXT,
    gender TEXT CHECK (gender IN ('homme', 'femme', 'autre', 'non_precise')),
    birth_date DATE,
    is_online BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Table des demandes d'assistance (Requests)
CREATE TABLE IF NOT EXISTS public.support_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id),
    expert_id UUID REFERENCES public.profiles(id) DEFAULT NULL,
    domain TEXT NOT NULL, -- ex: 'plomberie'
    context TEXT NOT NULL, -- Résumé de la demande
    status TEXT CHECK (status IN ('pending', 'active', 'resolved', 'cancelled')) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Table des messages
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID REFERENCES public.support_requests(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.profiles(id),
    content TEXT NOT NULL,
    role TEXT CHECK (role IN ('user', 'expert', 'system', 'ia')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activer le Realtime pour ces tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;

-- RLS (Row Level Security) - Optionnel mais recommandé pour la prod
-- On le laisse permissif pour le développement
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for authenticated users on profiles" ON public.profiles FOR ALL USING (true);
CREATE POLICY "Allow all operations for authenticated users on support_requests" ON public.support_requests FOR ALL USING (true);
CREATE POLICY "Allow all operations for authenticated users on messages" ON public.messages FOR ALL USING (true);
