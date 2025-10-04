<template>
  <div class="p-4">
    <GrowCard :loading="loading" class="enter-y" />
    <RecentProjects class="!my-4 enter-y" :loading="loading" />
    <QuickActions class="!my-4 enter-y" />
    <div class="md:flex enter-y">
      <ApiTrend class="md:w-1/3 w-full" :loading="loading" />
      <ModelUsageStats class="md:w-1/3 !md:mx-4 !md:my-0 !my-4 w-full" :loading="loading" />
      <AppTypeDistribution class="md:w-1/3 w-full" :loading="loading" />
    </div>
  </div>
</template>
<script lang="ts" setup>
  import { ref } from 'vue'
  import GrowCard from './components/GrowCard.vue'
  import RecentProjects from './components/RecentProjects.vue'
  import QuickActions from './components/QuickActions.vue'
  import ApiTrend from './components/ApiTrend.vue'
  import ModelUsageStats from './components/ModelUsageStats.vue'
  import AppTypeDistribution from './components/AppTypeDistribution.vue'

  const loading = ref(true)

  setTimeout(() => {
    loading.value = false
  }, 500)
</script>
