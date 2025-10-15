import { page as fetchModelPage } from '/@/api/ai/model/AiModelIndex'
import { page as fetchPlatformPage } from '/@/api/ai/model/AiModelPlatformIndex'
import type { AiModelDTO } from '/@/api/ai/model/AiModelTypes'
import type { AiModelPlatformDTO } from '/@/api/ai/model/AiModelPlatformTypes'

type PlatformMap = Record<string, AiModelPlatformDTO>

let cachedModels: AiModelDTO[] | null = null
let cachedPlatforms: PlatformMap | null = null
let loadingPromise: Promise<void> | null = null

const normalizeId = (value: unknown): string => {
  if (value === undefined || value === null) return ''
  return String(value)
}

const normalizeModels = (records: AiModelDTO[] | undefined | null): AiModelDTO[] => {
  if (!Array.isArray(records)) {
    return []
  }
  return records.map((item) => ({
    ...item,
    id: normalizeId(item.id),
    platform: normalizeId(item.platform),
    enable: item.enable !== undefined && item.enable !== null ? String(item.enable) : item.enable,
    type: item.type ?? '',
  }))
}

const normalizePlatforms = (records: AiModelPlatformDTO[] | undefined | null): PlatformMap => {
  const map: PlatformMap = {}
  if (!Array.isArray(records)) {
    return map
  }
  records.forEach((item) => {
    if (item && item.id !== undefined && item.id !== null) {
      const key = normalizeId(item.id)
      map[key] = {
        ...item,
        id: key,
      }
    }
  })
  return map
}

const loadModelAndPlatformData = async () => {
  const [modelRes, platformRes] = await Promise.all([
    fetchModelPage({ current: 1, size: 1000 }),
    fetchPlatformPage({ current: 1, size: 1000 }),
  ])

  cachedModels = normalizeModels(modelRes?.records)
  cachedPlatforms = normalizePlatforms(platformRes?.records)
}

export const ensureAiModelData = async () => {
  if (cachedModels && cachedPlatforms) {
    return {
      models: cachedModels,
      platformMap: cachedPlatforms,
    }
  }

  if (!loadingPromise) {
    loadingPromise = loadModelAndPlatformData().finally(() => {
      loadingPromise = null
    })
  }

  await loadingPromise

  return {
    models: cachedModels || [],
    platformMap: cachedPlatforms || {},
  }
}

export const formatModelLabel = (model: AiModelDTO, platformMap: PlatformMap, fallback = '') => {
  if (!model) {
    return fallback
  }
  const modelName = model.name || model.id || fallback
  const provider = platformMap[normalizeId(model.platform)]
  const providerName = provider?.name

  return providerName ? `${providerName}/${modelName}` : modelName
}

export const getModelLabelById = async (modelId: unknown) => {
  const normalizedId = normalizeId(modelId)
  if (!normalizedId) {
    return ''
  }

  const { models, platformMap } = await ensureAiModelData()
  const model = models.find((item) => normalizeId(item.id) === normalizedId)

  if (!model) {
    return normalizedId
  }

  return formatModelLabel(model, platformMap, normalizedId)
}

export const findModelByIdOrName = (models: AiModelDTO[], value: unknown) => {
  const normalizedValue = normalizeId(value)
  if (!normalizedValue) {
    return undefined
  }

  let match = models.find((item) => normalizeId(item.id) === normalizedValue)
  if (match) {
    return match
  }

  match = models.find((item) => (item.name || '').toString() === normalizedValue)
  return match
}
