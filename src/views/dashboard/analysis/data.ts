export interface GrowCardItem {
  icon: string
  title: string
  value: number
  total: number
  color: string
  action: string
}

export const growCardList: GrowCardItem[] = [
  {
    title: 'API调用',
    icon: 'ant-design:api-outlined',
    value: 15000,
    total: 280000,
    color: 'blue',
    action: '本月',
  },
  {
    title: '活跃应用',
    icon: 'ant-design:app-store-outlined',
    value: 42,
    total: 128,
    color: 'green',
    action: '运行中',
  },
  {
    title: '知识库文档',
    icon: 'ant-design:file-text-outlined',
    value: 320,
    total: 4500,
    color: 'orange',
    action: '本周新增',
  },
  {
    title: '模型使用时长',
    icon: 'ant-design:dashboard-outlined',
    value: 1200,
    total: 18600,
    color: 'purple',
    action: '小时/月',
  },
]
