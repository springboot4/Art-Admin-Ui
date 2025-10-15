<template>
  <Card title="应用类型分布" :loading="loading">
    <div class="h-64">
      <div class="text-center text-gray-500 mt-12">
        <Icon icon="ant-design:pie-chart-outlined" :size="48" class="mb-4" />
        <div class="text-sm">应用类型分布图</div>
        <div class="space-y-3 mt-6 text-left max-w-xs mx-auto">
          <div
            v-for="item in appTypeData"
            :key="item.type"
            class="flex items-center justify-between"
          >
            <div class="flex items-center space-x-2">
              <div class="w-3 h-3 rounded-full" :style="{ backgroundColor: item.color }"></div>
              <span class="text-sm">{{ item.type }}</span>
            </div>
            <span class="text-sm font-medium">{{ item.count }}个</span>
          </div>
        </div>
      </div>
    </div>
  </Card>
</template>

<script lang="ts" setup>
  import { Card } from 'ant-design-vue'
  import { Icon } from '../../../../components/Icon'

  defineProps({
    loading: {
      type: Boolean,
      default: false,
    },
  })

  const appTypeData = [
    {
      type: '聊天机器人',
      count: 45,
      color: '#1890ff',
    },
    {
      type: 'RAG应用',
      count: 32,
      color: '#52c41a',
    },
    {
      type: '工作流',
      count: 28,
      color: '#722ed1',
    },
    {
      type: '代理应用',
      count: 18,
      color: '#fa8c16',
    },
    {
      type: '其他',
      count: 5,
      color: '#8c8c8c',
    },
  ]
</script>
