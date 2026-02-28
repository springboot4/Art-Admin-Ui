/**
 * 音频播放器管理器 (单例)
 *
 * 管理全局音频播放器实例，确保同一时间只有一个播放器在播放
 */
import { textToAudioStream } from '/@/api/ai/audio/audioApi'

export interface AudioPlayerOptions {
  appId: number
  voice: string
  messageId: string
  onStateChange?: (isPlaying: boolean) => void
  onError?: (error: Error) => void
}

export class AudioPlayer {
  private mediaSource: MediaSource | null = null
  private audio: HTMLAudioElement | null = null
  private sourceBuffer: SourceBuffer | null = null
  private queue: Uint8Array[] = []
  private isUpdating = false
  private isPlaying = false
  private isStopped = false

  constructor(
    private options: AudioPlayerOptions
  ) {}

  /**
   * 播放文本
   */
  async playText(text: string): Promise<void> {
    if (this.isPlaying) {
      this.stop()
    }

    this.isStopped = false
    this.isPlaying = true
    this.options.onStateChange?.(true)

    try {
      // 初始化 MediaSource
      this.mediaSource = new MediaSource()
      this.audio = new Audio()
      this.audio.src = URL.createObjectURL(this.mediaSource)

      // 监听播放结束事件
      this.audio.addEventListener('ended', () => {
        this.isPlaying = false
        this.options.onStateChange?.(false)
      })

      this.mediaSource.addEventListener('sourceopen', async () => {
        try {
          // 创建 SourceBuffer (MP3 格式)
          this.sourceBuffer = this.mediaSource!.addSourceBuffer('audio/mpeg')

          this.sourceBuffer.addEventListener('updateend', () => {
            this.isUpdating = false
            this.processQueue()
          })

          // 开始流式加载
          await this.loadAudioStream(text)
        } catch (error) {
          this.handleError(error as Error)
        }
      })

      await this.audio.play()
    } catch (error) {
      this.handleError(error as Error)
    }
  }

  /**
   * 流式加载音频
   */
  private async loadAudioStream(text: string): Promise<void> {
    try {
      for await (const chunk of textToAudioStream(this.options.appId, {
        text,
        voice: this.options.voice,
      })) {
        if (this.isStopped) break
        this.appendBuffer(chunk)
      }

      // 流结束
      if (!this.isStopped && this.mediaSource && this.mediaSource.readyState === 'open') {
        // 等待队列处理完成
        await this.waitForQueueEmpty()
        this.mediaSource.endOfStream()
      }
    } catch (error) {
      this.handleError(error as Error)
    }
  }

  /**
   * 等待队列处理完成
   */
  private waitForQueueEmpty(): Promise<void> {
    return new Promise((resolve) => {
      const check = () => {
        if (this.queue.length === 0 && !this.isUpdating) {
          resolve()
        } else {
          setTimeout(check, 50)
        }
      }
      check()
    })
  }

  /**
   * 追加音频数据到队列
   */
  private appendBuffer(data: Uint8Array): void {
    this.queue.push(data)
    this.processQueue()
  }

  /**
   * 处理队列
   */
  private processQueue(): void {
    if (this.isUpdating || this.queue.length === 0 || !this.sourceBuffer) {
      return
    }

    this.isUpdating = true
    const data = this.queue.shift()!

    try {
      this.sourceBuffer.appendBuffer(data)
    } catch (error) {
      this.isUpdating = false
      this.handleError(error as Error)
    }
  }

  /**
   * 暂停播放
   */
  pause(): void {
    if (this.audio) {
      this.audio.pause()
      this.isPlaying = false
      this.options.onStateChange?.(false)
    }
  }

  /**
   * 恢复播放
   */
  resume(): void {
    if (this.audio) {
      this.audio.play()
      this.isPlaying = true
      this.options.onStateChange?.(true)
    }
  }

  /**
   * 停止播放
   */
  stop(): void {
    this.isStopped = true
    this.isPlaying = false
    this.queue = []

    if (this.audio) {
      this.audio.pause()
      this.audio.src = ''
      this.audio = null
    }

    if (this.mediaSource) {
      try {
        if (this.mediaSource.readyState === 'open') {
          this.mediaSource.endOfStream()
        }
      } catch (e) {
        // 忽略错误
      }
      this.mediaSource = null
    }

    this.sourceBuffer = null
    this.options.onStateChange?.(false)
  }

  /**
   * 获取播放状态
   */
  getIsPlaying(): boolean {
    return this.isPlaying
  }

  /**
   * 处理错误
   */
  private handleError(error: Error): void {
    this.isPlaying = false
    this.options.onStateChange?.(false)
    this.options.onError?.(error)
  }
}

/**
 * 音频播放器管理器 (单例)
 */
export class AudioPlayerManager {
  private static instance: AudioPlayerManager
  private currentPlayer: AudioPlayer | null = null
  private currentMessageId: string | null = null

  private constructor() {}

  static getInstance(): AudioPlayerManager {
    if (!AudioPlayerManager.instance) {
      AudioPlayerManager.instance = new AudioPlayerManager()
    }
    return AudioPlayerManager.instance
  }

  /**
   * 播放文本
   */
  async play(options: AudioPlayerOptions, text: string): Promise<void> {
    // 如果正在播放其他消息，先停止
    if (this.currentMessageId && this.currentMessageId !== options.messageId) {
      this.stop()
    }

    // 如果是同一消息，切换播放/暂停
    if (this.currentMessageId === options.messageId && this.currentPlayer) {
      if (this.currentPlayer.getIsPlaying()) {
        this.currentPlayer.pause()
      } else {
        this.currentPlayer.resume()
      }
      return
    }

    // 创建新播放器
    this.currentPlayer = new AudioPlayer({
      ...options,
      onStateChange: (isPlaying) => {
        options.onStateChange?.(isPlaying)
        if (!isPlaying) {
          this.currentMessageId = null
        }
      },
      onError: options.onError,
    })
    this.currentMessageId = options.messageId

    await this.currentPlayer.playText(text)
  }

  /**
   * 停止播放
   */
  stop(): void {
    if (this.currentPlayer) {
      this.currentPlayer.stop()
      this.currentPlayer = null
    }
    this.currentMessageId = null
  }

  /**
   * 获取当前播放的消息 ID
   */
  getCurrentMessageId(): string | null {
    return this.currentMessageId
  }

  /**
   * 检查是否正在播放指定消息
   */
  isPlaying(messageId: string): boolean {
    return this.currentMessageId === messageId && this.currentPlayer?.getIsPlaying() === true
  }
}

// 导出单例实例
export const audioPlayerManager = AudioPlayerManager.getInstance()
