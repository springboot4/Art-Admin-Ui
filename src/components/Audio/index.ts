/**
 * 音频组件统一导出
 */

// 语音输入组件
export { default as VoiceInputBtn } from './VoiceInput/VoiceInputBtn.vue'
export { default as WaveformCanvas } from './VoiceInput/WaveformCanvas.vue'
export { default as WaveformVisualizer } from './VoiceInput/WaveformVisualizer.vue'
export { useVoiceRecorder } from './VoiceInput/composables/useVoiceRecorder'

// 音频播放组件
export { default as AudioPlayBtn } from './AudioPlayer/AudioPlayBtn.vue'
export { AudioPlayer, AudioPlayerManager, audioPlayerManager } from './AudioPlayer/composables/AudioPlayerManager'

// 类型导出
export * from './types'
