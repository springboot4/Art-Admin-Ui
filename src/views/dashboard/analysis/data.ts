export interface GrowCardItem {
  icon: string
  title: string
  value: number
  total: number
  color: string
  iconColor: string
  action: string
}

export function getGrowCardList(stats: {
  appTotal: number | string
  datasetTotal: number | string
  documentTotal: number | string
  conversationTotal: number | string
}): GrowCardItem[] {
  // Convert to numbers in case API returns strings
  const appTotal = Number(stats.appTotal) || 0
  const datasetTotal = Number(stats.datasetTotal) || 0
  const documentTotal = Number(stats.documentTotal) || 0
  const conversationTotal = Number(stats.conversationTotal) || 0

  return [
    {
      title: '应用总数',
      icon: 'ant-design:appstore-outlined',
      value: appTotal,
      total: appTotal,
      color: 'blue',
      iconColor: '#1890ff',
      action: '全部',
    },
    {
      title: '数据集',
      icon: 'ant-design:database-outlined',
      value: datasetTotal,
      total: datasetTotal,
      color: 'green',
      iconColor: '#52c41a',
      action: '全部',
    },
    {
      title: '文档数',
      icon: 'ant-design:file-text-outlined',
      value: documentTotal,
      total: documentTotal,
      color: 'orange',
      iconColor: '#fa8c16',
      action: '全部',
    },
    {
      title: '会话数',
      icon: 'ant-design:message-outlined',
      value: conversationTotal,
      total: conversationTotal,
      color: 'purple',
      iconColor: '#722ed1',
      action: '全部',
    },
  ]
}
