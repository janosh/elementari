import { fetch_zipped, summary_bucket } from '$lib/api.js'
import type { MaterialSummary } from '$lib/material-summary.js'

export const prerender = false

export const load = async ({ params }) => {
  const url = `${summary_bucket}/mp-${params.slug}.json.gz`

  return fetch_zipped(url) as Promise<MaterialSummary>
}
