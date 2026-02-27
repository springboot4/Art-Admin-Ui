<template>
  <Card title="会话趋势" :loading="loading">
    <div ref="chartRef" class="h-64 w-full"></div>
  </Card>
</template>

<script lang="ts" setup>
  import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
  import { Card } from 'ant-design-vue'
  import * as echarts from 'echarts'
  import type { DailyTrend } from '/@/api/dashboard'

  const props = defineProps({
    loading: {
      type: Boolean,
      default: false,
    },
    trendData: {
      type: Array as () => DailyTrend[],
      default: () => [],
    },
  })

  const chartRef = ref<HTMLElement>()
  let chartInstance: echarts.ECharts | null = null

  const initChart = () => {
    if (!chartRef.value) return

    if (chartInstance) {
      chartInstance.dispose()
    }
    chartInstance = echarts.init(chartRef.value)
    updateChart()
  }

  const updateChart = () => {
    if (!chartInstance) return

    const trendData = Array.isArray(props.trendData) ? props.trendData : []
    const dates = trendData.map((item) => {
      const date = new Date(item.date)
      return `${date.getMonth() + 1}/${date.getDate()}`
    })
    const counts = trendData.map((item) => item.count)

    const option = {
      tooltip: {
        trigger: 'axis',
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '10%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: dates,
      },
      yAxis: {
        type: 'value',
      },
      series: [
        {
          name: '会话数',
          type: 'line',
          smooth: true,
          data: counts,
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(24, 144, 255, 0.3)' },
              { offset: 1, color: 'rgba(24, 144, 255, 0.05)' },
            ]),
          },
          lineStyle: {
            color: '#1890ff',
            width: 2,
          },
          itemStyle: {
            color: '#1890ff',
          },
        },
      ],
    }

    chartInstance.setOption(option)
  }

  const resizeChart = () => {
    chartInstance?.resize()
  }

  watch(
    () => props.trendData,
    async () => {
      await nextTick()
      if (chartInstance) {
        updateChart()
        resizeChart()
      } else {
        initChart()
      }
    },
    { deep: true, immediate: true }
  )

  onMounted(() => {
    initChart()
    window.addEventListener('resize', resizeChart)
  })

  onUnmounted(() => {
    chartInstance?.dispose()
    chartInstance = null
    window.removeEventListener('resize', resizeChart)
  })
</script>
