<template>
  <div>
    <div class="m-3 p-3 bg-white">
      <!--搜索表单-->
      <vxe-form :data="model.queryParam" size="small">
        <vxe-form-item title="厂商名称">
          <vxe-input v-model="model.queryParam.name" placeholder="请输入厂商名称" />
        </vxe-form-item>
        <vxe-form-item>
          <a-space>
            <a-button pre-icon="ant-design:search-outlined" type="primary" @click="queryPage">
              查询
            </a-button>
            <a-button ghost pre-icon="iconamoon:restart-bold" type="primary" @click="handleReset">
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
        <vxe-column field="name" title="厂商名称" />
        <vxe-column field="baseUrl" title="base_url" />
        <vxe-column
          :formatter="formatProxyEnable"
          field="proxyEnable"
          min-width="140"
          title="是否启用代理"
        />
        <vxe-column
          :formatter="formatOpenApi"
          field="openaiApiCompatible"
          min-width="160"
          title="OpenAPI 兼容"
        />
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
            <!--            <a-divider type="vertical" />-->
            <!--            <a-popconfirm cancelText="否" okText="是" title="是否删除" @confirm="remove(row)">-->
            <!--              <a href="javascript:" style="color: red">删除</a>-->
            <!--            </a-popconfirm>-->
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
      <AiModelPlatformEdit ref="aiModelPlatformEdit" @ok="queryPage" />
    </div>
  </div>
</template>

<script lang="ts" setup>
  import { defineComponent, onMounted, ref } from 'vue'
  import type { VxeColumnFormatterParams } from 'vxe-table'
  import { VxeTableInstance, VxeToolbarInstance } from 'vxe-table'
  import useTablePage from '/@/hooks/art/useTablePage'
  import { del, page } from '/@/api/ai/model/AiModelPlatformIndex'
  import { FormOperationType } from '/@/enums/formOperationType'
  import { useMessage } from '/@/hooks/web/useMessage'
  import AiModelPlatformEdit from '/@/views/modules/ai/model/AiModelPlatformEdit.vue'

  const { handleTableChange, pageQueryResHandel, resetQuery, pagination, model, loading } =
    useTablePage(queryPage)
  const { createMessage } = useMessage()
  const xTable = ref<VxeTableInstance>()
  const xToolbar = ref<VxeToolbarInstance>()
  const aiModelPlatformEdit = ref()

  const proxyEnableItems = [
    { label: '启用', value: '1' },
    { label: '禁用', value: '0' },
  ]

  const openApiItems = [
    { label: '兼容', value: '1' },
    { label: '不兼容', value: '0' },
  ]

  onMounted(() => {
    vxeBind()
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
      Object.entries(model.queryParam || {}).filter(
        ([, value]) => value !== undefined && value !== null && value !== '',
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
    aiModelPlatformEdit.value?.init(null, FormOperationType.ADD)
  }

  /**
   * 查看
   */
  function show(item) {
    aiModelPlatformEdit.value?.init(item.id, FormOperationType.SHOW)
  }

  /**
   * 编辑
   */
  function edit(item) {
    aiModelPlatformEdit.value?.init(item.id, FormOperationType.EDIT)
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

  function formatProxyEnable({ cellValue }: VxeColumnFormatterParams) {
    if (cellValue === undefined || cellValue === null || cellValue === '') return '-'
    const key = String(cellValue)
    return key === '1' ? '启用' : key === '0' ? '禁用' : key
  }

  function formatOpenApi({ cellValue }: VxeColumnFormatterParams) {
    if (cellValue === undefined || cellValue === null || cellValue === '') return '-'
    const key = String(cellValue)
    return key === '1' ? '兼容' : key === '0' ? '不兼容' : key
  }

  function handleReset() {
    resetQuery()
  }

  defineComponent({
    name: 'AiModelPlatformList',
  })
</script>

<style lang="less" scoped></style>
