<template>
  <div class="voice-input-btn">
    <!-- 录音按钮 -->
    <a-tooltip :title="isRecording ? '点击完成录音' : '语音输入'">
      <span
        :class="['record-btn', { recording: isRecording, disabled: disabled || isConverting }]"
        @click="toggleRecording"
      >
        <LoadingOutlined v-if="isConverting" spin />
        <AudioOutlined v-else :class="{ 'recording-icon': isRecording }" />
      </span>
    </a-tooltip>

    <!-- 录音弹窗 -->
    <Teleport to="body">
      <transition name="modal">
        <div v-if="isRecording" class="recording-overlay" @click.self="cancelRecording">
          <div class="recording-card">
            <!-- 顶部状态指示 -->
            <div class="recording-status">
              <div class="status-dot"></div>
              <span class="status-text">正在录音</span>
              <span class="status-time">{{ formatTime(duration) }}</span>
            </div>

            <!-- 波形显示区域 -->
            <div class="waveform-container">
              <div class="waveform-bg">
                <WaveformVisualizer ref="waveformRef" />
              </div>
            </div>

            <!-- 提示文字 -->
            <div class="recording-hint">
              <span>点击下方按钮完成录音，或取消</span>
            </div>

            <!-- 操作按钮 -->
            <div class="recording-actions">
              <button class="action-btn cancel-btn" @click="cancelRecording">
                <CloseOutlined />
                <span>取消</span>
              </button>
              <button class="action-btn confirm-btn" @click="stopAndSubmit">
                <CheckOutlined />
                <span>完成</span>
              </button>
            </div>
          </div>
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<script lang="ts" setup>
import { ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { AudioOutlined, CheckOutlined, CloseOutlined, LoadingOutlined } from '@ant-design/icons-vue'
import { useVoiceRecorder } from './composables/useVoiceRecorder'
import { audioToText } from '/@/api/ai/audio/audioApi'
import WaveformVisualizer from './WaveformVisualizer.vue'

interface Props {
  appId: number
  disabled?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'textReceived', text: string): void
  (e: 'error', error: string): void
}>()

// 使用录音 Hook
const {
  isRecording,
  duration,
  startRecording,
  stopRecording,
  cancelRecording: cancel,
  getWaveformData,
} = useVoiceRecorder({ maxDuration: 600 })

const waveformRef = ref()
const isConverting = ref(false)

/**
 * 切换录音状态
 */
const toggleRecording = async () => {
  if (isRecording.value) {
    await stopAndSubmit()
  } else {
    try {
      await startRecording()
      waveformRef.value?.start()
      startWaveformUpdate()
    } catch (error: any) {
      console.error('Recording error:', error)
      const errorMsg = error?.message || '录音启动失败，请检查麦克风权限'
      message.error(errorMsg)
      emit('error', errorMsg)
    }
  }
}

/**
 * 开始波形更新
 */
let waveformTimer: number | null = null
const startWaveformUpdate = () => {
  waveformTimer = window.setInterval(() => {
    const data = getWaveformData()
    if (data) {
      waveformRef.value?.updateData(data)
    }
  }, 50)
}

/**
 * 停止波形更新
 */
const stopWaveformUpdate = () => {
  if (waveformTimer) {
    clearInterval(waveformTimer)
    waveformTimer = null
  }
  waveformRef.value?.stop()
}

/**
 * 停止录音并提交
 */
const stopAndSubmit = async () => {
  stopWaveformUpdate()
  const blob = await stopRecording()

  if (!blob) {
    message.warning('录音失败，请重试')
    return
  }

  isConverting.value = true
  try {
    const response = await audioToText(blob, props.appId)
    const text = (response as any)?.data?.data?.text

    if (text) {
      emit('textReceived', text)
      message.success('语音识别成功')
    } else {
      message.warning('未识别到语音内容')
    }
  } catch (error: any) {
    console.error('audioToText error:', error)
    emit('error', error.message || '语音识别失败')
    message.error('语音识别失败')
  } finally {
    isConverting.value = false
  }
}

/**
 * 取消录音
 */
const cancelRecording = () => {
  stopWaveformUpdate()
  waveformRef.value?.clear()
  cancel()
}

/**
 * 格式化时间
 */
const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

// 监听录音状态
watch(isRecording, (val) => {
  if (!val) {
    stopWaveformUpdate()
  }
})
</script>

<style scoped>
.voice-input-btn {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.record-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  font-size: 16px;
  color: rgba(0, 0, 0, 0.45);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.record-btn:hover:not(.disabled) {
  color: #1890ff;
  background: rgba(24, 144, 255, 0.08);
}

.record-btn.recording {
  color: #ff4d4f;
  background: rgba(255, 77, 79, 0.08);
}

.record-btn.recording:hover:not(.disabled) {
  color: #ff7875;
  background: rgba(255, 77, 79, 0.12);
}

.record-btn.disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.recording-icon {
  animation: pulse-animation 1.5s infinite;
}

@keyframes pulse-animation {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* 录音弹窗样式 */
.recording-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.recording-card {
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
  border-radius: 20px;
  padding: 28px 32px;
  width: 360px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

/* 录音状态 */
.recording-status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-bottom: 24px;
}

.status-dot {
  width: 10px;
  height: 10px;
  background: #ff4d4f;
  border-radius: 50%;
  animation: blink-animation 1s infinite;
}

@keyframes blink-animation {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.6;
    transform: scale(0.9);
  }
}

.status-text {
  font-size: 15px;
  color: #333;
  font-weight: 500;
}

.status-time {
  font-size: 15px;
  color: #1890ff;
  font-weight: 600;
  font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
  margin-left: 8px;
}

/* 波形容器 */
.waveform-container {
  margin-bottom: 20px;
}

.waveform-bg {
  background: linear-gradient(180deg, #f0f5ff 0%, #e6f4ff 100%);
  border-radius: 12px;
  padding: 16px;
  border: 1px solid rgba(24, 144, 255, 0.1);
}

/* 提示文字 */
.recording-hint {
  text-align: center;
  margin-bottom: 24px;
}

.recording-hint span {
  font-size: 13px;
  color: #999;
}

/* 操作按钮 */
.recording-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 24px;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.cancel-btn {
  background: #f5f5f5;
  color: #666;
}

.cancel-btn:hover {
  background: #e8e8e8;
  color: #333;
}

.confirm-btn {
  background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
  color: #fff;
  box-shadow: 0 4px 12px rgba(24, 144, 255, 0.4);
}

.confirm-btn:hover {
  background: linear-gradient(135deg, #40a9ff 0%, #1890ff 100%);
  box-shadow: 0 6px 16px rgba(24, 144, 255, 0.5);
  transform: translateY(-1px);
}

/* 动画 */
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-active .recording-card,
.modal-leave-active .recording-card {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .recording-card,
.modal-leave-to .recording-card {
  transform: scale(0.9) translateY(20px);
  opacity: 0;
}
</style>
