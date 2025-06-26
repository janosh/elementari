// TODO update to get MP details pages working again
export const mp_build_bucket =
  `https://materialsproject-build.s3.amazonaws.com/collections/2022-10-28`

export async function decompress(blob: ReadableStream<Uint8Array> | null) {
  const unzip = new DecompressionStream(`gzip`)
  const stream = blob?.pipeThrough(unzip)
  return await new Response(stream).text()
}

export async function fetch_zipped<T>(
  url: string,
  { unzip = true } = {},
): Promise<T | null> {
  const response = await fetch(url)
  if (!response.ok) {
    console.error(
      `${response.status} ${response.statusText} for ${response.url}`,
    )
    return null
  }
  if (!unzip) return (await response.blob()) as T
  return JSON.parse(await decompress(response.body))
}

// Original download implementation
function default_download(data: string | Blob, filename: string, type: string) {
  const file = new Blob([data], { type })
  const link = document.createElement(`a`)
  const url = URL.createObjectURL(file)
  link.style.display = `none`
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

// Function to download data to a file - checks for global override first
export function download(data: string | Blob, filename: string, type: string) {
  // Check if there's a global download override (used by VSCode extension)
  const global_download = (globalThis as Record<string, unknown>).download
  if (typeof global_download === `function` && global_download !== download) {
    return global_download(data, filename, type)
  }

  // Use default browser download
  return default_download(data, filename, type)
}
