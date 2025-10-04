<template>
  <Card title="快速操作">
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div
        v-for="action in quickActions"
        :key="action.title"
        class="flex flex-col items-center p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl cursor-pointer hover:from-blue-50 hover:to-blue-100 hover:shadow-md transform hover:scale-105 transition-all duration-200"
        @click="handleActionClick(action.key)"
      >
        <div class="p-3 bg-white rounded-full shadow-sm mb-3">
          <Icon :icon="action.icon" :size="28" class="text-blue-500" />
        </div>
        <span class="text-sm font-semibold text-gray-800 mb-1">{{ action.title }}</span>
        <span class="text-xs text-gray-600 text-center leading-relaxed">{{ action.description }}</span>
      </div>
    </div>
  </Card>
</template>

<script lang="ts" setup>
  import { Card } from 'ant-design-vue'
  import { Icon } from '../../../../components/Icon'

  interface QuickAction {
    key: string
    title: string
    description: string
    icon: string
  }

  const quickActions: QuickAction[] = [
    {
      key: 'create-app',
      title: '创建应用',
      description: '新建AI应用',
      icon: 'ant-design:plus-circle-outlined',
    },
    {
      key: 'upload-knowledge',
      title: '上传知识库',
      description: '添加文档资料',
      icon: 'ant-design:cloud-upload-outlined',
    },
    {
      key: 'test-model',
      title: '模型测试',
      description: '测试模型效果',
      icon: 'ant-design:experiment-outlined',
    },
    {
      key: 'create-workflow',
      title: '创建工作流',
      description: '设计AI工作流',
      icon: 'ant-design:apartment-outlined',
    },
  ]

  const handleActionClick = (key: string) => {
    console.log('Quick action clicked:', key)
  }
</script>