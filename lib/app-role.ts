export type AppRole = 'issuer' | 'verify';

export function getAppRole(): AppRole {
  const rawRole = process.env.NEXT_PUBLIC_APP_ROLE?.trim().toLowerCase();
  return rawRole === 'verify' ? 'verify' : 'issuer';
function normalizeRole(rawRole: string | undefined): AppRole {
  const normalized = rawRole?.trim().toLowerCase();
  return normalized === 'verify' ? 'verify' : 'issuer';
}

export function getAppRole(): AppRole {
  return normalizeRole(process.env.NEXT_PUBLIC_APP_ROLE);
}

export function isVerifyRole(): boolean {
  return getAppRole() === 'verify';
}

export function isIssuerRole(): boolean {
  return getAppRole() === 'issuer';
}
