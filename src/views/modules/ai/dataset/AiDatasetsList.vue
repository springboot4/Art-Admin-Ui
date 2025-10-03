<template>
  <div class="ai-app-list">
    <div class="page-header">
      <div class="header-main">
        <div>
          <h1 class="page-title">知识库</h1>
        </div>
        <div class="header-actions">
          <a-button class="create-btn" size="large" type="primary" @click="handleCreate">
            <template #icon>
              <PlusOutlined />
            </template>
            创建知识库
          </a-button>
        </div>
      </div>

      <div class="controls-container">
        <div class="search-filter">
          <a-input-search
            v-model:value="searchValue"
            class="search-input"
            placeholder="搜索知识库..."
            @search="handleSearch"
          />
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
            <h3 class="empty-title">没有找到知识库</h3>
            <p class="empty-description">尝试创建新知识库</p>
            <a-button size="large" type="primary" @click="handleCreate">
              <template #icon>
                <PlusOutlined />
              </template>
              创建知识库
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
            @click="handleOpen(item)"
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
                        知识库设置
                      </a-menu-item>
                      <a-menu-divider />
                      <a-menu-item>
                        <a-popconfirm
                          cancel-text="取消"
                          description="此操作不可恢复，知识库的所有数据将被永久删除。"
                          ok-text="确定删除"
                          ok-type="danger"
                          title="确定要删除吗？"
                          @confirm="handleDelete(item)"
                          @click.stop
                        >
                          <span class="delete-action" @click.stop>
                            <DeleteOutlined />
                            删除知识库
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
                <h3 :title="item?.name" class="app-name">{{ item?.name }}</h3>
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
    <AiDatasetCreateModal ref="createModal" @ok="handleCreateSuccess" />
    <AiDatasetsEdit ref="aiAppEdit" @ok="queryPage" />
  </div>
</template>

<script lang="ts" setup>
  import { onMounted, ref } from 'vue'
  import { useRouter } from 'vue-router'
  import { Empty, message } from 'ant-design-vue'
  import {
    ClockCircleOutlined,
    DeleteOutlined,
    MoreOutlined,
    PlusOutlined,
    SettingOutlined,
    UserOutlined,
  } from '@ant-design/icons-vue'
  import useTablePage from '/@/hooks/art/useTablePage'
  import { del, page } from '/@/api/ai/dataset/AiDataSetIndex'
  import { FormOperationType } from '/@/enums/formOperationType'
  import AiDatasetCreateModal from './AiDatasetCreateModal.vue'
  import AiDatasetsEdit from './AiDatasetsEdit.vue'

  const router = useRouter()
  const { pageQueryResHandel, pagination, model, loading } = useTablePage(queryPage)

  const createModal = ref()
  const aiAppEdit = ref()
  const viewMode = ref('grid')
  const searchValue = ref('')

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

    if (searchValue.value) {
      params.name = searchValue.value
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
   * 新建
   */
  function handleCreate() {
    createModal.value?.init()
  }

  /**
   * 创建成功后的回调
   */
  function handleCreateSuccess() {
    queryPage()
  }

  /**
   * 编辑
   */
  function handleEdit(item: any) {
    aiAppEdit.value?.init(item?.id, FormOperationType.EDIT)
  }

  /**
   * 删除
   */
  function handleDelete(item: any) {
    del(item?.id).then(() => {
      message.success('删除成功')
      queryPage()
    })
  }

  /**
   * 打开
   */
  function handleOpen(item: any) {
    router.push({
      path: '/ai/document',
      query: {
        datasetId: item.id,
        datasetName: item.name,
      },
    })
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
      background: #fff;
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

        .page-title {
          font-size: 24px;
          font-weight: 600;
          color: #1d2129;
          margin: 0 0 4px 0;
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
                }

                .app-type-tag {
                  font-size: 11px;
                  font-weight: 500;
                  border-radius: 4px;
                  border: none;
                  color: #fff;
                  padding: 2px 6px;
                  display: inline-block;
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

              .ant-tag {
                font-size: 12px;
                border-radius: 4px;
                border: none;
                padding: 2px 8px;
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
