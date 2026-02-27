<template>
  <div class="p-4">
    <GrowCard :loading="loading" :stats="stats" class="enter-y" />
    <RecentProjects class="!my-4 enter-y" :loading="loading" :apps="stats.recentApps" :workflows="[]" />
    <div class="md:flex enter-y">
      <ApiTrend class="md:w-1/3 w-full" :loading="loading" :trend-data="conversationTrend" />
      <ModelUsageStats class="md:w-1/3 !md:mx-4 !md:my-0 !my-4 w-full" :loading="loading" :module-data="moduleStats" />
      <AppTypeDistribution class="md:w-1/3 w-full" :loading="loading" :app-type-data="appTypeDistribution" />
    </div>
  </div>
</template>
<script lang="ts" setup>
  import { ref, onMounted, computed } from 'vue'
  import GrowCard from './components/GrowCard.vue'
  import RecentProjects from './components/RecentProjects.vue'
  import ApiTrend from './components/ApiTrend.vue'
  import ModelUsageStats from './components/ModelUsageStats.vue'
  import AppTypeDistribution from './components/AppTypeDistribution.vue'
  import {
    getDashboardStats,
    getAppTypeDistribution,
    getConversationTrend,
    getModuleUsageStats,
    type DashboardStats,
  } from '/@/api/dashboard'

  const loading = ref(true)
  const stats = ref<DashboardStats>({
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
  })

  const conversationTrend = computed(() => {
    return getConversationTrend(stats.value.allConversations)
  })

  const appTypeDistribution = computed(() => {
    return getAppTypeDistribution(stats.value.allApps)
  })

  const moduleStats = computed(() => {
    return getModuleUsageStats(stats.value)
  })

  const fetchDashboardData = async () => {
    try {
      loading.value = true
      const data = await getDashboardStats()
      stats.value = data
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      loading.value = false
    }
  }

  onMounted(() => {
    fetchDashboardData()
  })
</script>
