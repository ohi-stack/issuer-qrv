export type AppRole = 'issuer' | 'verify';

export function getAppRole(): AppRole {
  const rawRole = process.env.NEXT_PUBLIC_APP_ROLE?.trim().toLowerCase();
  return rawRole === 'verify' ? 'verify' : 'issuer';
}
