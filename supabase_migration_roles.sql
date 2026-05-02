-- À exécuter une fois sur un projet Supabase existant (anciennes données avec role 'user')
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('guest', 'client', 'expert', 'admin'));

UPDATE public.profiles SET role = 'client' WHERE role = 'user';
