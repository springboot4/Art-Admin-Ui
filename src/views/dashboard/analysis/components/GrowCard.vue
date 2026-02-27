<template>
  <div class="md:flex">
    <template v-for="(item, index) in growCardData" :key="item.title">
      <Card
        :loading="loading"
        :title="item.title"
        class="md:w-1/4 w-full !md:mt-0"
        :class="{ '!md:mr-4': index + 1 < 4, '!mt-4': index > 0 }"
      >
        <template #extra>
          <Tag :color="item.color">{{ item.action }}</Tag>
        </template>

        <div class="py-4 px-4 flex justify-between items-center">
          <CountTo :startVal="0" :endVal="item.value" class="text-2xl" />
          <div class="icon-wrapper" :style="{ backgroundColor: `${item.iconColor}15` }">
            <Icon :icon="item.icon" :size="28" :color="item.iconColor" />
          </div>
        </div>

        <div class="p-2 px-4 flex justify-between">
          <span>总{{ item.title }}</span>
          <CountTo :startVal="0" :endVal="item.total" />
        </div>
      </Card>
    </template>
  </div>
</template>
<script lang="ts" setup>
  import { computed } from 'vue'
  import { CountTo } from '/@/components/CountTo'
  import { Icon } from '/@/components/Icon'
  import { Tag, Card } from 'ant-design-vue'
  import { getGrowCardList, GrowCardItem } from '../data'

  const props = defineProps({
    loading: {
      type: Boolean,
      default: false,
    },
    stats: {
      type: Object,
      default: () => ({
        appTotal: 0,
        datasetTotal: 0,
        documentTotal: 0,
        conversationTotal: 0,
      }),
    },
  })

  const growCardData = computed<GrowCardItem[]>(() => {
    return getGrowCardList({
      appTotal: props.stats.appTotal || 0,
      datasetTotal: props.stats.datasetTotal || 0,
      documentTotal: props.stats.documentTotal || 0,
      conversationTotal: props.stats.conversationTotal || 0,
    })
  })
</script>

<style lang="less" scoped>
  .icon-wrapper {
    width: 56px;
    height: 56px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
</style>
