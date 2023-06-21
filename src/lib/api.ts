export const summary_bucket = `https://materialsproject-build.s3.amazonaws.com/collections/2022-10-28/summary`
export const task_bucket = `https://materialsproject-parsed.s3.amazonaws.com/tasks`

export async function decompress(blob: ReadableStream<Uint8Array> | null) {
  // @ts-expect-error - TS doesn't know about DecompressionStream yet!
  const unzip = new DecompressionStream(`gzip`)
  const stream = blob.pipeThrough(unzip)
  return await new Response(stream).text()
}

export async function fetch_zipped(url: string, { unzip = true } = {}) {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(
        `${response.status} ${response.statusText} for ${response.url}`
      )
    }
    if (!unzip) return await response.blob()
    return JSON.parse(await decompress(response.body))
  } catch (error) {
    console.error(error)
    alert(error.message)
  }
}

// Function to download data to a file
export function download(data: string | Blob, filename: string, type: string) {
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
