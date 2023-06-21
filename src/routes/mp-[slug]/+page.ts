import { fetch_zipped, summary_bucket } from '$lib/api.js'
import type { MaterialSummary } from '$lib/material-summary.js'

export const prerender = false

export const load = async ({ params }) => {
  // const url = `https://materialsproject-parsed.s3.amazonaws.com/tasks/${material_id}.json.gz`
  const url = `${summary_bucket}/mp-${params.slug}.json.gz`

  return fetch_zipped(url) as Promise<MaterialSummary>
}
