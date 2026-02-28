/**
 * 音频 API 封装
 */
import { defHttp } from '/@/utils/http/axios'
import type { AudioToTextResponse, VoiceInfo, TextToAudioRequest } from './audioTypes'
import { getToken, getTenant } from '/@/utils/auth'
import { useGlobSetting } from '/@/hooks/setting'
import { useUserStoreWithOut } from '/@/store/modules/user'

const useUserStore = useUserStoreWithOut()

const BASE_URL = '/ai/v1/audio'

/**
 * 语音转文字
 *
 * @param file 音频文件 (Blob)
 * @param appId 应用 ID
 * @param language 语言代码
 * @param format 音频格式 (wav, mp3 等)
 */
export function audioToText(
  file: Blob,
  appId: number,
  language = 'auto',
  format = 'wav',
): Promise<AudioToTextResponse> {
  const globSetting = useGlobSetting()
  return defHttp.uploadFile<AudioToTextResponse>(
    {
      url: `${globSetting.apiUrl}${globSetting.urlPrefix}${BASE_URL}/to-text`,
      headers: {
        Authorization: 'Bearer ' + useUserStore.getToken,
        'TENANT-ID': getTenant(),
      },
    },
    {
      file,
      filename: `audio.${format}`,
      data: { appId, language },
    },
  )
}

/**
 * 文字转语音 (流式)
 *
 * @param appId 应用 ID
 * @param request TTS 请求参数
 * @returns 音频数据流
 */
export async function* textToAudioStream(
  appId: number,
  request: TextToAudioRequest,
): AsyncGenerator<Uint8Array> {
  const globSetting = useGlobSetting()
  const token = getToken()
  const tenant = getTenant()

  const response = await fetch(
    `${globSetting.apiUrl}${globSetting.urlPrefix}${BASE_URL}/to-audio?appId=${appId}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'tenant-id': tenant,
      },
      body: JSON.stringify(request),
    },
  )

  if (!response.ok) {
    throw new Error(`TTS 请求失败: ${response.status} ${response.statusText}`)
  }

  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error('无法读取响应流')
  }

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      yield value
    }
  } finally {
    reader.releaseLock()
  }
}

/**
 * 文字转语音 (同步，返回 Blob)
 *
 * @param appId 应用 ID
 * @param request TTS 请求参数
 * @returns 音频 Blob
 */
export async function textToAudio(appId: number, request: TextToAudioRequest): Promise<Blob> {
  const chunks: Uint8Array[] = []

  for await (const chunk of textToAudioStream(appId, request)) {
    chunks.push(chunk)
  }

  return new Blob(chunks, { type: 'audio/mpeg' })
}

/**
 * 获取可用声音列表
 *
 * @param appId 应用 ID
 * @param language 语言代码 (可选)
 */
export function getVoices(appId: number, language?: string): Promise<VoiceInfo[]> {
  return defHttp.get({
    url: `${BASE_URL}/voices`,
    params: { appId, language },
  })
}
