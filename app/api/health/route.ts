export const dynamic = 'force-dynamic';

export function GET() {
  return Response.json({
    status: 'ok',
    platform: 'one-companion-platform',
    version: '0.1.0',
  });
}
