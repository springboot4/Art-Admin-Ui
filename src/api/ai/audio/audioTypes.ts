/**
 * 音频相关类型定义
 */

/**
 * 声音信息
 */
export interface VoiceInfo {
  id: string
  name: string
  language: string
  gender?: string
  description?: string
  sampleUrl?: string
}

/**
 * 语音转文字响应
 */
export interface AudioToTextResponse {
  text: string
  language?: string
  duration?: number
}

/**
 * 文字转语音请求
 */
export interface TextToAudioRequest {
  text: string
  voice?: string
  language?: string
  speed?: number
}

/**
 * 语音功能配置
 */
export interface AudioFeatures {
  speechToText: {
    enabled: boolean
    provider?: string
    language?: string
  }
  textToSpeech: {
    enabled: boolean
    provider?: string
    voice?: string
    language?: string
    autoPlay?: boolean
  }
}
