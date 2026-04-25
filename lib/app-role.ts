export type AppRole = 'issuer' | 'verify';

export function getAppRole(): AppRole {
  return process.env.NEXT_PUBLIC_APP_ROLE === 'verify' ? 'verify' : 'issuer';
}
