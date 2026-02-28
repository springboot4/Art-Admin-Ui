/**
 * 语音录音 Hook
 *
 * 使用 js-audio-recorder 库实现浏览器录音功能
 */
import { ref, onUnmounted } from 'vue'

// 动态导入类型声明
declare const Recorder: any

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

export interface UseVoiceRecorderReturn {
  /** 是否正在录音 */
  isRecording: ReturnType<typeof ref<boolean>>
  /** 是否已暂停 */
  isPaused: ReturnType<typeof ref<boolean>>
  /** 录音时长 (秒) */
  duration: ReturnType<typeof ref<number>>
  /** 音频 Blob */
  audioBlob: ReturnType<typeof ref<Blob | null>>
  /** 开始录音 */
  startRecording: () => Promise<void>
  /** 停止录音 */
  stopRecording: () => Promise<Blob | null>
  /** 暂停录音 */
  pauseRecording: () => void
  /** 恢复录音 */
  resumeRecording: () => void
  /** 取消录音 */
  cancelRecording: () => void
  /** 获取波形数据 */
  getWaveformData: () => Uint8Array | null
  /** 获取录音器实例 */
  getRecorder: () => any
}

/**
 * 语音录音 Hook
 */
export function useVoiceRecorder(options: UseVoiceRecorderOptions = {}): UseVoiceRecorderReturn {
  const {
    sampleBits = 16,
    sampleRate = 16000,
    numChannels = 1,
    maxDuration = 600, // 默认最长 10 分钟
  } = options

  // 状态
  const isRecording = ref(false)
  const isPaused = ref(false)
  const duration = ref(0)
  const audioBlob = ref<Blob | null>(null)

  // 录音器实例
  let recorder: any = null
  let timer: number | null = null

  /**
   * 初始化录音器
   */
  const initRecorder = async () => {
    if (recorder) return recorder

    // 动态加载 js-audio-recorder
    const RecorderModule = await import('js-audio-recorder')
    const RecorderClass = RecorderModule.default || RecorderModule

    recorder = new RecorderClass({
      sampleBits,
      sampleRate,
      numChannels,
      compiling: false,
    })

    return recorder
  }

  /**
   * 开始录音
   */
  const startRecording = async () => {
    console.log('startRecording: begin')
    try {
      // 先检查浏览器是否支持录音
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('您的浏览器不支持录音功能，请使用 Chrome、Edge 或 Safari 浏览器')
      }
      console.log('startRecording: browser supported')

      // 请求麦克风权限
      try {
        console.log('startRecording: requesting microphone permission...')
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        console.log('startRecording: microphone permission granted')
        // 立即停止这个测试流，recorder 会创建自己的
        stream.getTracks().forEach(track => track.stop())
      } catch (permError: any) {
        console.error('startRecording: microphone permission error:', permError)
        if (permError.name === 'NotAllowedError' || permError.name === 'PermissionDeniedError') {
          throw new Error('请允许访问麦克风以使用语音输入功能')
        } else if (permError.name === 'NotFoundError') {
          throw new Error('未检测到麦克风设备，请连接麦克风后重试')
        }
        throw new Error('无法访问麦克风: ' + (permError.message || '未知错误'))
      }

      console.log('startRecording: initializing recorder...')
      const rec = await initRecorder()
      console.log('startRecording: recorder initialized, starting...')
      await rec.start()
      console.log('startRecording: recorder started')

      isRecording.value = true
      isPaused.value = false
      duration.value = 0
      audioBlob.value = null

      // 启动计时器
      timer = window.setInterval(() => {
        duration.value++

        // 达到最大时长自动停止
        if (duration.value >= maxDuration) {
          stopRecording()
        }
      }, 1000)

      console.log('startRecording: completed successfully')
    } catch (error: any) {
      console.error('startRecording: error:', error)
      throw error
    }
  }

  /**
   * 停止录音
   */
  const stopRecording = async (): Promise<Blob | null> => {
    if (!recorder || !isRecording.value) {
      return null
    }

    recorder.stop()
    isRecording.value = false
    isPaused.value = false

    // 清除计时器
    if (timer) {
      clearInterval(timer)
      timer = null
    }

    // 获取 WAV 格式音频
    const wavBlob = recorder.getWAVBlob()
    audioBlob.value = wavBlob

    return wavBlob
  }

  /**
   * 暂停录音
   */
  const pauseRecording = () => {
    if (recorder && isRecording.value && !isPaused.value) {
      recorder.pause()
      isPaused.value = true

      // 暂停计时器
      if (timer) {
        clearInterval(timer)
        timer = null
      }
    }
  }

  /**
   * 恢复录音
   */
  const resumeRecording = () => {
    if (recorder && isRecording.value && isPaused.value) {
      recorder.resume()
      isPaused.value = false

      // 恢复计时器
      timer = window.setInterval(() => {
        duration.value++

        if (duration.value >= maxDuration) {
          stopRecording()
        }
      }, 1000)
    }
  }

  /**
   * 取消录音
   */
  const cancelRecording = () => {
    if (recorder) {
      recorder.destroy()
      recorder = null
    }

    isRecording.value = false
    isPaused.value = false
    audioBlob.value = null
    duration.value = 0

    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }

  /**
   * 获取波形数据
   */
  const getWaveformData = (): Uint8Array | null => {
    if (recorder && isRecording.value) {
      return recorder.getRecordAnalyseData()
    }
    return null
  }

  /**
   * 获取录音器实例
   */
  const getRecorder = () => recorder

  // 组件卸载时清理
  onUnmounted(() => {
    cancelRecording()
  })

  return {
    isRecording,
    isPaused,
    duration,
    audioBlob,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    cancelRecording,
    getWaveformData,
    getRecorder,
  }
}
