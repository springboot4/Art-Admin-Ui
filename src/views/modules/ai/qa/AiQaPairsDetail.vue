<template>
  <a-drawer
    :closable="true"
    :visible="visible"
    :width="800"
    placement="right"
    title="QA对详情"
    @close="handleClose"
  >
    <a-spin :spinning="loading">
      <div v-if="detail" class="qa-detail-container">
        <!-- 头部元信息 -->
        <div class="header-section">
          <a-space direction="vertical" size="small" style="width: 100%">
            <div class="meta-row">
              <a-space size="middle">
                <a-tag :color="getPriorityColor(detail.priority)" size="large">
                  优先级 {{ detail.priority || '-' }}
                </a-tag>
                <a-badge
                  :status="detail.enabled ? 'success' : 'default'"
                  :text="detail.enabled ? '已启用' : '已禁用'"
                />
                <a-tag v-if="detail.vectorIndexed" color="blue">
                  <Icon icon="mdi:vector-square" />
                  已向量化
                </a-tag>
                <a-tag :color="getSourceTypeColor(detail.sourceType)">
                  {{ getSourceTypeText(detail.sourceType) }}
                </a-tag>
              </a-space>
            </div>

            <a-descriptions :column="2" bordered size="small">
              <a-descriptions-item label="命中次数">
                <a-statistic :value="detail.hitCount || 0" :value-style="{ fontSize: '16px' }">
                  <template #prefix>
                    <Icon icon="mdi:target" style="color: #ff7a45" />
                  </template>
                </a-statistic>
              </a-descriptions-item>
              <a-descriptions-item label="最后命中时间">
                {{ detail.lastHitTime || '暂无' }}
              </a-descriptions-item>
              <a-descriptions-item label="创建人">
                {{ detail.createBy || '-' }}
              </a-descriptions-item>
              <a-descriptions-item label="创建时间">
                {{ detail.createTime || '-' }}
              </a-descriptions-item>
              <a-descriptions-item label="更新人">
                {{ detail.updateBy || '-' }}
              </a-descriptions-item>
              <a-descriptions-item label="更新时间">
                {{ detail.updateTime || '-' }}
              </a-descriptions-item>
            </a-descriptions>
          </a-space>
        </div>

        <a-divider />

        <!-- 标准问题 -->
        <div class="question-section">
          <div class="section-header">
            <Icon class="section-icon" icon="mdi:comment-question-outline" />
            <h3>标准问题</h3>
          </div>
          <div class="question-content">
            {{ detail.question }}
          </div>
        </div>

        <a-divider />

        <!-- 答案 -->
        <div class="answer-section">
          <div class="section-header">
            <Icon class="section-icon" icon="mdi:comment-text-outline" />
            <h3>答案</h3>
          </div>

          <div class="answer-content">
            <a-typography-paragraph>
              {{ detail.answer }}
            </a-typography-paragraph>
          </div>
        </div>

        <a-divider />

        <!-- 相似问列表 -->
        <div class="similar-questions-section">
          <div class="section-header">
            <div class="header-left">
              <Icon class="section-icon" icon="mdi:comment-multiple-outline" />
              <h3>问题变体</h3>
              <a-badge
                :count="similarQuestions.length"
                :number-style="{ backgroundColor: '#52c41a' }"
              />
            </div>
          </div>

          <a-empty
            v-if="similarQuestions.length === 0"
            :image="Empty.PRESENTED_IMAGE_SIMPLE"
            description="暂无相似问题"
            style="margin: 24px 0"
          />

          <div v-else class="similar-questions-list">
            <a-list :data-source="similarQuestions" :split="true">
              <template #renderItem="{ item, index }">
                <a-list-item>
                  <a-list-item-meta>
                    <template #avatar>
                      <a-avatar :style="{ backgroundColor: '#87d068' }">
                        {{ index + 1 }}
                      </a-avatar>
                    </template>
                    <template #description>
                      <div style="color: rgba(0, 0, 0, 0.65)">{{ item.similarQuestion }}</div>
                      <div style="color: rgba(0, 0, 0, 0.45); font-size: 12px; margin-top: 4px">
                        创建时间: {{ item.createTime }} · 创建人: {{ item.createBy }}
                      </div>
                    </template>
                  </a-list-item-meta>
                </a-list-item>
              </template>
            </a-list>
          </div>
        </div>
      </div>
    </a-spin>

    <!-- 底部操作按钮 -->
    <template #footer>
      <a-space>
        <a-button @click="handleClose">关闭</a-button>
      </a-space>
    </template>
  </a-drawer>
</template>

<script lang="ts" setup>
  import { ref } from 'vue'
  import { Empty } from 'ant-design-vue'
  import { Icon } from '/@/components/Icon'
  import { useMessage } from '/@/hooks/web/useMessage'
  import { get, getSimilarQuestion } from '/@/api/ai/qa/AiQaPairsIndex'
  import { AiQaPairsDTO } from '/@/api/ai/qa/AiQaPairsTypes'
  import { AiQaSimilarQuestionsDTO } from '/@/api/ai/qa/AiQaSimilarQuestionsTypes'

  const emit = defineEmits(['refresh'])
  const { createMessage } = useMessage()

  const visible = ref(false)
  const loading = ref(false)
  const detail = ref<AiQaPairsDTO | null>(null)
  const similarQuestions = ref<AiQaSimilarQuestionsDTO[]>([])

  /**
   * 显示详情
   */
  function show(id: string) {
    visible.value = true
    loading.value = true
    Promise.all([loadDetail(id), loadSimilarQuestions(id)])
      .then(() => {
        loading.value = false
      })
      .catch(() => {
        loading.value = false
      })
  }

  /**
   * 加载详情
   */
  async function loadDetail(id: string) {
    const res = await get(id)
    detail.value = res
  }

  /**
   * 加载相似问列表
   */
  async function loadSimilarQuestions(qaPairId: string) {
    const res = await getSimilarQuestion(qaPairId)
    similarQuestions.value = Array.isArray(res) ? res : []
  }

  /**
   * 关闭抽屉
   */
  function handleClose() {
    visible.value = false
    detail.value = null
    similarQuestions.value = []
  }

  /**
   * 获取优先级颜色
   */
  function getPriorityColor(priority: string): string {
    const colorMap = {
      '5': 'red',
      '4': 'orange',
      '3': 'blue',
      '2': 'green',
      '1': 'default',
    }
    return colorMap[priority] || 'default'
  }

  /**
   * 获取来源类型颜色
   */
  function getSourceTypeColor(sourceType: string): string {
    const colorMap = {
      manual: 'cyan',
      llm: 'purple',
      import: 'geekblue',
    }
    return colorMap[sourceType] || 'default'
  }

  /**
   * 获取来源类型文本
   */
  function getSourceTypeText(sourceType: string): string {
    const textMap = {
      manual: '手动创建',
      llm: 'AI生成',
      import: '批量导入',
    }
    return textMap[sourceType] || sourceType
  }

  defineExpose({
    show,
  })
</script>

<style lang="less" scoped>
  .qa-detail-container {
    .header-section {
      .meta-row {
        margin-bottom: 16px;
      }
    }

    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;

      .header-left {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .section-icon {
        font-size: 20px;
        color: #1890ff;
      }

      h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
      }
    }

    .question-section {
      .question-content {
        padding: 16px;
        background: #f0f5ff;
        border-left: 4px solid #1890ff;
        border-radius: 4px;
        font-size: 16px;
        font-weight: 500;
        line-height: 1.6;
        color: #262626;
      }
    }

    .answer-section {
      .answer-content {
        padding: 16px;
        background: #f6ffed;
        border-left: 4px solid #52c41a;
        border-radius: 4px;
        font-size: 14px;
        line-height: 1.8;
        color: #262626;
        white-space: pre-wrap;
        word-break: break-word;
      }

      .answer-edit {
        padding: 12px;
        background: #fafafa;
        border-radius: 4px;
      }
    }

    .similar-questions-section {
      .similar-questions-list {
        background: #fafafa;
        border-radius: 4px;
        padding: 8px;
      }
    }
  }
</style>
