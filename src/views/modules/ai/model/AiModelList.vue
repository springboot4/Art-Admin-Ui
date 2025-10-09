<template>
  <div>
    <div class="m-3 p-3 bg-white">
      <!--搜索表单-->
      <vxe-form :data="model.queryParam" size="small">
        <vxe-form-item title="模型名称">
          <vxe-input v-model="model.queryParam.name" placeholder="请输入模型名称" />
        </vxe-form-item>
        <vxe-form-item title="模型类型">
          <vxe-select v-model="model.queryParam.type" clearable placeholder="请选择模型类型">
            <vxe-option
              v-for="item in modelTypeItems"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </vxe-select>
        </vxe-form-item>
        <vxe-form-item title="所属平台">
          <vxe-select v-model="model.queryParam.platform" clearable placeholder="请选择所属平台">
            <vxe-option
              v-for="item in platformOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </vxe-select>
        </vxe-form-item>
        <vxe-form-item title="是否启用">
          <vxe-select v-model="model.queryParam.enable" clearable placeholder="请选择状态">
            <vxe-option
              v-for="item in enableItems"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </vxe-select>
        </vxe-form-item>
        <vxe-form-item>
          <a-space>
            <a-button type="primary" pre-icon="ant-design:search-outlined" @click="queryPage">
              查询
            </a-button>
            <a-button type="primary" ghost pre-icon="iconamoon:restart-bold" @click="handleReset">
              重置
            </a-button>
          </a-space>
        </vxe-form-item>
      </vxe-form>

      <!--表格工具栏-->
      <vxe-toolbar ref="xToolbar" :refresh="{ query: queryPage }" custom export print>
        <template #buttons>
          <a-button pre-icon="lucide:folder-plus" type="primary" @click="add">新建</a-button>
        </template>
      </vxe-toolbar>

      <!--表格-->
      <vxe-table
        ref="xTable"
        :column-config="{ resizable: true }"
        :data="pagination.records"
        :export-config="{}"
        :loading="loading"
        :print-config="{}"
        align="center"
        border
        show-header-overflow
        show-overflow
      >
        <vxe-column title="序号" type="seq" width="60" />
        <vxe-column
          field="type"
          min-width="160"
          title="模型类型"
          :formatter="formatModelType"
        />
        <vxe-column field="name" title="模型名称" />
        <vxe-column
          field="platform"
          min-width="180"
          title="所属平台"
          :formatter="formatPlatform"
        />
        <vxe-column
          field="enable"
          min-width="120"
          title="是否启用"
          :formatter="formatEnable"
        />
        <vxe-column field="maxInputTokens" title="最大输入长度" />
        <vxe-column field="maxOutputTokens" title="最大输出长度" />
        <vxe-column field="config" title="模型配置" />
        <vxe-column field="createTime" title="创建日期" />
        <vxe-column field="createBy" title="创建人" />
        <vxe-column field="updateTime" title="更新时间" />
        <vxe-column field="updateBy" title="更新人" />
        <vxe-column fixed="right" title="操作" width="200">
          <template #default="{ row }">
            <span>
              <a href="javascript:" @click="show(row)">查看</a>
            </span>
            <a-divider type="vertical" />
            <span>
              <a href="javascript:" @click="edit(row)">编辑</a>
            </span>
            <a-divider type="vertical" />
            <a-popconfirm cancelText="否" okText="是" title="是否删除" @confirm="remove(row)">
              <a href="javascript:" style="color: red">删除</a>
            </a-popconfirm>
          </template>
        </vxe-column>
      </vxe-table>

      <!--表格分页-->
      <vxe-pager
        :current-page="pagination.current"
        :loading="loading"
        :page-size="pagination.size"
        :total="pagination.total"
        size="medium"
        @page-change="handleTableChange"
      />

      <!--编辑表单-->
      <AiModelEdit ref="aiModelEdit" @ok="queryPage" />
    </div>
  </div>
</template>

<script lang="ts" setup>
  import { computed, defineComponent, onMounted, ref } from 'vue'
  import { VxeTableInstance, VxeToolbarInstance } from 'vxe-table'
  import useTablePage from '/@/hooks/art/useTablePage'
  import { del, page } from '/@/api/ai/model/AiModelIndex'
  import { FormOperationType } from '/@/enums/formOperationType'
  import { useMessage } from '/@/hooks/web/useMessage'
  import AiModelEdit from '/@/views/modules/ai/model/AiModelEdit.vue'
  import { page as fetchPlatformPage } from '/@/api/ai/model/AiModelPlatformIndex'
  import type { VxeColumnFormatterParams } from 'vxe-table'

  const { handleTableChange, pageQueryResHandel, resetQuery, pagination, model, loading } =
    useTablePage(queryPage)
  const { createMessage } = useMessage()
  const xTable = ref<VxeTableInstance>()
  const xToolbar = ref<VxeToolbarInstance>()
  const aiModelEdit = ref()

  const MODEL_TYPE_LABEL_MAP: Record<string, string> = {
    CHAT: '聊天 / 文本生成',
    EMBEDDING: '向量嵌入',
    RERANK: '重排序',
    IMAGE: '图像生成',
    AUDIO: '音频模型',
  }

  const ENABLE_LABEL_MAP: Record<string, string> = {
    '1': '启用',
    '0': '禁用',
  }

  const modelTypeItems = Object.entries(MODEL_TYPE_LABEL_MAP).map(([value, label]) => ({
    value,
    label,
  }))

  const enableItems = Object.entries(ENABLE_LABEL_MAP).map(([value, label]) => ({
    value,
    label,
  }))

  const platformNameMap = ref<Record<string, string>>({})
  const platformOptions = computed(() =>
    Object.entries(platformNameMap.value).map(([value, label]) => ({ value, label })),
  )

  onMounted(async () => {
    vxeBind()
    await loadPlatforms()
    queryPage()
  })

  /**
   * vxe表格、工具栏绑定
   */
  function vxeBind() {
    const $table = xTable.value
    const $toolbar = xToolbar.value
    $table?.connect($toolbar as VxeToolbarInstance)
  }

  /**
   * 分页查询
   */
  function queryPage() {
    loading.value = true
    const filters = Object.fromEntries(
      Object.entries(model.queryParam || {}).filter(([, value]) =>
        value !== undefined && value !== null && value !== '',
      ),
    )

    page({
      ...filters,
      ...model.pages,
    }).then((res) => {
      pageQueryResHandel(res)
    })
  }

  /**
   * 添加
   */
  function add() {
    aiModelEdit.value?.init(null, FormOperationType.ADD)
  }

  /**
   * 查看
   */
  function show(item) {
    aiModelEdit.value?.init(item.id, FormOperationType.SHOW)
  }

  /**
   * 编辑
   */
  function edit(item) {
    aiModelEdit.value?.init(item.id, FormOperationType.EDIT)
  }

  /**
   * 删除
   */
  function remove(item) {
    del(item.id).then((_) => {
      createMessage.success('删除成功')
      queryPage()
    })
  }

  function formatModelType({ cellValue }: VxeColumnFormatterParams) {
    if (!cellValue) return '-'
    return MODEL_TYPE_LABEL_MAP[String(cellValue)] || String(cellValue)
  }

  function formatEnable({ cellValue }: VxeColumnFormatterParams) {
    if (cellValue === undefined || cellValue === null || cellValue === '') return '-'
    const key = String(cellValue)
    return ENABLE_LABEL_MAP[key] || key
  }

  function formatPlatform({ cellValue }: VxeColumnFormatterParams) {
    if (!cellValue) return '-'
    const key = String(cellValue)
    return platformNameMap.value[key] || key
  }

  async function loadPlatforms() {
    try {
      const response = await fetchPlatformPage({ current: 1, size: 1000 })
      const map: Record<string, string> = {}
      response?.records?.forEach((item) => {
        if (item.id) {
          map[String(item.id)] = item.name || String(item.id)
        }
      })
      platformNameMap.value = map
    } catch (error) {
      console.error('加载模型平台列表失败', error)
    }
  }

  function handleReset() {
    resetQuery()
  }

  defineComponent({
    name: 'AiModelList',
  })
</script>

<style lang="less" scoped></style>
