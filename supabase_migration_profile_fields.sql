-- Migration: Ajouter les nouveaux champs de profil
-- À exécuter dans l'éditeur SQL de Supabase

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('homme', 'femme', 'autre', 'non_precise')),
ADD COLUMN IF NOT EXISTS birth_date DATE;
