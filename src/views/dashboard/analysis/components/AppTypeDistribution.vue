<template>
  <Card title="应用类型分布" :loading="loading">
    <div ref="chartRef" class="h-64 w-full"></div>
  </Card>
</template>

<script lang="ts" setup>
  import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
  import { Card } from 'ant-design-vue'
  import * as echarts from 'echarts'
  import type { AppTypeStats } from '/@/api/dashboard'

  const props = defineProps({
    loading: {
      type: Boolean,
      default: false,
    },
    appTypeData: {
      type: Array as () => AppTypeStats[],
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

    const appTypeData = Array.isArray(props.appTypeData) ? props.appTypeData : []
    const data = appTypeData.map((item) => ({
      value: item.count,
      name: item.type,
      itemStyle: {
        color: item.color,
      },
    }))

    const option = {
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c} ({d}%)',
      },
      legend: {
        orient: 'vertical',
        right: '5%',
        top: 'center',
      },
      series: [
        {
          name: '应用类型',
          type: 'pie',
          radius: ['40%', '70%'],
          center: ['40%', '50%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 10,
            borderColor: '#fff',
            borderWidth: 2,
          },
          label: {
            show: false,
            position: 'center',
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 16,
              fontWeight: 'bold',
            },
          },
          labelLine: {
            show: false,
          },
          data:
            data.length > 0
              ? data
              : [{ value: 1, name: '暂无数据', itemStyle: { color: '#ccc' } }],
        },
      ],
    }

    chartInstance.setOption(option)
  }

  const resizeChart = () => {
    chartInstance?.resize()
  }

  watch(
    () => props.appTypeData,
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
