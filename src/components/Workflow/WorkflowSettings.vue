<template>
  <div class="workflow-settings">
    <a-form :model="formData" layout="vertical" @finish="onSave">
      <a-card title="基础设置" size="small" class="settings-card">
        <a-form-item label="工作流名称" name="name">
          <a-input v-model:value="formData.name" placeholder="请输入工作流名称" />
        </a-form-item>

        <a-form-item label="工作流描述" name="description">
          <a-textarea
            v-model:value="formData.description"
            placeholder="请输入工作流描述"
            :rows="3"
          />
        </a-form-item>

        <a-form-item label="工作流分类" name="category">
          <a-select v-model:value="formData.category" placeholder="请选择分类">
            <a-select-option value="ai">AI助手</a-select-option>
            <a-select-option value="automation">自动化</a-select-option>
            <a-select-option value="data">数据处理</a-select-option>
            <a-select-option value="integration">系统集成</a-select-option>
            <a-select-option value="other">其他</a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item label="标签" name="tags">
          <a-select
            v-model:value="formData.tags"
            mode="tags"
            placeholder="添加标签"
            :max-tag-count="5"
          />
        </a-form-item>
      </a-card>

      <a-card title="执行设置" size="small" class="settings-card">
        <a-form-item label="全局超时时间(秒)" name="timeout">
          <a-input-number
            v-model:value="formData.timeout"
            :min="1"
            :max="3600"
            placeholder="300"
            style="width: 100%"
          />
        </a-form-item>

        <a-form-item label="最大并发数" name="maxConcurrency">
          <a-input-number
            v-model:value="formData.maxConcurrency"
            :min="1"
            :max="10"
            placeholder="3"
            style="width: 100%"
          />
        </a-form-item>

        <a-form-item label="队列大小" name="queueSize">
          <a-input-number
            v-model:value="formData.queueSize"
            :min="1"
            :max="100"
            placeholder="10"
            style="width: 100%"
          />
        </a-form-item>
      </a-card>

      <a-card title="重试策略" size="small" class="settings-card">
        <a-form-item name="retryEnabled">
          <a-checkbox v-model:checked="formData.retryEnabled"> 启用重试机制 </a-checkbox>
        </a-form-item>

        <template v-if="formData.retryEnabled">
          <a-form-item label="最大重试次数" name="maxRetries">
            <a-input-number
              v-model:value="formData.maxRetries"
              :min="1"
              :max="10"
              placeholder="3"
              style="width: 100%"
            />
          </a-form-item>

          <a-form-item label="重试延迟(毫秒)" name="retryDelay">
            <a-input-number
              v-model:value="formData.retryDelay"
              :min="100"
              :max="10000"
              :step="100"
              placeholder="1000"
              style="width: 100%"
            />
          </a-form-item>
        </template>
      </a-card>

      <a-card title="错误处理" size="small" class="settings-card">
        <a-form-item label="错误处理模式" name="errorMode">
          <a-radio-group v-model:value="formData.errorMode">
            <a-radio value="stop">遇到错误立即停止</a-radio>
            <a-radio value="continue">跳过错误继续执行</a-radio>
            <a-radio value="skip">忽略错误节点</a-radio>
          </a-radio-group>
        </a-form-item>

        <a-form-item name="notifyOnError">
          <a-checkbox v-model:checked="formData.notifyOnError"> 错误时发送通知 </a-checkbox>
        </a-form-item>

        <a-form-item label="通知邮箱" name="notificationEmail" v-if="formData.notifyOnError">
          <a-input
            v-model:value="formData.notificationEmail"
            placeholder="admin@example.com"
            type="email"
          />
        </a-form-item>
      </a-card>

      <a-card title="日志设置" size="small" class="settings-card">
        <a-form-item label="日志级别" name="logLevel">
          <a-select v-model:value="formData.logLevel" placeholder="选择日志级别">
            <a-select-option value="debug">Debug</a-select-option>
            <a-select-option value="info">Info</a-select-option>
            <a-select-option value="warn">Warning</a-select-option>
            <a-select-option value="error">Error</a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item name="saveExecutionLogs">
          <a-checkbox v-model:checked="formData.saveExecutionLogs"> 保存执行日志 </a-checkbox>
        </a-form-item>

        <a-form-item label="日志保留天数" name="logRetentionDays" v-if="formData.saveExecutionLogs">
          <a-input-number
            v-model:value="formData.logRetentionDays"
            :min="1"
            :max="365"
            placeholder="30"
            style="width: 100%"
          />
        </a-form-item>
      </a-card>

      <div class="settings-footer">
        <a-space>
          <a-button @click="onReset">重置</a-button>
          <a-button type="primary" html-type="submit" :loading="saving"> 保存设置 </a-button>
        </a-space>
      </div>
    </a-form>
  </div>
</template>

<script lang="ts" setup>
  import { ref, reactive, watch } from 'vue'
  import {
    Form as AForm,
    FormItem as AFormItem,
    Input as AInput,
    InputNumber as AInputNumber,
    Select as ASelect,
    SelectOption as ASelectOption,
    Checkbox as ACheckbox,
    Radio as ARadio,
    RadioGroup as ARadioGroup,
    Button as AButton,
    Space as ASpace,
    Card as ACard,
    message,
  } from 'ant-design-vue'
  import { Textarea as ATextarea } from 'ant-design-vue/es/input'

  interface Props {
    settings?: any
  }

  const props = withDefaults(defineProps<Props>(), {
    settings: () => ({}),
  })

  const emit = defineEmits(['save', 'update:settings'])

  const saving = ref(false)

  const formData = reactive({
    name: '',
    description: '',
    category: '',
    tags: [],
    timeout: 300,
    maxConcurrency: 3,
    queueSize: 10,
    retryEnabled: false,
    maxRetries: 3,
    retryDelay: 1000,
    errorMode: 'stop',
    notifyOnError: false,
    notificationEmail: '',
    logLevel: 'info',
    saveExecutionLogs: true,
    logRetentionDays: 30,
  })

  watch(
    () => props.settings,
    (newSettings) => {
      if (newSettings) {
        Object.assign(formData, newSettings)
      }
    },
    { immediate: true, deep: true },
  )

  const onSave = async () => {
    saving.value = true
    try {
      emit('save', formData)
      emit('update:settings', formData)
      message.success('工作流设置保存成功')
    } catch (error) {
      message.error('保存设置失败')
    } finally {
      saving.value = false
    }
  }

  const onReset = () => {
    Object.assign(formData, {
      name: '',
      description: '',
      category: '',
      tags: [],
      timeout: 300,
      maxConcurrency: 3,
      queueSize: 10,
      retryEnabled: false,
      maxRetries: 3,
      retryDelay: 1000,
      errorMode: 'stop',
      notifyOnError: false,
      notificationEmail: '',
      logLevel: 'info',
      saveExecutionLogs: true,
      logRetentionDays: 30,
    })
    message.success('设置已重置')
  }
</script>

<style lang="less" scoped>
  .workflow-settings {
    .settings-card {
      margin-bottom: 16px;

      :deep(.ant-card-body) {
        padding: 16px;
      }
    }

    .settings-footer {
      padding: 16px 0;
      text-align: right;
      border-top: 1px solid #f0f0f0;
    }
  }
</style>
