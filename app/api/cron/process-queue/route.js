import { supabaseAdmin as supabase } from '../../../lib/supabaseServer'

export async function GET(request) {
  // Accept both Bearer token and Vercel's CRON_SECRET header
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }


  try {
    let processed = 0

    // Process up to 10 jobs per invocation
    for (let i = 0; i < 10; i++) {
      // Poll next unprocessed job
      const { data: jobs, error: pollErr } = await supabase
        .rpc('poll_http_queue')
      if (pollErr) throw pollErr
      if (!jobs || jobs.length === 0) break

      const job = jobs[0]

      // Execute the HTTP request
      const fetchOpts = {
        method: job.method,
        headers: job.headers || {},
      }
      if (job.body && job.method !== 'GET') {
        fetchOpts.body = job.body
      }

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), job.timeout_ms || 5000)
      fetchOpts.signal = controller.signal

      try {
        await fetch(job.url, fetchOpts)
      } catch (fetchErr) {
        console.error(`Queue job ${job.job_id} fetch failed:`, fetchErr.message)
      } finally {
        clearTimeout(timeout)
      }

      // Mark done regardless (failed jobs don't re-queue by default)
      const { error: markErr } = await supabase
        .rpc('mark_http_job_done', { job_id: job.job_id })
      if (markErr) throw markErr

      processed++
    }

    return Response.json({ success: true, processed })
  } catch (error) {
    console.error('Process queue error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
