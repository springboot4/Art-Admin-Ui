/**
 * 音频组件类型定义
 */

// 语音录音类型
export interface UseVoiceRecorderOptions {
  /** 采样位数 */
  sampleBits?: number
  /** 采样率 */
  sampleRate?: number
  /** 声道数 */
  numChannels?: number
  /** 最长录音时间 (秒) */
  maxDuration?: number
}

// 音频播放器类型
export interface AudioPlayerOptions {
  /** 应用 ID */
  appId: number
  /** 声音 ID */
  voice: string
  /** 消息 ID */
  messageId: string
  /** 播放状态变化回调 */
  onStateChange?: (isPlaying: boolean) => void
  /** 错误回调 */
  onError?: (error: Error) => void
}

// 声音信息
export interface VoiceInfo {
  /** 声音 ID */
  id: string
  /** 声音名称 */
  name: string
  /** 语言 */
  language: string
  /** 性别 */
  gender: string
  /** 描述 */
  description: string
}
