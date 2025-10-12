<template>
  <div class="similar-question-manager">
    <a-card :bordered="false" title="相似问题管理">
      <template #extra>
        <a-button :disabled="disabled" size="small" type="primary" @click="addNewRow">
          <template #icon>
            <Icon icon="ant-design:plus-outlined" />
          </template>
          添加相似问
        </a-button>
      </template>

      <!-- 相似问列表 -->
      <a-empty
        v-if="modelValue.length === 0"
        :image="Empty.PRESENTED_IMAGE_SIMPLE"
        description="暂无相似问题，点击上方按钮添加"
      />

      <div v-else class="similar-questions-list">
        <div v-for="(item, index) in modelValue" :key="index" class="similar-question-item">
          <div class="item-header">
            <div class="header-left">
              <a-avatar :style="{ backgroundColor: '#87d068' }" size="small">
                {{ index + 1 }}
              </a-avatar>
              <a-tag :color="item.sourceType === 'manual' ? 'cyan' : 'purple'" size="small">
                {{ item.sourceType === 'manual' ? '手动' : '自动' }}
              </a-tag>
            </div>
            <div class="item-actions">
              <a-popconfirm
                :disabled="disabled"
                title="确认删除此相似问？"
                @confirm="removeItem(index)"
              >
                <a-button :disabled="disabled" danger size="small" type="primary">
                  <template #icon>
                    <Icon icon="ant-design:delete-outlined" />
                  </template>
                  删除
                </a-button>
              </a-popconfirm>
            </div>
          </div>

          <div class="item-content">
            <a-form-item :label-col="{ span: 4 }" :wrapper-col="{ span: 20 }" label="相似问题">
              <a-textarea
                v-model:value="item.similarQuestion"
                :disabled="disabled"
                :rows="3"
                placeholder="请输入相似问题..."
                @change="updateItem(index, item)"
              />
            </a-form-item>
          </div>
        </div>
      </div>
    </a-card>
  </div>
</template>

<script lang="ts" setup>
  import { Empty } from 'ant-design-vue'
  import { Icon } from '/@/components/Icon'
  import { useMessage } from '/@/hooks/web/useMessage'
  import { AiQaSimilarQuestionsDTO } from '/@/api/ai/qa/AiQaSimilarQuestionsTypes'
  import { delSimilarQuestion } from '/@/api/ai/qa/AiQaPairsIndex'

  interface Props {
    modelValue: AiQaSimilarQuestionsDTO[]
    qaPairId?: string
    disabled?: boolean
  }

  const props = defineProps<Props>()
  const emit = defineEmits(['update:modelValue'])
  const { createMessage } = useMessage()

  /**
   * 添加新行
   */
  function addNewRow() {
    const newItem: AiQaSimilarQuestionsDTO = {
      similarQuestion: '',
      sourceType: 'manual',
    }
    const newValue = [...props.modelValue, newItem]
    emit('update:modelValue', newValue)
  }

  /**
   * 删除项
   */
  async function removeItem(index: number) {
    const item = props.modelValue[index]

    // 如果有 id，说明是已保存的数据，需要调用后端删除接口
    if (item.id) {
      try {
        await delSimilarQuestion(item.id)
        createMessage.success('删除成功')
      } catch (error) {
        createMessage.error('删除失败')
        return
      }
    }

    // 删除成功后，从列表中移除
    const newValue = [...props.modelValue]
    newValue.splice(index, 1)
    emit('update:modelValue', newValue)

    // 如果是新增的未保存项（没有id），直接提示删除成功
    if (!item.id) {
      createMessage.success('删除成功')
    }
  }

  /**
   * 更新项
   */
  function updateItem(index: number, item: AiQaSimilarQuestionsDTO) {
    const newValue = [...props.modelValue]
    newValue[index] = { ...item }
    emit('update:modelValue', newValue)
  }
</script>

<style lang="less" scoped>
  .similar-question-manager {
    .similar-questions-list {
      .similar-question-item {
        margin-bottom: 16px;
        padding: 16px;
        background: #fafafa;
        border: 1px solid #e8e8e8;
        border-radius: 4px;
        transition: all 0.3s;

        &:hover {
          background: #f0f0f0;
          border-color: #d9d9d9;
        }

        &:last-child {
          margin-bottom: 0;
        }

        .item-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;

          .header-left {
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .item-actions {
            display: flex;
            align-items: center;
            gap: 8px;
          }
        }

        .item-content {
          :deep(.ant-form-item) {
            margin-bottom: 12px;

            &:last-child {
              margin-bottom: 0;
            }
          }
        }
      }
    }
  }
</style>
