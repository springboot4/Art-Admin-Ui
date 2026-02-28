<template>
  <div class="waveform-visualizer">
    <canvas ref="canvasRef" class="waveform-canvas"></canvas>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, onUnmounted } from 'vue'

const canvasRef = ref<HTMLCanvasElement | null>(null)
let ctx: CanvasRenderingContext2D | null = null
let animationId: number | null = null
let isRunning = false

// 波形数据 - 使用环形缓冲区
const BUFFER_SIZE = 128
const barData: number[] = new Array(BUFFER_SIZE).fill(0)
let writeIndex = 0

// 配置
const config = {
  barWidth: 3,
  barGap: 2,
  barMinHeight: 2,
  barMaxHeight: 40,
  color: '#1890ff',
  colorGradient: ['#69b1ff', '#1890ff', '#0958d9'],
}

/**
 * 初始化 Canvas
 */
const initCanvas = () => {
  const canvas = canvasRef.value
  if (!canvas) return

  // 获取父容器尺寸
  const container = canvas.parentElement
  if (!container) return

  const dpr = window.devicePixelRatio || 1
  const rect = container.getBoundingClientRect()

  canvas.width = rect.width * dpr
  canvas.height = rect.height * dpr
  canvas.style.width = rect.width + 'px'
  canvas.style.height = rect.height + 'px'

  ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.scale(dpr, dpr)
  }
}

/**
 * 绘制波形
 */
const drawWaveform = () => {
  if (!ctx || !canvasRef.value) return

  const canvas = canvasRef.value
  const dpr = window.devicePixelRatio || 1
  const width = canvas.width / dpr
  const height = canvas.height / dpr

  // 清除画布
  ctx.clearRect(0, 0, width, height)

  // 计算柱子参数
  const totalBars = Math.floor(width / (config.barWidth + config.barGap))
  const centerY = height / 2

  // 创建渐变
  const gradient = ctx.createLinearGradient(0, centerY - config.barMaxHeight, 0, centerY + config.barMaxHeight)
  gradient.addColorStop(0, config.colorGradient[0])
  gradient.addColorStop(0.5, config.colorGradient[1])
  gradient.addColorStop(1, config.colorGradient[2])

  ctx.fillStyle = gradient

  // 绘制柱子
  for (let i = 0; i < totalBars; i++) {
    // 从环形缓冲区获取数据
    const dataIndex = (writeIndex - totalBars + i + BUFFER_SIZE) % BUFFER_SIZE
    const value = barData[dataIndex]

    // 计算柱子高度
    const barHeight = Math.max(config.barMinHeight, value * config.barMaxHeight)

    // 计算柱子位置
    const x = i * (config.barWidth + config.barGap)
    const y = centerY - barHeight / 2

    // 绘制圆角矩形 (兼容性处理)
    const radius = config.barWidth / 2
    ctx.beginPath()
    if (ctx.roundRect) {
      ctx.roundRect(x, y, config.barWidth, barHeight, radius)
    } else {
      // 降级为普通矩形
      ctx.rect(x, y, config.barWidth, barHeight)
    }
    ctx.fill()
  }
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
  initCanvas()
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
  if (!data || data.length === 0) return

  // 计算平均音量
  let sum = 0
  for (let i = 0; i < data.length; i++) {
    sum += Math.abs(data[i] - 128)
  }
  const average = sum / data.length

  // 归一化到 0-1
  const normalizedValue = Math.min(1, average / 64)

  // 写入环形缓冲区
  barData[writeIndex] = normalizedValue
  writeIndex = (writeIndex + 1) % BUFFER_SIZE
}

/**
 * 清除波形
 */
const clear = () => {
  // 重置缓冲区
  for (let i = 0; i < BUFFER_SIZE; i++) {
    barData[i] = 0
  }
  writeIndex = 0

  // 清除画布
  if (ctx && canvasRef.value) {
    const dpr = window.devicePixelRatio || 1
    const width = canvasRef.value.width / dpr
    const height = canvasRef.value.height / dpr
    ctx.clearRect(0, 0, width, height)
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
.waveform-visualizer {
  width: 100%;
  height: 60px;
  position: relative;
}

.waveform-canvas {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
