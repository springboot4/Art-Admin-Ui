<template>
  <BasicModal
    :loading="confirmLoading"
    :mask-closable="showable"
    :title="title"
    :visible="visible"
    :width="900"
    v-bind="$attrs"
    @cancel="handleCancel"
  >
    <a-form
      ref="formRef"
      :label-col="labelCol"
      :model="formData"
      :rules="rules"
      :wrapper-col="wrapperCol"
    >
      <!-- 基本信息 -->
      <a-divider orientation="left">
        <Icon icon="mdi:information-outline" />
        基本信息
      </a-divider>

      <a-form-item label="标准问题" name="question">
        <a-textarea
          v-model:value="formData.question"
          :disabled="showable"
          :maxlength="500"
          :rows="3"
          allow-clear
          placeholder="请输入标准问题..."
          show-count
        />
      </a-form-item>

      <a-form-item label="答案内容" name="answer">
        <a-textarea
          v-model:value="formData.answer"
          :disabled="showable"
          :maxlength="2000"
          :rows="6"
          allow-clear
          placeholder="请输入答案内容..."
          show-count
        />
      </a-form-item>

      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item
            :label-col="{ span: 8 }"
            :wrapper-col="{ span: 16 }"
            label="优先级"
            name="priority"
          >
            <a-select
              v-model:value="formData.priority"
              :disabled="showable"
              option-label-prop="label"
              placeholder="选择优先级"
            >
              <a-select-option
                v-for="opt in priorityOptions"
                :key="opt.value"
                :label="`${opt.label}优先级 (${opt.value})`"
                :value="opt.value"
              >
                <a-tag :color="opt.color">{{ opt.label }}</a-tag>
                优先级 ({{ opt.value }})
              </a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item
            :label-col="{ span: 8 }"
            :wrapper-col="{ span: 16 }"
            label="启用状态"
            name="enabled"
          >
            <a-switch
              v-model:checked="enabledSwitch"
              :disabled="showable"
              checked-children="启用"
              un-checked-children="禁用"
            />
          </a-form-item>
        </a-col>
      </a-row>

      <!-- 相似问管理 -->
      <template v-if="formOperationType === FormOperationType.EDIT">
        <a-divider orientation="left">
          <Icon icon="mdi:comment-multiple-outline" />
          相似问题管理
        </a-divider>

        <a-form-item :label-col="{ span: 0 }" :wrapper-col="{ span: 24 }">
          <AiSimilarQuestionManager
            v-model="similarQuestions"
            :disabled="showable"
            :qa-pair-id="formData.id"
          />
        </a-form-item>
      </template>

      <!-- 元数据（仅查看模式显示） -->
      <template v-if="showable">
        <a-divider orientation="left">
          <Icon icon="mdi:database-outline" />
          元数据信息
        </a-divider>

        <a-descriptions :column="2" bordered size="small">
          <a-descriptions-item label="命中次数">
            {{ formData.hitCount || 0 }}
          </a-descriptions-item>
          <a-descriptions-item label="最后命中时间">
            {{ formData.lastHitTime || '暂无' }}
          </a-descriptions-item>
          <a-descriptions-item label="向量化状态">
            <a-tag :color="formData.vectorIndexed ? 'blue' : 'default'">
              {{ formData.vectorIndexed ? '已向量化' : '未向量化' }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="向量ID">
            {{ formData.vectorId || '-' }}
          </a-descriptions-item>
          <a-descriptions-item label="创建人">
            {{ formData.createBy || '-' }}
          </a-descriptions-item>
          <a-descriptions-item label="创建时间">
            {{ formData.createTime || '-' }}
          </a-descriptions-item>
          <a-descriptions-item label="更新人">
            {{ formData.updateBy || '-' }}
          </a-descriptions-item>
          <a-descriptions-item label="更新时间">
            {{ formData.updateTime || '-' }}
          </a-descriptions-item>
        </a-descriptions>
      </template>
    </a-form>

    <template #footer>
      <a-space>
        <a-button @click="handleCancel">{{ showable ? '关闭' : '取消' }}</a-button>
        <a-button v-if="!showable" :loading="confirmLoading" type="primary" @click="handleOk">
          保存
        </a-button>
      </a-space>
    </template>
  </BasicModal>
</template>

<script lang="ts" setup>
  import { BasicModal } from '/@/components/Modal'
  import { computed, nextTick, reactive, ref, Ref } from 'vue'
  import { Icon } from '/@/components/Icon'
  import useFormEdit from '/@/hooks/art/useFormEdit'
  import { FormOperationType } from '/@/enums/formOperationType'
  import { FormInstance } from 'ant-design-vue'
  import {
    add,
    delSimilarQuestion,
    get,
    getSimilarQuestion,
    similarQuestionAdd,
    update,
  } from '/@/api/ai/qa/AiQaPairsIndex'
  import { AiQaPairsDTO } from '/@/api/ai/qa/AiQaPairsTypes'
  import { AiQaSimilarQuestionsDTO } from '/@/api/ai/qa/AiQaSimilarQuestionsTypes'
  import AiSimilarQuestionManager from './components/AiSimilarQuestionManager.vue'

  const {
    initFormEditType,
    handleCancel,
    labelCol,
    wrapperCol,
    title,
    confirmLoading,
    visible,
    showable,
    formOperationType,
  } = useFormEdit()

  const emits = defineEmits(['ok'])

  // 表单验证规则（简化，只保留必填项）
  const rules = reactive({
    question: [{ required: true, message: '请输入标准问题', trigger: ['blur', 'change'] }],
    answer: [{ required: true, message: '请输入答案内容', trigger: ['blur', 'change'] }],
    priority: [{ required: true, message: '请选择优先级', trigger: ['blur', 'change'] }],
    enabled: [{ required: true, message: '请选择启用状态', trigger: ['blur', 'change'] }],
    sourceType: [{ required: true, message: '请选择来源类型', trigger: ['blur', 'change'] }],
  })

  const formRef = ref<FormInstance>()

  let formData: Ref<AiQaPairsDTO> = ref({
    id: '',
    datasetId: '',
    question: '',
    answer: '',
    priority: '3', // 默认中等优先级
    enabled: true, // 默认启用
    sourceType: 'manual', // 默认手动创建
  })

  // 相似问列表
  const similarQuestions = ref<AiQaSimilarQuestionsDTO[]>([])

  // 启用状态开关（双向绑定）
  const enabledSwitch = computed({
    get: () => formData.value.enabled === true,
    set: (val: boolean) => {
      formData.value.enabled = val
    },
  })

  // 优先级映射
  const priorityOptions = [
    { value: '5', label: '最高', color: 'red' },
    { value: '4', label: '高', color: 'orange' },
    { value: '3', label: '中', color: 'blue' },
    { value: '2', label: '低', color: 'green' },
    { value: '1', label: '最低', color: 'default' },
  ]

  // 根据值获取优先级信息
  function getPriorityInfo(value: string) {
    return priorityOptions.find((opt) => opt.value === value) || priorityOptions[2]
  }

  /**
   * 表单初始化
   */
  function init(id, operationType: FormOperationType, datasetId?: string) {
    initFormEditType(operationType)
    resetForm()
    // 如果是新增模式，设置数据集ID
    if (operationType === FormOperationType.ADD && datasetId) {
      formData.value.datasetId = datasetId
    }
    getInfo(id, operationType)
  }

  /**
   * 获取表单信息
   */
  async function getInfo(id, editType: FormOperationType) {
    if ([FormOperationType.EDIT, FormOperationType.SHOW].includes(editType)) {
      confirmLoading.value = true
      try {
        // 加载QA对信息
        const res = await get(id)
        formData.value = res

        // 如果是编辑模式，加载相似问列表
        if (editType === FormOperationType.EDIT) {
          const similarRes = await getSimilarQuestion(id)
          similarQuestions.value = Array.isArray(similarRes) ? similarRes : []
        }
      } catch (error) {
        console.error('获取数据失败:', error)
      } finally {
        confirmLoading.value = false
      }
    }
  }

  /**
   * 保存新增或者编辑
   */
  async function handleOk() {
    try {
      await formRef.value?.validate()
      confirmLoading.value = true

      if (formOperationType.value === FormOperationType.ADD) {
        // 新增QA对
        await add(formData.value)
      } else if (formOperationType.value === FormOperationType.EDIT) {
        // 更新QA对
        await update(formData.value)

        // 处理相似问的增删改
        await handleSimilarQuestionsSync()
      }

      confirmLoading.value = false
      handleCancel()
      emits('ok')
    } catch (error) {
      confirmLoading.value = false
      console.error('保存失败:', error)
    }
  }

  /**
   * 同步相似问数据
   */
  async function handleSimilarQuestionsSync() {
    // 获取当前数据库中的相似问列表
    const currentSimilarQuestions = await getSimilarQuestion(formData.value.id!)
    const currentList = Array.isArray(currentSimilarQuestions) ? currentSimilarQuestions : []

    // 需要删除的项（在数据库中但不在编辑列表中）
    const toDelete = currentList.filter(
      (current) => !similarQuestions.value.some((edit) => edit.id === current.id),
    )

    // 需要新增的项（没有id的项）
    const toAdd = similarQuestions.value.filter((item) => !item.id)

    // 执行删除
    for (const item of toDelete) {
      await delSimilarQuestion(item.id)
    }

    // 执行新增
    for (const item of toAdd) {
      await similarQuestionAdd({
        qaPairId: formData.value.id,
        similarQuestion: item.similarQuestion,
        sourceType: item.sourceType,
      })
    }
  }

  /**
   * 重置表单字段
   */
  function resetForm() {
    formData.value = {
      id: '',
      datasetId: '',
      question: '',
      answer: '',
      priority: '3',
      enabled: true,
      sourceType: 'manual',
    }
    similarQuestions.value = []
    nextTick(() => formRef.value?.resetFields())
  }

  /**
   * 暴露子组件init方法
   */
  defineExpose({
    init,
  })
</script>

<style lang="less" scoped>
  :deep(.ant-divider-horizontal.ant-divider-with-text-left) {
    margin: 24px 0 16px;
    font-weight: 600;
    color: rgba(0, 0, 0, 0.85);

    .ant-divider-inner-text {
      display: flex;
      align-items: center;
      gap: 8px;
    }
  }
</style>
