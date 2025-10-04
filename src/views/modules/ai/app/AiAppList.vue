<template>
  <div class="ai-app-list">
    <div class="page-header">
      <div class="header-main">
        <div class="page-info">
          <div class="page-icon">
            <AppstoreOutlined />
          </div>
          <div class="page-details">
            <div class="page-breadcrumb">
              <span>AI 中心</span>
              <Icon :size="12" icon="ant-design:right-outlined" />
              <span class="current-page">应用</span>
            </div>
            <h1 class="page-title">应用</h1>
            <div class="page-description">创建和管理您的AI应用</div>
          </div>
        </div>
        <div class="header-actions">
          <a-button class="create-btn" size="large" type="primary" @click="handleCreate">
            <template #icon>
              <PlusOutlined />
            </template>
            创建应用
          </a-button>
        </div>
      </div>

      <div class="controls-container">
        <div class="tabs-container">
          <a-tabs
            v-model:activeKey="activeTab"
            class="app-type-tabs"
            type="card"
            @change="handleTabChange"
          >
            <a-tab-pane key="all" tab="全部">
              <template #tab>
                <span class="tab-content">
                  <AppstoreOutlined class="tab-icon" />
                  全部
                  <a-badge
                    :count="getTabCount('all')"
                    :number-style="{ backgroundColor: '#f0f2f5', color: '#595959' }"
                    class="tab-badge"
                  />
                </span>
              </template>
            </a-tab-pane>
            <a-tab-pane key="workflow" tab="工作流">
              <template #tab>
                <span class="tab-content">
                  <BranchesOutlined class="tab-icon" />
                  工作流
                  <a-badge
                    :count="getTabCount('workflow')"
                    :number-style="{ backgroundColor: '#f0f2f5', color: '#595959' }"
                    class="tab-badge"
                  />
                </span>
              </template>
            </a-tab-pane>
            <a-tab-pane key="chatflow" tab="对话流">
              <template #tab>
                <span class="tab-content">
                  <ApartmentOutlined class="tab-icon" />
                  对话流
                  <a-badge
                    :count="getTabCount('chatflow')"
                    :number-style="{ backgroundColor: '#f0f2f5', color: '#595959' }"
                    class="tab-badge"
                  />
                </span>
              </template>
            </a-tab-pane>
            <a-tab-pane key="agent" tab="Agent">
              <template #tab>
                <span class="tab-content">
                  <RobotOutlined class="tab-icon" />
                  Agent
                  <a-badge
                    :count="getTabCount('agent')"
                    :number-style="{ backgroundColor: '#f0f2f5', color: '#595959' }"
                    class="tab-badge"
                  />
                </span>
              </template>
            </a-tab-pane>
            <a-tab-pane key="chatbot" tab="聊天助手">
              <template #tab>
                <span class="tab-content">
                  <CommentOutlined class="tab-icon" />
                  聊天助手
                  <a-badge
                    :count="getTabCount('chatbot')"
                    :number-style="{ backgroundColor: '#f0f2f5', color: '#595959' }"
                    class="tab-badge"
                  />
                </span>
              </template>
            </a-tab-pane>
            <a-tab-pane key="completion" tab="文本生成">
              <template #tab>
                <span class="tab-content">
                  <ThunderboltOutlined class="tab-icon" />
                  文本生成
                  <a-badge
                    :count="getTabCount('completion')"
                    :number-style="{ backgroundColor: '#f0f2f5', color: '#595959' }"
                    class="tab-badge"
                  />
                </span>
              </template>
            </a-tab-pane>
          </a-tabs>
        </div>

        <div class="search-filter">
          <a-input-search
            v-model:value="searchValue"
            class="search-input"
            placeholder="搜索应用..."
            @search="handleSearch"
          />
          <a-select
            v-model:value="statusFilter"
            allow-clear
            class="status-filter"
            placeholder="应用状态"
            @change="handleStatusFilter"
          >
            <a-select-option value="">全部状态</a-select-option>
            <a-select-option value="draft">草稿</a-select-option>
            <a-select-option value="published">已发布</a-select-option>
            <a-select-option value="disabled">已停用</a-select-option>
          </a-select>
          <a-radio-group v-model:value="viewMode" button-style="solid" size="default">
            <a-radio-button value="grid">
              <AppstoreOutlined />
            </a-radio-button>
            <a-radio-button value="list">
              <BarsOutlined />
            </a-radio-button>
          </a-radio-group>
        </div>
      </div>
    </div>

    <!-- Content Section -->
    <div class="content-section">
      <div
        v-if="!loading && (!pagination.records || pagination.records.length === 0)"
        class="empty-state-container"
      >
        <Empty :description="false" class="empty-state">
          <template #image>
            <div class="empty-icon">
              <svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M853.333333 170.666667H170.666667c-47.146667 0-85.333333 38.186667-85.333334 85.333333v512c0 47.146667 38.186667 85.333333 85.333334 85.333333h682.666666c47.146667 0 85.333333-38.186667 85.333334-85.333333V256c0-47.146667-38.186667-85.333333-85.333334-85.333333z m-85.333333 85.333333v170.666667l-128-128-213.333333 213.333333-170.666667-170.666667-128 128V256h640z m-213.333333 298.666667c-47.146667 0-85.333333-38.186667-85.333334-85.333334s38.186667-85.333333 85.333334-85.333333 85.333333 38.186667 85.333333 85.333333-38.186667 85.333333-85.333333 85.333334z"
                  fill="#d8d8d8"
                />
              </svg>
            </div>
          </template>
          <div class="empty-content">
            <h3 class="empty-title">{{ getEmptyStateTitle() }}</h3>
            <p class="empty-description">{{ getEmptyStateDescription() }}</p>
            <a-button size="large" type="primary" @click="handleCreate">
              <template #icon>
                <PlusOutlined />
              </template>
              创建应用
            </a-button>
          </div>
        </Empty>
      </div>

      <div v-else-if="viewMode === 'grid'" class="grid-view">
        <div :class="{ loading: loading }" class="app-grid">
          <div
            v-for="(item, index) in pagination.records || []"
            :key="item?.id || index"
            class="app-card"
            @click="handleOpenApp(item)"
          >
            <!-- Card Header -->
            <div class="card-header">
              <div class="app-icon">
                <div
                  :style="{ backgroundColor: getAvatarColor(item?.name || '') }"
                  class="icon-avatar"
                >
                  {{ (item?.name || '').charAt(0).toUpperCase() }}
                </div>
              </div>
              <div class="card-actions">
                <a-dropdown :trigger="['click']" placement="bottomRight">
                  <a class="action-btn" @click.stop>
                    <MoreOutlined />
                  </a>
                  <template #overlay>
                    <a-menu>
                      <a-menu-item @click="handleEdit(item)">
                        <SettingOutlined />
                        应用设置
                      </a-menu-item>
                      <a-menu-divider />
                      <a-menu-item>
                        <a-popconfirm
                          cancel-text="取消"
                          description="此操作不可恢复，应用的所有数据将被永久删除。"
                          ok-text="确定删除"
                          ok-type="danger"
                          title="确定要删除此应用吗？"
                          @confirm="handleDelete(item)"
                          @click.stop
                        >
                          <span class="delete-action" @click.stop>
                            <DeleteOutlined />
                            删除应用
                          </span>
                        </a-popconfirm>
                      </a-menu-item>
                    </a-menu>
                  </template>
                </a-dropdown>
              </div>
            </div>

            <!-- Card Content -->
            <div class="card-content">
              <div class="app-info">
                <h3 :title="item?.name" class="app-name">
                  {{ item?.name }}
                  <span class="app-type-indicator">{{ formatMode(item?.mode || '') }}</span>
                </h3>
              </div>
              <p :title="item?.description" class="app-description">
                {{ item?.description || '暂无描述' }}
              </p>
            </div>

            <!-- Card Footer -->
            <div class="card-footer">
              <div class="meta-info">
                <span class="update-info">
                  <ClockCircleOutlined />
                  {{ formatTime(item?.updateTime || '') }}
                </span>
                <span class="creator-info">
                  <UserOutlined />
                  {{ item?.updateBy || '系统' }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- List View -->
      <div v-else class="list-view">
        <div class="list-header">
          <div class="col-name">应用</div>
          <div class="col-type">类型</div>
          <div class="col-updated">最后更新</div>
          <div class="col-actions">操作</div>
        </div>
        <div class="list-content">
          <div
            v-for="(item, index) in pagination.records || []"
            :key="item?.id || index"
            class="list-item"
            @click="handleOpenApp(item)"
          >
            <div class="col-name">
              <div class="name-cell">
                <div
                  :style="{ backgroundColor: getAvatarColor(item?.name || '') }"
                  class="app-avatar"
                >
                  {{ (item?.name || '').charAt(0).toUpperCase() }}
                </div>
                <div class="app-info">
                  <div class="app-name">{{ item?.name }}</div>
                  <div class="app-description">{{ item?.description || '暂无描述' }}</div>
                </div>
              </div>
            </div>
            <div class="col-type">
              <span class="type-indicator">{{ formatMode(item?.mode || '') }}</span>
            </div>
            <div class="col-updated">
              <div class="update-cell">
                <span class="update-time">{{ formatTime(item?.updateTime || '', true) }}</span>
              </div>
            </div>
            <div class="col-actions" @click.stop>
              <a-button size="small" type="link" @click="handleOpenApp(item)"> 打开</a-button>
              <a-dropdown :trigger="['click']">
                <a-button size="small" type="text">
                  <MoreOutlined />
                </a-button>
                <template #overlay>
                  <a-menu>
                    <a-menu-item @click="handleEdit(item)">应用设置</a-menu-item>
                    <a-menu-divider />
                    <a-menu-item>
                      <a-popconfirm
                        cancel-text="取消"
                        ok-text="确定删除"
                        ok-type="danger"
                        title="确定要删除此应用吗？"
                        @confirm="handleDelete(item)"
                        @click.stop
                      >
                        <span class="delete-action">删除应用</span>
                      </a-popconfirm>
                    </a-menu-item>
                  </a-menu>
                </template>
              </a-dropdown>
            </div>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="loading-state">
        <a-spin size="large" />
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="pagination.total > 0" class="pagination-section">
      <a-pagination
        v-model:current="pagination.current"
        v-model:pageSize="pagination.size"
        :default-page-size="30"
        :pageSizeOptions="['30']"
        :show-quick-jumper="true"
        :show-size-changer="true"
        :show-total="(total, range) => `显示 ${range[0]}-${range[1]} 条，共 ${total} 条`"
        :total="pagination.total"
        @change="onPageChange"
        @show-size-change="onPageChange"
      />
    </div>

    <!-- Modals -->
    <AiAppCreateModal ref="createModal" @ok="handleCreateSuccess" />
    <AiAppEdit ref="aiAppEdit" @ok="queryPage" />
  </div>
</template>

<script lang="ts" setup>
  import { onMounted, ref } from 'vue'
  import { useRouter } from 'vue-router'
  import { Empty, message } from 'ant-design-vue'
  import {
    ApartmentOutlined,
    AppstoreOutlined,
    BarsOutlined,
    BranchesOutlined,
    ClockCircleOutlined,
    CommentOutlined,
    DeleteOutlined,
    MoreOutlined,
    PlusOutlined,
    RobotOutlined,
    SettingOutlined,
    ThunderboltOutlined,
    UserOutlined,
  } from '@ant-design/icons-vue'
  import { Icon } from '/@/components/Icon'
  import useTablePage from '/@/hooks/art/useTablePage'
  import { del, page } from '/@/api/ai/app/AiAppIndex'
  import { FormOperationType } from '/@/enums/formOperationType'
  import AiAppCreateModal from './AiAppCreateModal.vue'
  import AiAppEdit from './AiAppEdit.vue'

  const router = useRouter()
  const { pageQueryResHandel, pagination, model, loading } = useTablePage(queryPage)

  const createModal = ref()
  const aiAppEdit = ref()
  const viewMode = ref('grid')
  const searchValue = ref('')
  const statusFilter = ref('')
  const activeTab = ref('all')

  onMounted(() => {
    queryPage()
  })

  /**
   * 分页查询
   */
  function queryPage() {
    loading.value = true
    const params: any = {
      ...model.queryParam,
      ...model.pages,
    }

    params.size = 30

    // 应用名
    if (searchValue.value) {
      params.name = searchValue.value
    }

    // 状态
    if (statusFilter.value) {
      params.status = statusFilter.value
    }

    // 类型
    if (activeTab.value && activeTab.value != 'all') {
      params.mode = activeTab.value
    }

    page(params)
      .then((res) => {
        pageQueryResHandel(res)
      })
      .finally(() => {
        loading.value = false
      })
  }

  /**
   * 分页变动
   */
  function onPageChange(current, size) {
    model.pages.current = current
    model.pages.size = size
    queryPage()
  }

  /**
   * 搜索
   */
  function handleSearch() {
    model.pages.current = 1
    queryPage()
  }

  /**
   * Tab切换
   */
  function handleTabChange(key: string) {
    activeTab.value = key
    queryPage()
  }

  /**
   * 状态筛选
   */
  function handleStatusFilter(s) {
    statusFilter.value = s
  }

  /**
   * 获取Tab下的应用数量
   */
  function getTabCount(tabKey: string) {
    console.log('pagination:{}', pagination)
    if (!pagination.records) return 0

    if (tabKey === 'all') {
      return pagination.records.length
    }

    return pagination.records.filter((app: any) => app?.mode === tabKey).length
  }

  /**
   * 获取空状态标题
   */
  function getEmptyStateTitle() {
    if (activeTab.value === 'all') {
      return searchValue.value ? '没有找到匹配的应用' : '还没有应用'
    }

    const typeNames = {
      chatbot: '聊天助手',
      completion: '文本生成',
      agent: 'Agent',
      chatflow: '对话流',
      workflow: '工作流',
    }

    return `还没有${typeNames[activeTab.value] || ''}应用`
  }

  /**
   * 获取空状态描述
   */
  function getEmptyStateDescription() {
    if (searchValue.value) {
      return '尝试调整搜索条件或创建新的应用'
    }

    if (activeTab.value === 'all') {
      return '创建您的第一个AI应用，开始构建智能工作流'
    }

    const typeDescriptions = {
      chatbot: '创建聊天助手应用，提供智能对话服务',
      completion: '创建文本生成应用，处理各种文本任务',
      agent: '创建Agent应用，自主完成复杂任务',
      chatflow: '创建对话流应用，构建复杂的对话逻辑',
      workflow: '创建工作流应用，实现自动化处理',
    }

    return typeDescriptions[activeTab.value] || '创建新的应用开始使用'
  }

  /**
   * 新建应用
   */
  function handleCreate() {
    createModal.value?.init()
  }

  /**
   * 应用创建成功后的回调
   */
  function handleCreateSuccess(appId: string) {
    queryPage()
    // 应用创建成功后，打开编辑页面进行详细配置
    if (appId) {
      aiAppEdit.value?.init(appId, FormOperationType.EDIT)
    }
  }

  /**
   * 编辑应用
   */
  function handleEdit(item: any) {
    aiAppEdit.value?.init(item?.id, FormOperationType.EDIT)
  }

  /**
   * 删除应用
   */
  function handleDelete(item: any) {
    del(item?.id).then(() => {
      message.success('删除成功')
      queryPage()
    })
  }

  /**
   * 打开应用
   */
  function handleOpenApp(item: any) {
    if (item?.mode === 'workflow') {
      // 工作流类型应用跳转到工作流页面，传递应用ID和类型
      router.push({
        path: '/ai/workflow',
        query: {
          appId: item.id,
          appMode: item.mode,
        },
      })
    } else {
      message.info(`正在打开应用: ${item?.name}`)
      // TODO: 其他类型应用的跳转逻辑
    }
  }

  /**
   * 格式化应用类型显示
   */
  function formatMode(mode: string) {
    const map = {
      chatbot: '聊天助手',
      completion: '文本生成',
      agent: 'Agent',
      chatflow: '对话流',
      workflow: '工作流',
    }
    return map[mode] || '未知类型'
  }

  /**
   * 格式化时间
   */
  function formatTime(time: string, isList = false) {
    if (!time) return ''
    const date = new Date(time)

    if (isList) {
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    }

    const now = new Date()
    const diff = now.getTime() - date.getTime()

    const minute = 60 * 1000
    const hour = 60 * minute
    const day = 24 * hour

    if (diff < hour) {
      const minutes = Math.floor(diff / minute)
      return minutes < 1 ? '刚刚' : `${minutes}分钟前`
    } else if (diff < day) {
      const hours = Math.floor(diff / hour)
      return `${hours}小时前`
    } else if (diff < 7 * day) {
      const days = Math.floor(diff / day)
      return `${days}天前`
    } else {
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    }
  }

  /**
   * 生成头像颜色
   */
  function getAvatarColor(name: string) {
    if (!name) return '#1890ff'
    const colors = [
      '#1890ff',
      '#722ed1',
      '#13c2c2',
      '#52c41a',
      '#fa8c16',
      '#f5222d',
      '#eb2f96',
      '#096dd9',
      '#389e0d',
      '#d48806',
    ]
    let hash = 0
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash)
    }
    return colors[Math.abs(hash) % colors.length]
  }
</script>

<style lang="less" scoped>
  .ai-app-list {
    min-height: 100vh;
    background: #f5f7fa;

    .page-header {
      background: #fafbfc;
      border-bottom: 1px solid #e8e8e8;
      padding: 24px 32px;
      position: sticky;
      top: 0;
      z-index: 10;

      .header-main {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;

        .page-info {
          display: flex;
          align-items: center;
          gap: 16px;

          .page-icon {
            width: 48px;
            height: 48px;
            background: #f0f2f5;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #595959;
            border: 1px solid #e8e8e8;
            font-size: 20px;
          }

          .page-details {
            .page-breadcrumb {
              display: flex;
              align-items: center;
              gap: 6px;
              color: #8c8c8c;
              font-size: 12px;
              margin-bottom: 4px;

              .current-page {
                color: #1890ff;
                font-weight: 500;
              }
            }

            .page-title {
              color: #262626;
              font-size: 20px;
              font-weight: 600;
              margin: 0 0 6px 0;
              line-height: 1.3;
            }

            .page-description {
              color: #8c8c8c;
              font-size: 13px;
              line-height: 1.5;
            }
          }
        }

        .page-subtitle {
          font-size: 14px;
          color: #86909c;
          margin: 0;
        }

        .header-actions {
          .create-btn {
            height: 36px;
            padding: 0 20px;
            font-size: 14px;
            border-radius: 6px;
          }
        }
      }

      .controls-container {
        display: flex;
        justify-content: space-between;
        align-items: center;

        .tabs-container {
          flex: 1;

          :deep(.app-type-tabs) {
            .ant-tabs-nav {
              margin-bottom: 0;

              .ant-tabs-tab {
                padding: 8px 16px;
                border-radius: 6px;
                border: none;
                background: transparent;
                transition: background-color 0.3s;

                .tab-content {
                  display: flex;
                  align-items: center;
                  gap: 8px;
                  font-size: 14px;
                  color: #4e5969;

                  .tab-icon {
                    font-size: 16px;
                  }

                  .tab-badge {
                    :deep(.ant-badge-count) {
                      min-width: 18px;
                      height: 18px;
                      line-height: 18px;
                      font-size: 12px;
                      padding: 0 5px;
                      border-radius: 9px;
                      border: none;
                      font-weight: 500;
                    }
                  }
                }

                &.ant-tabs-tab-active {
                  background: #e6f7ff;

                  .tab-content {
                    color: #1677ff;

                    .tab-badge {
                      :deep(.ant-badge-count) {
                        background: #1677ff;
                        color: #fff;
                      }
                    }
                  }
                }

                &:hover:not(.ant-tabs-tab-active) {
                  background: #f0f2f5;
                }
              }
            }

            .ant-tabs-ink-bar {
              display: none;
            }

            .ant-tabs-content-holder {
              display: none;
            }
          }
        }

        .search-filter {
          display: flex;
          align-items: center;
          gap: 12px;

          .search-input {
            width: 240px;
          }

          .status-filter {
            width: 120px;
          }

          .ant-radio-group {
            .ant-radio-button-wrapper {
              border-radius: 6px;
              border: 1px solid #d9d9d9;

              &:first-child {
                border-radius: 6px 0 0 6px;
              }

              &:last-child {
                border-radius: 0 6px 6px 0;
              }

              &.ant-radio-button-wrapper-checked {
                border-color: #1677ff;
              }
            }
          }
        }
      }
    }

    .content-section {
      padding: 24px 32px;
      min-height: 400px;

      .empty-state-container {
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 400px;

        .empty-state {
          text-align: center;

          .empty-icon {
            font-size: 64px;
            color: #d9d9d9;
            margin-bottom: 24px;
            width: 120px;
            height: 120px;

            svg {
              width: 100%;
              height: 100%;
            }
          }

          .empty-content {
            .empty-title {
              font-size: 18px;
              font-weight: 500;
              color: #262626;
              margin-bottom: 8px;
            }

            .empty-description {
              font-size: 14px;
              color: #8c8c8c;
              margin-bottom: 24px;
            }
          }
        }
      }

      .loading-state {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 200px;
      }

      // Grid View Styles
      .grid-view {
        .app-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px;

          &.loading {
            opacity: 0.6;
            pointer-events: none;
          }

          .app-card {
            background: #fff;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 16px;
            cursor: pointer;
            transition: all 0.15s ease;
            min-height: 160px;
            display: flex;
            flex-direction: column;
            position: relative;

            &:hover {
              border-color: #d1d5db;
              box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            }

            .card-header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 12px;

              .app-icon {
                .icon-avatar {
                  width: 40px;
                  height: 40px;
                  border-radius: 6px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  color: #fff;
                  font-size: 16px;
                  font-weight: 600;
                }
              }

              .card-actions {
                .action-btn {
                  width: 24px;
                  height: 24px;
                  border-radius: 4px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  color: #9ca3af;
                  background: transparent;
                  border: none;
                  transition: all 0.15s ease;
                  text-decoration: none;
                  opacity: 1;

                  &:hover {
                    background: #f3f4f6;
                    color: #6b7280;
                  }
                }
              }
            }

            .card-content {
              flex: 1;
              margin-bottom: 12px;

              .app-info {
                margin-bottom: 8px;

                .app-name {
                  font-size: 15px;
                  font-weight: 600;
                  color: #111827;
                  margin: 0 0 6px 0;
                  line-height: 1.3;
                  display: -webkit-box;
                  -webkit-line-clamp: 1;
                  -webkit-box-orient: vertical;
                  overflow: hidden;
                  display: flex;
                  align-items: center;
                  gap: 8px;

                  .app-type-indicator {
                    font-size: 11px;
                    font-weight: 500;
                    color: #6b7280;
                    background: #f3f4f6;
                    padding: 2px 6px;
                    border-radius: 3px;
                    white-space: nowrap;
                    flex-shrink: 0;
                    opacity: 0.8;
                  }
                }
              }

              .app-description {
                font-size: 13px;
                color: #6b7280;
                line-height: 1.4;
                margin: 0;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
                min-height: 36px;
              }
            }

            .card-footer {
              border-top: 1px solid #f3f4f6;
              padding-top: 12px;
              display: flex;
              justify-content: space-between;
              align-items: flex-end;

              .meta-info {
                display: flex;
                flex-direction: column;
                gap: 4px;
                flex: 1;

                .update-info,
                .creator-info {
                  font-size: 11px;
                  color: #9ca3af;
                  display: flex;
                  align-items: center;
                  gap: 4px;

                  .anticon {
                    font-size: 11px;
                  }
                }
              }

              .app-status {
                display: flex;
                align-items: center;
                gap: 6px;

                .status-dot {
                  width: 6px;
                  height: 6px;
                  border-radius: 50%;
                  background: #10b981;
                }

                .status-text {
                  font-size: 11px;
                  color: #6b7280;
                  font-weight: 500;
                }
              }
            }
          }
        }
      }

      // List View Styles
      .list-view {
        .list-header {
          display: grid;
          grid-template-columns: 3fr 1fr 1fr 1.5fr 1fr;
          gap: 16px;
          padding: 12px 24px;
          background: #fafafa;
          border-bottom: 1px solid #f0f0f0;
          font-size: 13px;
          color: #595959;
        }

        .list-content {
          .list-item {
            display: grid;
            grid-template-columns: 3fr 1fr 1fr 1.5fr 1fr;
            gap: 16px;
            padding: 16px 24px;
            background: #fff;
            border-bottom: 1px solid #f0f0f0;
            cursor: pointer;
            transition: background-color 0.2s;

            &:hover {
              background: #f7f8fa;
            }

            .col-name {
              .name-cell {
                display: flex;
                align-items: center;
                gap: 16px;

                .app-avatar {
                  width: 48px;
                  height: 48px;
                  border-radius: 8px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  color: #fff;
                  font-size: 20px;
                  font-weight: 500;
                }

                .app-info {
                  display: flex;
                  flex-direction: column;

                  .app-name {
                    font-size: 14px;
                    font-weight: 500;
                    color: #262626;
                    margin-bottom: 4px;
                  }

                  .app-description {
                    font-size: 13px;
                    color: #8c8c8c;
                    display: -webkit-box;
                    -webkit-line-clamp: 1;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                  }
                }
              }
            }

            .col-type {
              display: flex;
              align-items: center;

              .type-indicator {
                font-size: 12px;
                color: #6b7280;
                background: #f3f4f6;
                padding: 2px 6px;
                border-radius: 3px;
                font-weight: 500;
                opacity: 0.8;
              }
            }

            .col-status {
              display: flex;
              align-items: center;
              gap: 8px;

              .status-dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
              }

              span {
                font-size: 13px;
                color: #595959;
              }
            }

            .col-updated {
              display: flex;
              align-items: center;

              .update-cell {
                .update-time {
                  font-size: 13px;
                  color: #595959;
                }
              }
            }

            .col-actions {
              display: flex;
              align-items: center;
              gap: 8px;
            }
          }
        }
      }
    }

    .pagination-section {
      max-width: 1200px;
      margin: 0 auto;
      padding: 24px;
      display: flex;
      justify-content: flex-end;
    }

    // Menu styles
    :deep(.ant-dropdown-menu) {
      .delete-action {
        color: #ff4d4f;
      }
    }
  }

  // Responsive
  @media (max-width: 992px) {
    .ai-app-list {
      .page-header {
        padding: 20px;

        .header-main {
          margin-bottom: 16px;
        }

        .controls-container {
          flex-direction: column;
          align-items: stretch;
          gap: 16px;

          .search-filter {
            width: 100%;
          }
        }
      }

      .content-section {
        padding: 20px;
      }
    }
  }

  @media (max-width: 768px) {
    .ai-app-list {
      .page-header {
        padding: 16px;

        .header-main {
          flex-direction: column;
          align-items: flex-start;
          gap: 12px;
        }
      }

      .content-section {
        padding: 16px;

        .grid-view .app-grid {
          grid-template-columns: 1fr;
          gap: 12px;

          .app-card {
            padding: 14px;
            min-height: 140px;

            .card-header {
              margin-bottom: 10px;

              .app-icon .icon-avatar {
                width: 36px;
                height: 36px;
                font-size: 14px;
              }
            }

            .card-content {
              margin-bottom: 10px;

              .app-info {
                margin-bottom: 6px;

                .app-name {
                  font-size: 14px;

                  .app-type-indicator {
                    font-size: 10px;
                    padding: 1px 4px;
                  }
                }
              }

              .app-description {
                font-size: 12px;
                min-height: 32px;
              }
            }

            .card-footer {
              padding-top: 10px;

              .meta-info {
                gap: 3px;

                .update-info,
                .creator-info {
                  font-size: 10px;

                  .anticon {
                    font-size: 10px;
                  }
                }
              }

              .app-status {
                .status-dot {
                  width: 5px;
                  height: 5px;
                }

                .status-text {
                  font-size: 10px;
                }
              }
            }
          }
        }

        .list-view {
          .list-header {
            display: none;
          }

          .list-content .list-item {
            grid-template-columns: 1fr;
            gap: 12px;
            padding: 16px;

            .col-type,
            .col-status,
            .col-updated {
              justify-content: flex-start;
            }
          }
        }
      }

      .pagination-section {
        justify-content: center;
      }
    }
  }
</style>
