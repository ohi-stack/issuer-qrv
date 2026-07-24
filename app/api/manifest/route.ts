export const dynamic = 'force-dynamic';

export function GET() {
  return Response.json({
    name: 'One Companion Platform',
    version: '0.1.0',
    portals: ['public', 'client', 'provider', 'employee', 'student', 'admin'],
    features: [
      'roles',
      'database_schema',
      'settings_pages',
      'forms_framework',
      'authentication',
      'responsive_ui',
    ],
    endpoints: ['/api/health', '/api/manifest', '/wp-json/one-companion/v1/health', '/wp-json/one-companion/v1/manifest'],
  });
}
