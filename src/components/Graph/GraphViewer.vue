<template>
  <div ref="chartRef" :style="{ height, width, minHeight: '400px' }"></div>
</template>
<script lang="ts" setup>
  import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
  import * as echarts from 'echarts'
  import { useAppStore } from '/@/store/modules/app'

  const props = defineProps({
    width: {
      type: String,
      default: '100%',
    },
    height: {
      type: String,
      default: '100%',
    },
    graphData: {
      type: Object,
      default: () => ({ node: [], edge: [] }),
    },
  })

  const chartRef = ref<HTMLDivElement | null>(null)
  const appStore = useAppStore()
  let chartInstance: echarts.ECharts | null = null

  const transformData = (data) => {
    if (!data || !data.node || !data.edge) {
      return { nodes: [], links: [] }
    }
    const nodes = data.node.map((n) => ({
      id: n.id,
      name: n.name,
      value: n.description,
      symbolSize: 50,
      label: {
        show: true,
        formatter: '{b}',
      },
    }))

    const links = data.edge.map((e) => ({
      source: e.startId,
      target: e.endId,
      value: e.description,
      lineStyle: {
        width: 2,
      },
    }))

    return { nodes, links }
  }

  const initChart = () => {
    if (chartRef.value) {
      // 确保DOM元素有明确的尺寸
      const rect = chartRef.value.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) {
        // 如果DOM尺寸为0，延迟初始化
        setTimeout(() => {
          initChart()
        }, 100)
        return
      }

      if (chartInstance) {
        chartInstance.dispose()
      }
      chartInstance = echarts.init(chartRef.value, appStore.getDarkMode)
      
      // 添加窗口尺寸变化监听
      const resizeObserver = new ResizeObserver(() => {
        if (chartInstance) {
          chartInstance.resize()
        }
      })
      resizeObserver.observe(chartRef.value)
      
      // 监听窗口尺寸变化
      window.addEventListener('resize', () => {
        if (chartInstance) {
          setTimeout(() => {
            chartInstance.resize()
          }, 100)
        }
      })
      
      renderChart()
    }
  }

  const renderChart = () => {
    if (!chartInstance) return
    const { nodes, links } = transformData(props.graphData)

    const option = {
      tooltip: {
        formatter: (params) => {
          if (params.dataType === 'node') {
            return `<b>${params.name}</b><br />${params.value}`
          }
          if (params.dataType === 'edge') {
            return `<b>${params.data.sourceName || ''} -> ${
              params.data.targetName || ''
            }</b><br />${params.value}`
          }
          return ''
        },
      },
      series: [
        {
          type: 'graph',
          layout: 'force',
          roam: true,
          draggable: true,
          data: nodes,
          links: links,
          force: {
            repulsion: 200,
            edgeLength: 150,
          },
          emphasis: {
            focus: 'adjacency',
            lineStyle: {
              width: 10,
            },
          },
        },
      ],
    }
    chartInstance.setOption(option)
  }

  watch(
    () => props.graphData,
    () => {
      nextTick(() => {
        // 确保DOM完全渲染后再初始化
        setTimeout(() => {
          initChart()
        }, 50)
      })
    },
    { deep: true },
  )

  onMounted(() => {
    if (props.graphData && props.graphData.node && props.graphData.node.length > 0) {
      nextTick(() => {
        // 确保DOM完全渲染后再初始化
        setTimeout(() => {
          initChart()
        }, 50)
      })
    }
  })

  onUnmounted(() => {
    if (chartInstance) {
      chartInstance.dispose()
      chartInstance = null
    }
  })
</script>
