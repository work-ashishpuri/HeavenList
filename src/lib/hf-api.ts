export const PIPELINE_TASKS = [
  'text-generation',
  'text-classification',
  'image-classification',
  'summarization',
  'text-to-image',
] as const

export type PipelineTask = (typeof PIPELINE_TASKS)[number]

export interface HFModelSibling {
  rfilename: string
  size?: number
}

export interface HFModel {
  id: string
  pipeline_tag: string
  downloads: number
  downloadsAllTime?: number
  likes: number
  lastModified: string
  tags?: string[]
  inferenceProviderMapping?: Array<{ provider: string; providerId: string; status: string; task: string; isModelAuthor: boolean }>
  siblings?: HFModelSibling[]
  safetensors?: {
    parameters?: Record<string, number>
    total?: number
  }
  cardData?: {
    language?: string[]
    datasets?: string[]
    metrics?: Array<{ name?: string; value?: number | string }>
  }
}

export function getLicense(tags?: string[]): string {
  return tags?.find((t) => t.startsWith('license:'))?.slice(8) ?? '—'
}

const DTYPE_BYTES: Record<string, number> = {
  F64: 8, F32: 4, F16: 2, BF16: 2,
  I64: 8, I32: 4, I16: 2, I8: 1, U8: 1, BOOL: 1,
}

/** Returns total weight size in GB, or null if undeterminable. */
export function getModelSize(
  safetensors?: HFModel['safetensors'],
  siblings?: HFModelSibling[],
): number | null {
  // Prefer structured safetensors metadata from expand=safetensors
  if (safetensors?.parameters && Object.keys(safetensors.parameters).length > 0) {
    const bytes = Object.entries(safetensors.parameters).reduce(
      (sum, [dtype, count]) => sum + count * (DTYPE_BYTES[dtype] ?? 2),
      0,
    )
    return bytes > 0 ? bytes / 1024 ** 3 : null
  }
  if (safetensors?.total) {
    // total param count without dtype breakdown — assume BF16 (2 bytes)
    return (safetensors.total * 2) / 1024 ** 3
  }
  // Fall back to summing sibling file sizes
  if (!siblings?.length) return null
  const stFiles = siblings.filter(
    (s) => s.rfilename.endsWith('.safetensors') && (s.size ?? 0) > 0,
  )
  const binFiles = siblings.filter(
    (s) =>
      (s.rfilename.endsWith('.bin') || s.rfilename.endsWith('.pt')) &&
      (s.size ?? 0) > 0,
  )
  const files = stFiles.length > 0 ? stFiles : binFiles
  if (!files.length) return null
  const bytes = files.reduce((sum, s) => sum + (s.size ?? 0), 0)
  return bytes > 0 ? bytes / 1024 ** 3 : null
}

export async function fetchModelCard(modelId: string): Promise<string> {
  const res = await fetch(`https://huggingface.co/${modelId}/raw/main/README.md`)
  if (!res.ok) throw new Error(`Model card fetch failed: ${res.status}`)
  return res.text()
}

export async function fetchSpacesCount(modelId: string): Promise<number> {
  const res = await fetch(`https://huggingface.co/api/models/${modelId}?expand=spaces`)
  if (!res.ok) throw new Error(`HuggingFace API error: ${res.status}`)
  const data = (await res.json()) as { spaces?: unknown[] }
  return data.spaces?.length ?? 0
}

export async function fetchModels(task: PipelineTask): Promise<HFModel[]> {
  const url = `https://huggingface.co/api/models?pipeline_tag=${task}&sort=downloads&direction=-1&limit=50&expand=pipeline_tag&expand=likes&expand=lastModified&expand=tags&expand=downloads&expand=downloadsAllTime&expand=inferenceProviderMapping&expand=safetensors&expand=siblings`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HuggingFace API error: ${res.status}`)
  return res.json() as Promise<HFModel[]>
}
