import { page as appPage } from '../ai/app/AiAppIndex'
import { page as datasetPage } from '../ai/dataset/AiDataSetIndex'
import { page as documentPage } from '../ai/document/AiDocumentIndex'
import { page as conversationPage } from '../ai/conversation/AiConversationsIndex'
import { pageAgents } from '../ai/agent/AiAgentIndex'
import { page as workflowPage } from '../ai/workflow/AiWorkflowsIndex'

export interface DashboardStats {
  appTotal: number
  datasetTotal: number
  documentTotal: number
  conversationTotal: number
  agentTotal: number
  workflowTotal: number
  recentApps: any[]
  recentConversations: any[]
  allConversations: any[] // For trend calculation
  allApps: any[] // For type distribution
}

export interface AppTypeStats {
  type: string
  count: number
  color: string
}

export interface DailyTrend {
  date: string
  count: number
}

// App mode mapping (mode is a string)
const APP_MODE_MAP: Record<string, { type: string; color: string }> = {
  chatbot: { type: '聊天助手', color: '#1890ff' },
  completion: { type: '文本生成', color: '#52c41a' },
  agent: { type: 'Agent', color: '#722ed1' },
  chatflow: { type: '对话流', color: '#fa8c16' },
  workflow: { type: '工作流', color: '#13c2c2' },
}

// Helper to convert to number
function toNumber(val: any): number {
  if (typeof val === 'number') return val
  if (typeof val === 'string') return parseInt(val, 10) || 0
  return 0
}

// Helper to ensure array
function ensureArray(val: any): any[] {
  if (Array.isArray(val)) return val
  return []
}

// Get dashboard statistics
export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    // Backend uses MyBatis Plus pagination: current (page number) and size (page size)
    const [apps, datasets, documents, conversations, agents, workflows] = await Promise.all([
      appPage({ current: 1, size: 1000 }),
      datasetPage({ current: 1, size: 1000 }),
      documentPage({ current: 1, size: 1000 }),
      conversationPage({ current: 1, size: 1000 } as any),
      pageAgents({ current: 1, size: 1000 }),
      workflowPage({ current: 1, size: 1000 }),
    ])

    const appsArray = ensureArray(apps?.records)
    const conversationsArray = ensureArray(conversations?.records)

    return {
      appTotal: toNumber(apps?.total),
      datasetTotal: toNumber(datasets?.total),
      documentTotal: toNumber(documents?.total),
      conversationTotal: toNumber(conversations?.total),
      agentTotal: toNumber(agents?.total),
      workflowTotal: toNumber(workflows?.total),
      recentApps: appsArray.slice(0, 5),
      recentConversations: conversationsArray.slice(0, 5),
      allConversations: conversationsArray, // All conversations for trend
      allApps: appsArray, // All apps for distribution
    }
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return {
      appTotal: 0,
      datasetTotal: 0,
      documentTotal: 0,
      conversationTotal: 0,
      agentTotal: 0,
      workflowTotal: 0,
      recentApps: [],
      recentConversations: [],
      allConversations: [],
      allApps: [],
    }
  }
}

// Get app type distribution
export function getAppTypeDistribution(apps: any): AppTypeStats[] {
  const appsArray = ensureArray(apps)
  if (appsArray.length === 0) return []

  const typeCount: Record<string, { count: number; color: string }> = {}

  appsArray.forEach((app) => {
    const mode = app?.mode || 'unknown'
    const modeInfo = APP_MODE_MAP[mode] || { type: '其他', color: '#8c8c8c' }
    if (!typeCount[modeInfo.type]) {
      typeCount[modeInfo.type] = { count: 0, color: modeInfo.color }
    }
    typeCount[modeInfo.type].count++
  })

  return Object.entries(typeCount).map(([type, data]) => ({
    type,
    count: data.count,
    color: data.color,
  }))
}

// Get conversation trend
// Shows last 30 days if there's data, otherwise shows the actual data distribution
export function getConversationTrend(conversations: any): DailyTrend[] {
  const convArray = ensureArray(conversations)

  if (convArray.length === 0) {
    // No conversations at all, return last 7 days with zeros
    const last7Days: DailyTrend[] = []
    const today = new Date()
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      last7Days.push({ date: dateStr, count: 0 })
    }
    return last7Days
  }

  // Parse all conversation dates
  const dateCounts: Record<string, number> = {}
  convArray.forEach((conv) => {
    if (conv?.createTime) {
      let convDate: string
      if (conv.createTime.includes(' ')) {
        convDate = conv.createTime.split(' ')[0]
      } else if (conv.createTime.includes('T')) {
        convDate = conv.createTime.split('T')[0]
      } else {
        convDate = conv.createTime.substring(0, 10)
      }
      dateCounts[convDate] = (dateCounts[convDate] || 0) + 1
    }
  })

  // Get sorted dates
  const sortedDates = Object.keys(dateCounts).sort()

  if (sortedDates.length === 0) {
    return []
  }

  // Find the most recent date with data
  const lastDateWithData = new Date(sortedDates[sortedDates.length - 1])

  // Generate 7 days ending with the last date with data
  const trendDays: DailyTrend[] = []
  for (let i = 6; i >= 0; i--) {
    const date = new Date(lastDateWithData)
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]
    trendDays.push({ date: dateStr, count: dateCounts[dateStr] || 0 })
  }

  return trendDays
}

// Get module usage stats
export function getModuleUsageStats(stats: DashboardStats): { name: string; count: number; color: string }[] {
  if (!stats) return []

  return [
    { name: 'AI应用', count: toNumber(stats.appTotal), color: '#1890ff' },
    { name: '智能体', count: toNumber(stats.agentTotal), color: '#52c41a' },
    { name: '工作流', count: toNumber(stats.workflowTotal), color: '#722ed1' },
    { name: '数据集', count: toNumber(stats.datasetTotal), color: '#fa8c16' },
    { name: '文档', count: toNumber(stats.documentTotal), color: '#13c2c2' },
  ]
}
