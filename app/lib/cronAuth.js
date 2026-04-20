/**
 * Bearer-token middleware for all /api/cron/* routes.
 * Usage: const err = requireCronAuth(request); if (err) return err;
 */
export function requireCronAuth(request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }
  return null
}
