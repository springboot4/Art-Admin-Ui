<template>
  <canvas ref="canvasRef" :width="width" :height="height" class="waveform-canvas"></canvas>
</template>

<script lang="ts" setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'

interface Props {
  width?: number
  height?: number
  color?: string
  backgroundColor?: string
}

const props = withDefaults(defineProps<Props>(), {
  width: 200,
  height: 60,
  color: '#1890ff',
  backgroundColor: 'transparent',
})

const canvasRef = ref<HTMLCanvasElement | null>(null)
let ctx: CanvasRenderingContext2D | null = null
let animationId: number | null = null
let isRunning = false

// 波形数据
let waveformData: Uint8Array | null = null

/**
 * 初始化 Canvas
 */
const initCanvas = () => {
  const canvas = canvasRef.value
  if (!canvas) return

  ctx = canvas.getContext('2d')
  if (!ctx) return

  // 设置背景
  ctx.fillStyle = props.backgroundColor
  ctx.fillRect(0, 0, props.width, props.height)
}

/**
 * 绘制波形
 */
const drawWaveform = () => {
  if (!ctx || !canvasRef.value) return

  const canvas = canvasRef.value
  const width = canvas.width
  const height = canvas.height

  // 清除画布
  ctx.fillStyle = props.backgroundColor
  ctx.fillRect(0, 0, width, height)

  if (!waveformData || waveformData.length === 0) {
    // 没有数据时绘制静态线条
    ctx.beginPath()
    ctx.strokeStyle = props.color
    ctx.lineWidth = 2
    ctx.moveTo(0, height / 2)
    ctx.lineTo(width, height / 2)
    ctx.stroke()
    return
  }

  // 绘制波形
  const sliceWidth = width / waveformData.length
  const centerY = height / 2

  ctx.beginPath()
  ctx.strokeStyle = props.color
  ctx.lineWidth = 2

  let x = 0
  for (let i = 0; i < waveformData.length; i++) {
    const v = waveformData[i] / 128.0
    const y = centerY + (v - 1) * (height / 2) * 0.8

    if (i === 0) {
      ctx.moveTo(x, y)
    } else {
      ctx.lineTo(x, y)
    }

    x += sliceWidth
  }

  ctx.stroke()
}

/**
 * 动画循环
 */
const animate = () => {
  if (!isRunning) return

  drawWaveform()
  animationId = requestAnimationFrame(animate)
}

/**
 * 开始动画
 */
const start = () => {
  if (isRunning) return
  isRunning = true
  animate()
}

/**
 * 停止动画
 */
const stop = () => {
  isRunning = false
  if (animationId) {
    cancelAnimationFrame(animationId)
    animationId = null
  }
}

/**
 * 更新波形数据
 */
const updateData = (data: Uint8Array) => {
  waveformData = data
}

/**
 * 清除波形
 */
const clear = () => {
  waveformData = null
  if (ctx) {
    ctx.fillStyle = props.backgroundColor
    ctx.fillRect(0, 0, props.width, props.height)
  }
}

// 暴露方法给父组件
defineExpose({
  start,
  stop,
  updateData,
  clear,
})

onMounted(() => {
  initCanvas()
})

onUnmounted(() => {
  stop()
})
</script>

<style scoped>
.waveform-canvas {
  display: block;
}
</style>
