export type AppRole = 'issuer' | 'verify';

const ROLE_MAP: Record<string, AppRole> = {
  issuer: 'issuer',
  verify: 'verify',
};

export function getAppRole(): AppRole {
  const role = process.env.NEXT_PUBLIC_APP_ROLE?.toLowerCase() || 'issuer';
  return ROLE_MAP[role] || 'issuer';
}
