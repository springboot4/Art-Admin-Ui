<template>
  <BasicModal
    :loading="confirmLoading"
    :mask-closable="showable"
    :title="modalTile"
    :visible="visible"
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
      <a-form-item :hidden="true" label="角色ID" name="roleId">
        <a-input v-model:value="formData.roleId" :disabled="showable" />
      </a-form-item>
      <a-form-item label="角色名称" name="roleName">
        <a-input
          v-model:value="formData.roleName"
          :disabled="showable"
          allow-clear
          placeholder="请输入角色名称"
        />
      </a-form-item>
      <a-form-item label="角色描述" name="remark">
        <a-input
          v-model:value="formData.remark"
          :disabled="showable"
          allow-clear
          placeholder="请输入角色描述"
        />
      </a-form-item>
      <a-form-item label="菜单权限" name="menuId">
        <a-tree
          v-if="treeData.length"
          v-model:checkedKeys="tempMenu"
          :disabled="showable"
          :tree-data="treeData"
          checkStrictly
          checkable
        >
          <template #title="{ title }">
            {{ title }}
          </template>
        </a-tree>
      </a-form-item>
      <a-form-item label="数据权限范围" name="dataScope">
        <a-select
          v-if="dataPermissionList.length"
          v-model:value="formData.dataScope"
          :disabled="showable"
        >
          <a-select-option
            v-for="item in dataPermissionList"
            :key="Number(item.value)"
            :value="Number(item.value)"
          >
            {{ item.label }}
          </a-select-option>
        </a-select>
      </a-form-item>
      <a-form-item
        v-if="Number(formData.dataScope) === 2"
        label="指定部门数据权限"
        name="dataScopeDeptIds"
      >
        <a-tree
          v-if="deptTree.length"
          v-model:checkedKeys="tempDept"
          :disabled="showable"
          :tree-data="deptTree"
          checkStrictly
          checkable
          defaultExpandAll
        >
          <template #title="{ title }">
            {{ title }}
          </template>
        </a-tree>
      </a-form-item>
    </a-form>
    <template #footer>
      <a-space>
        <a-button @click="handleCancel">取消</a-button>
        <a-button v-if="!showable" :loading="confirmLoading" type="primary" @click="handleOk"
          >保存
        </a-button>
      </a-space>
    </template>
  </BasicModal>
</template>

<script lang="ts" setup>
  import { BasicModal } from '/@/components/Modal'
  import { nextTick, reactive, Ref, ref } from 'vue'
  import useFormEdit from '/@/hooks/art/useFormEdit'
  import { FormOperationType } from '/@/enums/formOperationType'
  import { FormInstance } from 'ant-design-vue'
  import { add, get, update } from '/@/api/system/role'
  import { RoleDTO } from '/@/api/system/role/types'
  import { page as getMenuTree } from '/@/api/system/menu'
  import useDict from '/@/hooks/art/useDict'
  import { DictItemDto } from '/@/api/system/dict/types'
  import { getDeptTree } from '/@/api/system/dept'

  let dataPermissionList: DictItemDto[] = ref([])
  useDict().dictItemsByType('data_permission_type', dataPermissionList.value)

  let deptTree: Ref<any[]> = ref([])
  getDeptTree().then((res) => {
    deptTree.value.push(buildDeptTree(res))
  })
  let tempDept = ref<{ checked: string[]; halfChecked: string[] | number[] }>({
    checked: [],
    halfChecked: [],
  })

  function buildDeptTree(res) {
    if (res) {
      // 当前节点
      const v: { children: any[]; title: string; key: string } = {
        title: res.deptName,
        key: res.deptId,
        children: [],
      }

      //  处理子节点
      if (res.children && res.children.length > 0) {
        v.children = res.children.map((item) => {
          return buildDeptTree(item)
        })
      }
      return v
    }
    return res
  }

  let tempMenu = ref<{ checked: string[]; halfChecked: string[] | number[] }>({
    checked: [],
    halfChecked: [],
  })
  let treeData: Ref<any[]> = ref([])
  getMenuTree().then((res) => {
    if (res && res.length > 0) {
      treeData.value = res.map((item) => {
        return buildTree(item)
      })
    }
  })

  function buildTree(res) {
    if (res) {
      const v = {
        title: res.title,
        key: res.id,
      }
      if (res.children && res.children.length > 0) {
        v.children = res.children.map((item) => {
          return buildTree(item)
        })
      }
      return v
    }
    return res
  }

  const {
    initFormEditType,
    handleCancel,
    labelCol,
    wrapperCol,
    title: modalTile,
    confirmLoading,
    visible,
    showable,
    formOperationType,
  } = useFormEdit()

  const emits = defineEmits(['ok'])

  const rules = reactive({
    roleName: [{ required: true, message: '请输入角色名称', trigger: ['blur', 'change'] }],
    remark: [{ required: true, message: '请输入角色描述', trigger: ['blur', 'change'] }],
    dataScope: [{ required: true, message: '请输入数据权限范围', trigger: ['blur', 'change'] }],
  })

  const formRef = ref<FormInstance>()

  let formData: Ref<RoleDTO> = ref({
    roleId: '',
    roleName: '',
    remark: '',
    dataScope: null,
    dataScopeDeptIds: '',
    code: '',
  })

  /**
   * 表单初始化
   */
  function init(id, operationType: FormOperationType) {
    initFormEditType(operationType)
    resetForm()
    getInfo(id, operationType)
  }

  /**
   * 获取表单信息
   */
  async function getInfo(id, editType: FormOperationType) {
    if ([FormOperationType.EDIT, FormOperationType.SHOW].includes(editType)) {
      confirmLoading.value = true
      await get(id).then((res) => {
        formData.value = res
        tempMenu.value.checked = (res.menuId || '').split(',')
        tempDept.value.checked = (formData.value.dataScopeDeptIds || '').split(',')
      })
    }
    confirmLoading.value = false
  }

  /**
   * 保存新增或者编辑
   */
  function handleOk() {
    console.log('当前菜单id:', tempMenu.value.checked)
    formData.value.menuId = tempMenu.value.checked
      ?.filter((item) => item != null && true && item !== '')
      .join(',')
    console.log('过滤后的菜单Id:', formData.value.menuId)
    formData.value.dataScopeDeptIds = tempDept.value.checked?.join(',')

    formRef.value?.validate().then(async () => {
      confirmLoading.value = true
      if (formOperationType.value === FormOperationType.ADD) {
        await add(formData.value)
      } else if (formOperationType.value === FormOperationType.EDIT) {
        await update(formData.value)
      }
      confirmLoading.value = false
      handleCancel()
      emits('ok')
    })
  }

  /**
   * 重置表单字段
   */
  function resetForm() {
    formData = ref({
      roleId: '',
      roleName: '',
      remark: '',
      dataScope: null,
      dataScopeDeptIds: '',
      code: '',
    })
    nextTick(() => {
      formRef.value?.resetFields()
      tempDept.value?.checked?.splice(0)
      tempMenu.value?.checked?.splice(0)
    })
  }

  /**
   * 暴露子组件init方法
   */
  defineExpose({
    init,
  })
</script>

<style lang="less" scoped></style>
