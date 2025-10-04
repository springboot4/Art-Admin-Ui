<template>
  <Card title="模型使用统计" :loading="loading">
    <div class="h-64">
      <div class="text-center text-gray-500 mt-8">
        <Icon icon="ant-design:bar-chart-outlined" :size="48" class="mb-4" />
        <div class="text-sm">模型使用频率对比</div>
        <div class="space-y-3 mt-6 text-left max-w-xs mx-auto">
          <div v-for="model in modelUsageData" :key="model.name" class="space-y-1">
            <div class="flex items-center justify-between">
              <span class="text-sm">{{ model.name }}</span>
              <span class="text-sm font-medium">{{ model.usage }}次</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2">
              <div 
                class="h-2 rounded-full" 
                :style="{ backgroundColor: model.color, width: (model.usage / maxUsage * 100) + '%' }"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Card>
</template>

<script lang="ts" setup>
  import { computed } from 'vue'
  import { Card } from 'ant-design-vue'
  import { Icon } from '../../../../components/Icon'

  defineProps({
    loading: {
      type: Boolean,
      default: false,
    },
  })

  const modelUsageData = [
    {
      name: 'GPT-4',
      usage: 12500,
      color: '#1890ff',
    },
    {
      name: 'Claude-3',
      usage: 8900,
      color: '#52c41a',
    },
    {
      name: 'Gemini Pro',
      usage: 6200,
      color: '#722ed1',
    },
    {
      name: 'GPT-3.5',
      usage: 4800,
      color: '#fa8c16',
    },
    {
      name: '文心一言',
      usage: 3100,
      color: '#13c2c2',
    },
  ]

  const maxUsage = computed(() => Math.max(...modelUsageData.map(item => item.usage)))
</script>