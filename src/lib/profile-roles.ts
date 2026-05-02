/** Rôles persistés dans `profiles.role` (+ invités créés à la volée). */
export type ProfileRole = 'guest' | 'client' | 'expert' | 'admin';

export const PROFILE_ROLES: ProfileRole[] = ['guest', 'client', 'expert', 'admin'];

export function isProfileRole(v: string | null | undefined): v is ProfileRole {
  return v === 'guest' || v === 'client' || v === 'expert' || v === 'admin';
}
