const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

export const QRV_API_BASE_URL = trimTrailingSlash(process.env.NEXT_PUBLIC_QRV_API_BASE_URL ?? 'https://api.qrv.network');
export const QRV_VERIFY_BASE_URL = trimTrailingSlash(process.env.NEXT_PUBLIC_QRV_VERIFY_BASE_URL ?? 'https://verify.qrv.network');
export const QRV_REGISTRY_BASE_URL = trimTrailingSlash(process.env.NEXT_PUBLIC_QRV_REGISTRY_BASE_URL ?? 'https://registry.qrv.network');

export const toVerifyUrl = (qrvid: string) => `${QRV_VERIFY_BASE_URL}/${encodeURIComponent(qrvid)}`;
