<template>
  <Card title="API调用趋势" :loading="loading">
    <div class="h-64">
      <div class="text-center text-gray-500 mt-20">
        <Icon icon="ant-design:line-chart-outlined" :size="48" class="mb-4" />
        <div>API调用趋势图</div>
        <div class="text-sm mt-2">
          最近7天：{{ mockData.total.toLocaleString() }} 次调用
        </div>
        <div class="text-xs text-green-600 mt-1">
          相比上周增长 {{ mockData.growth }}%
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

  const mockData = {
    total: 145000,
    growth: 12.5,
    dailyData: [
      { date: '2024-10-01', calls: 18500 },
      { date: '2024-10-02', calls: 22000 },
      { date: '2024-10-03', calls: 19800 },
      { date: '2024-10-04', calls: 24500 },
      { date: '2024-10-05', calls: 21200 },
      { date: '2024-10-06', calls: 26000 },
      { date: '2024-10-07', calls: 23000 },
    ],
  }
</script>