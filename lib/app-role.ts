export type AppRole = 'issuer' | 'verify';

export function getAppRole(): AppRole {
  const role = process.env.NEXT_PUBLIC_APP_ROLE;
  return role === 'verify' ? 'verify' : 'issuer';
}
