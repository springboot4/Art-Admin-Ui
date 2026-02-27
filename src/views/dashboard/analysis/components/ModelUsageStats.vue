<template>
  <Card title="模块使用统计" :loading="loading">
    <div ref="chartRef" class="h-64 w-full"></div>
  </Card>
</template>

<script lang="ts" setup>
  import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
  import { Card } from 'ant-design-vue'
  import * as echarts from 'echarts'

  interface ModuleStats {
    name: string
    count: number
    color: string
  }

  const props = defineProps({
    loading: {
      type: Boolean,
      default: false,
    },
    moduleData: {
      type: Array as () => ModuleStats[],
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

    const moduleData = Array.isArray(props.moduleData) ? props.moduleData : []
    const names = moduleData.map((item) => item.name)
    const counts = moduleData.map((item) => item.count)
    const colors = moduleData.map((item) => item.color)

    const option = {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow',
        },
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
        data: names,
        axisLabel: {
          interval: 0,
          rotate: 0,
        },
      },
      yAxis: {
        type: 'value',
      },
      series: [
        {
          name: '数量',
          type: 'bar',
          barWidth: '60%',
          data: counts.map((count, index) => ({
            value: count,
            itemStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: colors[index] || '#1890ff' },
                { offset: 1, color: `${colors[index] || '#1890ff'}99` },
              ]),
            },
          })),
        },
      ],
    }

    chartInstance.setOption(option)
  }

  const resizeChart = () => {
    chartInstance?.resize()
  }

  watch(
    () => props.moduleData,
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
