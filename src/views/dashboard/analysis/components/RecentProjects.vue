<template>
  <Card title="最近项目" :tab-list="tabList" :active-tab-key="activeKey" @tab-change="onTabChange">
    <div v-if="activeKey === 'projects'" class="space-y-3">
      <div
        v-for="project in recentProjects"
        :key="project.id"
        class="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl hover:from-blue-50 hover:to-blue-100 cursor-pointer transition-all duration-200 hover:shadow-md border border-gray-100 hover:border-blue-200"
      >
        <div class="flex items-center space-x-4">
          <div class="p-2 bg-white rounded-lg shadow-sm">
            <Icon :icon="project.icon" :size="24" :style="{ color: project.color }" />
          </div>
          <div>
            <div class="font-semibold text-gray-800">{{ project.name }}</div>
            <div class="text-sm text-gray-600">{{ project.type }} · {{ project.lastModified }}</div>
          </div>
        </div>
        <div class="flex items-center space-x-3">
          <Tag 
            :color="project.status === 'running' ? 'green' : 'gray'"
            class="rounded-full px-3"
          >
            {{ project.status === 'running' ? '运行中' : '已停止' }}
          </Tag>
          <Icon icon="ant-design:right-outlined" :size="16" class="text-gray-400" />
        </div>
      </div>
    </div>
    
    <div v-if="activeKey === 'system'" class="space-y-4">
      <div v-for="status in systemStatus" :key="status.name" class="flex items-center justify-between">
        <div class="flex items-center space-x-2">
          <Icon :icon="status.icon" :size="20" />
          <span>{{ status.name }}</span>
        </div>
        <div class="flex items-center space-x-2">
          <div class="w-32 bg-gray-200 rounded-full h-2">
            <div 
              class="h-2 rounded-full" 
              :class="status.usage > 80 ? 'bg-red-500' : status.usage > 60 ? 'bg-yellow-500' : 'bg-green-500'"
              :style="{ width: status.usage + '%' }"
            ></div>
          </div>
          <span class="text-sm text-gray-600">{{ status.usage }}%</span>
        </div>
      </div>
    </div>
  </Card>
</template>

<script lang="ts" setup>
  import { ref } from 'vue'
  import { Card, Tag } from 'ant-design-vue'
  import { Icon } from '../../../../components/Icon'

  const activeKey = ref('projects')

  const tabList = [
    { key: 'projects', tab: '最近项目' },
    { key: 'system', tab: '系统状态' },
  ]

  const recentProjects = [
    {
      id: '1',
      name: '智能客服助手',
      type: '聊天机器人',
      lastModified: '2小时前',
      status: 'running',
      icon: 'ant-design:robot-outlined',
      color: '#1890ff',
    },
    {
      id: '2',
      name: '文档问答系统',
      type: 'RAG应用',
      lastModified: '1天前',
      status: 'stopped',
      icon: 'ant-design:file-search-outlined',
      color: '#52c41a',
    },
    {
      id: '3',
      name: '数据分析工作流',
      type: '工作流',
      lastModified: '3天前',
      status: 'running',
      icon: 'ant-design:apartment-outlined',
      color: '#722ed1',
    },
  ]

  const systemStatus = [
    {
      name: 'GPU使用率',
      usage: 65,
      icon: 'ant-design:dashboard-outlined',
    },
    {
      name: '存储空间',
      usage: 42,
      icon: 'ant-design:hdd-outlined',
    },
    {
      name: '内存使用',
      usage: 78,
      icon: 'ant-design:loading-3-quarters-outlined',
    },
    {
      name: '网络带宽',
      usage: 34,
      icon: 'ant-design:wifi-outlined',
    },
  ]

  const onTabChange = (key: string) => {
    activeKey.value = key
  }
</script>