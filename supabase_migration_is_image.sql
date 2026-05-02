-- Migration : Ajout de la colonne is_image à la table messages
-- À exécuter dans le SQL Editor de Supabase

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS is_image BOOLEAN DEFAULT false;

-- Commentaire : cette colonne permet de distinguer les messages textuels
-- des messages contenant une image encodée en base64.
