<template>
  <a-drawer
    :mask="true"
    :mask-closable="true"
    :title="`编辑节点 - ${node?.label || ''}`"
    :visible="visible || false"
    placement="right"
    width="500"
    @close="handleClose"
  >
    <div v-if="node">
      <a-form layout="vertical">
        <!-- 基础信息 -->
        <a-divider orientation="left">基础信息</a-divider>
        <a-form-item label="节点名称">
          <a-input v-model:value="editData.label" placeholder="请输入节点名称" />
        </a-form-item>
        <a-form-item label="节点描述">
          <a-textarea
            v-model:value="editData.data.description"
            :rows="3"
            placeholder="请输入节点描述..."
          />
        </a-form-item>

        <!-- 节点配置 -->
        <a-divider orientation="left">节点配置</a-divider>

        <!-- 开始节点配置用户输入变量 -->
        <template v-if="editData.data.nodeType === 'start'">
          <a-form-item label="用户输入变量">
            <div class="user-input-config">
              <div
                v-for="(input, index) in editData.data.config.userInputs || []"
                :key="`input_${index}`"
                class="user-input-item"
              >
                <div class="input-header">
                  <span class="input-label">输入项 {{ index + 1 }}</span>
                  <a-button danger size="small" type="text" @click="removeUserInput(index)">
                    删除
                  </a-button>
                </div>
                <a-form-item :class="{ 'mb-2': true }" label="变量名">
                  <a-input v-model:value="input.name" placeholder="变量名，如：userName" />
                </a-form-item>
                <a-form-item :class="{ 'mb-2': true }" label="显示名称">
                  <a-input v-model:value="input.displayName" placeholder="用户看到的名称" />
                </a-form-item>
                <a-form-item :class="{ 'mb-2': true }" label="数据类型">
                  <a-select v-model:value="input.dataType" placeholder="选择数据类型">
                    <a-select-option value="string">文本</a-select-option>
                    <a-select-option value="number">数字</a-select-option>
                    <a-select-option value="boolean">布尔值</a-select-option>
                  </a-select>
                </a-form-item>
                <a-form-item label="描述">
                  <a-textarea
                    v-model:value="input.description"
                    :rows="2"
                    placeholder="变量描述..."
                  />
                </a-form-item>
                <a-form-item>
                  <a-checkbox v-model:checked="input.required">必填</a-checkbox>
                </a-form-item>
              </div>
              <a-button block class="mt-3" type="dashed" @click="addUserInput">
                <template #icon>
                  <PlusOutlined />
                </template>
                添加用户输入变量
              </a-button>
            </div>
          </a-form-item>
        </template>

        <!-- LLM 节点特殊配置 -->
        <template v-if="isLLMNode">
          <!-- 模型配置卡片 -->
          <a-card class="config-card" size="small" title="模型配置">
            <a-row :gutter="16">
              <a-col :span="12">
                <a-form-item label="模型选择">
                  <a-select
                    v-model:value="editData.data.config.model"
                    :loading="modelOptionsLoading"
                    :options="modelSelectOptions"
                    allow-clear
                    optionFilterProp="label"
                    placeholder="选择AI模型"
                    show-search
                    @dropdownVisibleChange="(open) => open && loadModelOptions()"
                  />
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="最大Token数">
                  <a-input-number
                    v-model:value="editData.data.config.maxTokens"
                    :max="4096"
                    :min="1"
                    placeholder="1024"
                    style="width: 100%"
                  />
                </a-form-item>
              </a-col>
            </a-row>
            <a-form-item label="Temperature">
              <a-slider
                v-model:value="editData.data.config.temperature"
                :marks="{ 0: '保守', 1: '平衡', 2: '创意' }"
                :max="2"
                :min="0"
                :step="0.1"
              />
            </a-form-item>
          </a-card>

          <!-- 记忆配置卡片 (仅对话流模式) -->
          <a-card v-if="isConversationMode" class="config-card" size="small" title="记忆配置">
            <template #extra>
              <a-switch
                v-model:checked="editData.data.config.memory.enabled"
                checked-children="开"
                size="small"
                un-checked-children="关"
              />
            </template>
            <div v-if="editData.data.config.memory.enabled" class="memory-config-content">
              <a-form-item label="历史消息窗口大小">
                <a-input-number
                  v-model:value="editData.data.config.memory.window.size"
                  :max="100"
                  :min="1"
                  placeholder="10"
                  style="width: 100%"
                />
                <div class="memory-help-text">
                  <Icon :size="12" icon="ant-design:info-circle-outlined" />
                  设置保留的历史消息条数，默认 10 条
                </div>
              </a-form-item>
            </div>
            <div v-else class="memory-disabled-hint">
              <a-empty
                :image="false"
                description="记忆功能未启用，开启后将保留历史对话上下文"
                size="small"
              />
            </div>
          </a-card>

          <!-- 系统提示词配置卡片 -->
          <a-card class="config-card" size="small" title="系统提示词">
            <template #extra>
              <a-tag v-if="editData.data.config.systemPrompt" color="blue" size="small">
                {{ editData.data.config.systemPrompt.length }} 字符
              </a-tag>
            </template>
            <EnhancedTextEditor
              v-model:referenceParameters="editData.data.config.referenceParameters"
              v-model:value="editData.data.config.systemPrompt"
              :default-rows="6"
              :edges="edges"
              :max-rows="20"
              :min-rows="4"
              :node-id="editData.id"
              :nodes="nodes"
              :show-format-button="true"
              placeholder="你是一个有用的AI助手，请根据用户输入提供准确和有帮助的回答。&#10;&#10;请遵循以下原则：&#10;1. 准确性：提供正确和可靠的信息&#10;2. 有用性：确保回答对用户有实际帮助&#10;3. 清晰性：使用简洁明了的语言表达"
            />
          </a-card>

          <!-- 用户消息配置卡片 -->
          <a-card class="config-card" size="small" title="用户消息">
            <template #extra>
              <a-tag
                v-if="editData.data.config.messages && editData.data.config.messages.length > 0"
                color="green"
                size="small"
              >
                {{ editData.data.config.messages.length }} 条消息
              </a-tag>
            </template>
            <ConversationMessages
              v-model:referenceParameters="editData.data.config.referenceParameters"
              v-model:value="editData.data.config.messages"
              :edges="edges"
              :node-id="editData.id"
              :nodes="nodes"
              :referenceParameters="editData.data.config.referenceParameters"
            />
          </a-card>

          <!-- 结构化输出配置卡片 -->
          <a-card
            v-if="supportsStructuredOutput"
            class="config-card"
            size="small"
            title="结构化输出"
          >
            <template #extra>
              <a-switch
                v-model:checked="editData.data.config.structuredOutput.enabled"
                checked-children="开"
                size="small"
                un-checked-children="关"
              />
            </template>
            <div v-if="editData.data.config.structuredOutput.enabled">
              <div class="structured-output-help">
                <a-alert
                  :closable="false"
                  message="让 AI 返回结构化的 JSON 数据，而不是自由文本"
                  type="info"
                />
              </div>
              <StructuredOutputEditor
                v-model:value="editData.data.config.structuredOutput"
                class="mt-3"
              />
            </div>
            <div v-else class="structured-output-disabled-hint">
              <a-empty
                :image="false"
                description="启用后可以让 AI 返回格式化的 JSON 数据，方便后续节点使用"
                size="small"
              />
            </div>
          </a-card>
        </template>

        <!-- HTTP 节点特殊配置 -->
        <template v-if="editData.data.nodeType === 'http'">
          <a-form-item label="引用变量">
            <div class="http-variable-selector-wrapper">
              <VariableSelector
                v-model:referenceParameters="editData.data.config.referenceParameters"
                :edges="edges"
                :multiple="true"
                :node-id="editData.id"
                :nodes="nodes"
                :value="''"
                class="http-variable-selector"
                placeholder="点击选择要在HTTP节点中使用的变量..."
                readonly
              />
            </div>
          </a-form-item>

          <a-form-item label="请求方法">
            <a-select
              v-model:value="editData.data.config.method"
              placeholder="选择HTTP方法"
              @change="onHttpMethodChange"
            >
              <a-select-option value="GET">GET</a-select-option>
              <a-select-option value="POST">POST</a-select-option>
              <a-select-option value="PUT">PUT</a-select-option>
              <a-select-option value="DELETE">DELETE</a-select-option>
            </a-select>
          </a-form-item>

          <a-form-item label="请求URL">
            <a-input
              v-model:value="editData.data.config.url"
              placeholder="https://api.example.com/endpoint?param={{nodeId.paramName}}"
            />
          </a-form-item>

          <!-- HTTP配置标签页 -->
          <a-form-item :colon="false" label=" ">
            <a-tabs
              :activeKey="httpActiveTab"
              size="small"
              type="card"
              @update:activeKey="(key) => (httpActiveTab = key)"
            >
              <!-- Params 标签页 -->
              <a-tab-pane key="params" tab="Params">
                <SimpleKeyValueEditor
                  :value="
                    Array.isArray(editData.data.config.params) ? editData.data.config.params : []
                  "
                  placeholder-key="参数名"
                  placeholder-value="参数值，如：{{nodeId.paramName}}"
                  title="参数"
                  @update:value="(val) => (editData.data.config.params = val)"
                />
              </a-tab-pane>

              <!-- Headers 标签页 -->
              <a-tab-pane key="headers" tab="Headers">
                <SimpleKeyValueEditor
                  :value="
                    Array.isArray(editData.data.config.headers) ? editData.data.config.headers : []
                  "
                  placeholder-key="请求头名称"
                  placeholder-value="请求头值，如：{{nodeId.paramName}}"
                  title="请求头"
                  @update:value="(val) => (editData.data.config.headers = val)"
                />
              </a-tab-pane>

              <!-- Body 标签页 (仅POST/PUT显示) -->
              <a-tab-pane
                v-if="['POST', 'PUT'].includes(editData.data.config.method)"
                key="body"
                tab="Body"
              >
                <div class="body-config">
                  <!-- Body类型选择 -->
                  <div class="body-type-selector mb-3">
                    <a-radio-group
                      :value="editData.data.config.body?.type || 'none'"
                      @change="onBodyTypeChange"
                    >
                      <a-radio-button value="none">None</a-radio-button>
                      <a-radio-button value="form-urlencoded">form-urlencoded</a-radio-button>
                      <a-radio-button value="json">JSON</a-radio-button>
                    </a-radio-group>
                  </div>

                  <!-- form-urlencoded Body -->
                  <div v-if="editData.data.config.body?.type === 'form-urlencoded'">
                    <SimpleKeyValueEditor
                      :value="
                        Array.isArray(editData.data.config.body?.formData)
                          ? editData.data.config.body.formData
                          : []
                      "
                      placeholder-key="字段名"
                      placeholder-value="字段值，如：{{nodeId.paramName}}"
                      title="表单数据"
                      @update:value="(val) => (editData.data.config.body.formData = val)"
                    />
                  </div>

                  <!-- JSON Body -->
                  <div v-if="editData.data.config.body?.type === 'json'">
                    <SimpleJsonEditor
                      :value="editData.data.config.body?.jsonData || ''"
                      placeholder='{\n  "key": "value",\n  "data": "{{nodeId.paramName}}"\n}'
                      @update:value="(val) => (editData.data.config.body.jsonData = val)"
                    />
                  </div>
                </div>
              </a-tab-pane>
            </a-tabs>
          </a-form-item>
        </template>

        <!-- 条件节点特殊配置 -->
        <template v-if="editData.data.nodeType === 'condition'">
          <a-form-item label="条件配置">
            <div class="condition-list">
              <div
                v-for="(condition, index) in editData.data.config.conditions"
                :key="condition.id"
                class="condition-item"
              >
                <div class="condition-header">
                  <span class="condition-label">{{ condition.label }}</span>
                  <a-button
                    v-if="condition.id !== 'else' && editData.data.config.conditions.length > 2"
                    danger
                    size="small"
                    type="text"
                    @click="removeCondition(index)"
                  >
                    删除
                  </a-button>
                </div>
                <a-form-item :class="{ 'mb-2': true }" label="条件表达式">
                  <VariableSelector
                    v-if="condition.id !== 'else'"
                    v-model:referenceParameters="editData.data.config.referenceParameters"
                    v-model:value="condition.expression"
                    :edges="edges"
                    :node-id="editData.id"
                    :nodes="nodes"
                    placeholder="例如: ${score} > 0.8"
                  />
                  <a-input
                    v-else
                    v-model:value="condition.expression"
                    disabled
                    placeholder="默认分支（自动为 else）"
                  />
                </a-form-item>
                <a-form-item label="分支说明">
                  <a-textarea
                    v-model:value="condition.description"
                    :rows="2"
                    placeholder="描述此分支的用途..."
                  />
                </a-form-item>
              </div>
              <a-button block class="mt-3" type="dashed" @click="addCondition">
                <template #icon>
                  <PlusOutlined />
                </template>
                添加条件分支
              </a-button>
            </div>
          </a-form-item>
        </template>

        <!-- 代码节点特殊配置 -->
        <template v-if="editData.data.nodeType === 'code'">
          <a-form-item label="代码编辑器">
            <CodeEditor
              v-model:referenceParameters="editData.data.config.referenceParameters"
              v-model:value="editData.data.config.code"
              :edges="edges"
              :node-id="editData.id"
              :nodes="nodes"
            />
          </a-form-item>
        </template>

        <!-- 知识检索节点配置 -->
        <template v-if="editData.data.nodeType === 'knowledge'">
          <!-- 数据集选择卡片 -->
          <a-card class="config-card" size="small" title="数据集配置">
            <template #extra>
              <a-tag
                v-if="editData.data.config.datasetIds && editData.data.config.datasetIds.length > 0"
                color="blue"
                size="small"
              >
                {{ editData.data.config.datasetIds.length }} 个数据集
              </a-tag>
            </template>
            <a-form-item label="选择数据集">
              <a-select
                v-model:value="editData.data.config.datasetIds"
                :loading="datasetsLoading"
                mode="multiple"
                placeholder="请选择要检索的数据集"
                show-search
                style="width: 100%"
                @focus="loadDatasets"
              >
                <a-select-option
                  v-for="dataset in availableDatasets"
                  :key="dataset.id"
                  :value="dataset.id"
                >
                  <div class="dataset-option">
                    <span class="dataset-name">{{ dataset.name }}</span>
                    <span v-if="dataset.description" class="dataset-desc">{{
                      dataset.description
                    }}</span>
                  </div>
                </a-select-option>
              </a-select>
            </a-form-item>
          </a-card>

          <!-- 检索配置卡片 -->
          <a-card class="config-card" size="small" title="检索配置">
            <a-form-item label="检索类型">
              <div class="retrieval-type-selector">
                <a-radio-group v-model:value="selectedRetrievalType" class="retrieval-radio-group">
                  <div class="retrieval-options">
                    <div
                      :class="[
                        'retrieval-option',
                        {
                          active: selectedRetrievalType === 'vector',
                        },
                      ]"
                    >
                      <a-radio value="vector">
                        <div class="option-content">
                          <div class="option-icon vector">
                            <DatabaseOutlined />
                          </div>
                          <div class="option-info">
                            <div class="option-title">向量检索</div>
                            <div class="option-desc">语义相似度</div>
                          </div>
                        </div>
                      </a-radio>
                    </div>

                    <div
                      :class="[
                        'retrieval-option',
                        {
                          active: selectedRetrievalType === 'graph',
                        },
                      ]"
                    >
                      <a-radio value="graph">
                        <div class="option-content">
                          <div class="option-icon graph">
                            <ShareAltOutlined />
                          </div>
                          <div class="option-info">
                            <div class="option-title">图谱检索</div>
                            <div class="option-desc">关系图谱</div>
                          </div>
                        </div>
                      </a-radio>
                    </div>

                    <div
                      :class="[
                        'retrieval-option',
                        {
                          active: selectedRetrievalType === 'qa',
                        },
                      ]"
                    >
                      <a-radio value="qa">
                        <div class="option-content">
                          <div class="option-icon qa">
                            <Icon :size="16" icon="ant-design:question-circle-outlined" />
                          </div>
                          <div class="option-info">
                            <div class="option-title">QA检索</div>
                            <div class="option-desc">问答对</div>
                          </div>
                        </div>
                      </a-radio>
                    </div>

                    <div
                      :class="[
                        'retrieval-option',
                        {
                          active: selectedRetrievalType === 'hybrid',
                        },
                      ]"
                    >
                      <a-radio value="hybrid">
                        <div class="option-content">
                          <div class="option-icon hybrid">
                            <SyncOutlined />
                          </div>
                          <div class="option-info">
                            <div class="option-title">混合检索</div>
                            <div class="option-desc">融合检索</div>
                          </div>
                        </div>
                      </a-radio>
                    </div>
                  </div>
                </a-radio-group>
              </div>
            </a-form-item>

            <a-form-item label="查询内容">
              <VariableSelector
                v-model:referenceParameters="editData.data.config.referenceParameters"
                v-model:value="editData.data.config.query"
                :edges="edges"
                :node-id="editData.id"
                :nodes="nodes"
                placeholder="请输入查询内容，可以使用变量"
              />
            </a-form-item>
          </a-card>
        </template>

        <!-- 模板节点配置 -->
        <template v-if="editData.data.nodeType === 'template'">
          <a-form-item label="模板内容">
            <VariableSelector
              v-model:referenceParameters="editData.data.config.referenceParameters"
              v-model:value="editData.data.config.template"
              :edges="edges"
              :node-id="editData.id"
              :nodes="nodes"
              placeholder="使用 ${变量} 语法引用变量，如：用户名：${userName}，AI回复：${output}"
            />
          </a-form-item>
        </template>

        <!-- 变量节点配置 -->
        <template v-if="editData.data.nodeType === 'variable'">
          <a-form-item label="变量配置(JSON格式)">
            <VariableSelector
              v-model:referenceParameters="editData.data.config.referenceParameters"
              v-model:value="editData.data.config.variables"
              :edges="edges"
              :node-id="editData.id"
              :nodes="nodes"
              placeholder='{"var1": "${value1}", "var2": "${result}"}'
            />
          </a-form-item>
        </template>

        <!-- 直接回复节点配置 -->
        <template v-if="editData.data.nodeType === 'direct_reply'">
          <a-card class="config-card" size="small" title="回复配置">
            <template #extra>
              <a-tag v-if="directReplyTextLength > 0" color="blue" size="small">
                {{ directReplyTextLength }} 字符
              </a-tag>
            </template>
            <a-form-item label="回复内容">
              <VariableSelector
                v-model:referenceParameters="editData.data.config.referenceParameters"
                v-model:value="editData.data.config.replyText"
                :edges="edges"
                :node-id="editData.id"
                :nodes="nodes"
                placeholder="请输入回复内容，可使用 ${变量} 引用节点或输入"
              />
            </a-form-item>
          </a-card>
        </template>

        <!-- 输出节点配置 -->
        <template v-if="editData.data.nodeType === 'output'">
          <a-form-item label="输出变量">
            <div class="output-variables-config">
              <div
                v-for="(outputVar, index) in editData.data.config.outputVariables || []"
                :key="`output_var_${index}`"
                class="output-variable-item"
              >
                <div class="output-variable-header">
                  <span class="variable-label">输出变量 {{ index + 1 }}</span>
                  <a-button danger size="small" type="text" @click="removeOutputVariable(index)">
                    删除
                  </a-button>
                </div>
                <a-form-item :class="{ 'mb-2': true }" label="变量名">
                  <a-input v-model:value="outputVar.name" placeholder="变量名，如：result" />
                </a-form-item>
                <a-form-item label="变量值">
                  <VariableSelector
                    v-model:referenceParameters="editData.data.config.referenceParameters"
                    v-model:value="outputVar.value"
                    :edges="edges"
                    :node-id="editData.id"
                    :nodes="nodes"
                    placeholder="选择要输出的变量，如：${nodeId.paramName}"
                  />
                </a-form-item>
              </div>
              <a-button block class="mt-3" type="dashed" @click="addOutputVariable">
                <template #icon>
                  <PlusOutlined />
                </template>
                添加输出变量
              </a-button>
            </div>
          </a-form-item>
        </template>

        <!-- 高级设置 -->
        <template v-if="editData.data.nodeType !== 'knowledge'">
          <a-divider orientation="left">高级设置</a-divider>
          <a-form-item label="执行超时(秒)">
            <a-input-number
              v-model:value="editData.data.config.timeout"
              :default-value="30"
              :max="300"
              :min="1"
              placeholder="30"
            />
          </a-form-item>
          <a-form-item label="重试次数">
            <a-input-number
              v-model:value="editData.data.config.retryCount"
              :default-value="0"
              :max="5"
              :min="0"
              placeholder="0"
            />
          </a-form-item>
        </template>

        <!-- 节点输出参数（输出节点不显示） -->
        <template v-if="editData.data.nodeType !== 'output'">
          <a-divider orientation="left">节点输出参数</a-divider>
          <div class="node-outputs">
            <div class="outputs-description">
              <p>此节点执行后将产生以下输出变量，后续节点可以使用这些变量：</p>
            </div>
            <div class="output-list">
              <div
                v-for="output in getNodeOutputDefinitions(editData.data.nodeType)"
                :key="output.key"
                class="output-item"
              >
                <div class="output-header">
                  <span class="output-name">{{ output.name }}</span>
                  <a-tag :color="getDataTypeColor(output.dataType)" size="small">
                    {{ getDataTypeLabel(output.dataType) }}
                  </a-tag>
                </div>
                <div class="output-description">{{ output.description }}</div>
                <div class="output-reference">
                  <span class="reference-label">引用格式：</span>
                  <code class="reference-code">{{
                    getVariableReference(editData.id, output.key)
                  }}</code>
                </div>
              </div>
            </div>

            <!-- 如果没有输出参数 -->
            <div
              v-if="getNodeOutputDefinitions(editData.data.nodeType).length === 0"
              class="no-outputs"
            >
              <a-empty :image="false" description="此节点类型没有输出参数" size="small" />
            </div>
          </div>
        </template>

        <a-form-item>
          <a-space>
            <a-button type="primary" @click="handleSave">保存配置</a-button>
            <a-button @click="handleClose">取消</a-button>
            <a-button ghost @click="resetConfig">重置配置</a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </div>

    <!-- 统一变量选择器覆盖层 -->
    <div
      v-if="showUnifiedVariableSelector"
      class="variable-selector-overlay"
      @click="closeUnifiedVariableSelector"
    >
      <div class="variable-selector-panel" @click.stop>
        <div class="variable-selector-header">
          <h3>选择变量</h3>
          <a-button size="small" @click="closeUnifiedVariableSelector">
            <template #icon>
              <CloseOutlined />
            </template>
          </a-button>
        </div>
        <VariableSelector
          v-model:referenceParameters="editData.data.config.referenceParameters"
          :edges="edges"
          :multiple="true"
          :node-id="editData.id"
          :nodes="nodes"
          :value="''"
          placeholder="选择要在HTTP节点中使用的变量..."
          @update:referenceParameters="handleUnifiedVariableChange"
        />
        <div class="variable-selector-actions">
          <a-button size="small" @click="closeUnifiedVariableSelector"> 确定</a-button>
        </div>
      </div>
    </div>
  </a-drawer>
</template>

<script lang="ts" setup>
  import { computed, ref, watch } from 'vue'
  import { useRoute } from 'vue-router'
  import {
    Button as AButton,
    Card as ACard,
    Checkbox as ACheckbox,
    Col as ACol,
    Divider as ADivider,
    Drawer as ADrawer,
    Empty as AEmpty,
    Form as AForm,
    FormItem as AFormItem,
    Input as AInput,
    InputNumber as AInputNumber,
    message,
    Radio as ARadio,
    RadioGroup as ARadioGroup,
    Row as ARow,
    Select as ASelect,
    SelectOption as ASelectOption,
    Slider as ASlider,
    Space as ASpace,
    Switch as ASwitch,
    TabPane as ATabPane,
    Tabs as ATabs,
    Tag as ATag,
  } from 'ant-design-vue'
  import { Textarea as ATextarea } from 'ant-design-vue/es/input'
  import { RadioButton as ARadioButton } from 'ant-design-vue/es/radio'
  import {
    CloseOutlined,
    DatabaseOutlined,
    PlusOutlined,
    ShareAltOutlined,
    SyncOutlined,
  } from '@ant-design/icons-vue'
  import VariableSelector from './VariableSelector.vue'
  import CodeEditor from './CodeEditor.vue'
  import SimpleKeyValueEditor from './SimpleKeyValueEditor.vue'
  import SimpleJsonEditor from './SimpleJsonEditor.vue'
  import EnhancedTextEditor from './EnhancedTextEditor.vue'
  import ConversationMessages from './ConversationMessages.vue'
  import StructuredOutputEditor from './StructuredOutputEditor.vue'
  import Icon from '/@/components/Icon'
  import { getDataTypeColor, getDataTypeLabel, getNodeOutputDefinitions } from '../types/variables'
  import { get as getDatasetById, page as getDatasetPage } from '/@/api/ai/dataset/AiDataSetIndex'
  import type { AiModelDTO } from '/@/api/ai/model/AiModelTypes'
  import type { AiModelPlatformDTO } from '/@/api/ai/model/AiModelPlatformTypes'
  import {
    ensureAiModelData,
    findModelByIdOrName,
    formatModelLabel,
  } from '/@/hooks/ai/useAiModelOptions'

  const props = defineProps({
    visible: {
      type: Boolean,
      default: false,
    },
    node: {
      type: Object,
      default: null,
    },
    // 添加工作流节点和边数据，用于变量选择
    nodes: {
      type: Array,
      default: () => [],
    },
    edges: {
      type: Array,
      default: () => [],
    },
  })

  const emit = defineEmits(['update:visible', 'save', 'close'])

  const route = useRoute()
  const editData = ref<any>({})
  const httpActiveTab = ref('params')
  const showUnifiedVariableSelector = ref(false)
  const availableDatasets = ref([])
  const datasetsLoading = ref(false)
  const availableModels = ref<AiModelDTO[]>([])
  const modelPlatformMap = ref<Record<string, AiModelPlatformDTO>>({})
  const modelOptionsLoading = ref(false)

  const LLM_NODE_TYPES = new Set(['llm', 'llm_answer'])
  const STRUCTURED_OUTPUT_NODE_TYPES = new Set(['llm'])
  const isLLMNode = computed(() => LLM_NODE_TYPES.has(editData.value?.data?.nodeType || ''))
  const supportsStructuredOutput = computed(() =>
    STRUCTURED_OUTPUT_NODE_TYPES.has(editData.value?.data?.nodeType || ''),
  )
  const isConversationMode = computed(() => route.query.appMode === 'chatflow')

  const selectedRetrievalType = computed({
    get() {
      const types = editData.value?.data?.config?.retrievalTypes
      if (Array.isArray(types) && types.length > 0) {
        return types[0]
      }
      return 'hybrid'
    },
    set(value) {
      if (!editData.value?.data?.config) {
        return
      }
      editData.value.data.config.retrievalTypes = value ? [value] : []
    },
  })

  const modelLabelMap = computed(() => {
    const map: Record<string, string> = {}
    availableModels.value.forEach((model) => {
      const key = normalizeId(model.id)
      if (!key) return
      map[key] = formatModelLabel(model, modelPlatformMap.value, key)
    })
    return map
  })

  const modelSelectOptions = computed(() => {
    const options = availableModels.value
      .filter((model) => {
        if (model.enable === undefined || model.enable === null) {
          return true
        }
        return String(model.enable) === '1'
      })
      .map((model) => {
        const key = normalizeId(model.id)
        return {
          value: key,
          label: modelLabelMap.value[key] || key,
        }
      })

    const currentValue = normalizeId(editData.value?.data?.config?.model)
    if (currentValue && !options.some((item) => item.value === currentValue)) {
      options.push({
        value: currentValue,
        label: modelLabelMap.value[currentValue] || currentValue,
      })
    }

    return options
  })

  const directReplyTextLength = computed(() => {
    const replyText = editData.value?.data?.config?.replyText
    return typeof replyText === 'string' ? replyText.length : 0
  })

  // 监听节点变化，初始化编辑数据
  watch(
    () => props.node,
    (newNode) => {
      if (newNode) {
        editData.value = JSON.parse(JSON.stringify(newNode))
        // 确保存在 referenceParameters 字段
        if (!editData.value.data.config.referenceParameters) {
          editData.value.data.config.referenceParameters = []
        }

        if (editData.value.data.nodeType === 'direct_reply') {
          if (typeof editData.value.data.config.replyText !== 'string') {
            editData.value.data.config.replyText = ''
          }
          if (typeof editData.value.data.config.timeout !== 'number') {
            editData.value.data.config.timeout = 5
          }
          if (typeof editData.value.data.config.retryCount !== 'number') {
            editData.value.data.config.retryCount = 0
          }
        }

        // 确保HTTP节点配置初始化
        if (editData.value.data.nodeType === 'http') {
          // 确保params是数组
          if (!Array.isArray(editData.value.data.config.params)) {
            editData.value.data.config.params = []
          }
          // 确保headers是数组
          if (!Array.isArray(editData.value.data.config.headers)) {
            editData.value.data.config.headers = []
          }
          // 确保body是对象而不是字符串
          if (
            !editData.value.data.config.body ||
            typeof editData.value.data.config.body !== 'object'
          ) {
            editData.value.data.config.body = {
              type: 'none',
              formData: [],
              jsonData: '',
            }
          } else {
            // 确保body对象有必要的属性
            if (!editData.value.data.config.body.type) {
              editData.value.data.config.body.type = 'none'
            }
            if (!Array.isArray(editData.value.data.config.body.formData)) {
              editData.value.data.config.body.formData = []
            }
            if (typeof editData.value.data.config.body.jsonData !== 'string') {
              editData.value.data.config.body.jsonData = ''
            }
          }
        }

        // 确保LLM节点配置初始化
        if (LLM_NODE_TYPES.has(editData.value.data.nodeType)) {
          loadModelOptions()
          // 兼容旧的userMessage字段，转换为新的messages格式
          if (editData.value.data.config.userMessage && !editData.value.data.config.messages) {
            editData.value.data.config.messages = [
              {
                id: `msg_${Date.now()}_0`,
                role: 'user',
                content: editData.value.data.config.userMessage,
              },
            ]
            // 删除旧字段
            delete editData.value.data.config.userMessage
          }

          // 确保messages是数组
          if (!Array.isArray(editData.value.data.config.messages)) {
            editData.value.data.config.messages = [
              {
                id: `msg_${Date.now()}_0`,
                role: 'user',
                content: '',
              },
            ]
          }

          // 确保memory配置初始化
          if (!editData.value.data.config.memory) {
            editData.value.data.config.memory = {
              enabled: false,
              window: {
                size: 10,
              },
            }
          } else {
            // 确保memory对象有必要的属性
            if (typeof editData.value.data.config.memory.enabled !== 'boolean') {
              editData.value.data.config.memory.enabled = false
            }
            if (!editData.value.data.config.memory.window) {
              editData.value.data.config.memory.window = { size: 10 }
            } else if (typeof editData.value.data.config.memory.window.size !== 'number') {
              editData.value.data.config.memory.window.size = 10
            }
          }

          // 确保structuredOutput配置初始化（仅支持的节点）
          if (STRUCTURED_OUTPUT_NODE_TYPES.has(editData.value.data.nodeType)) {
            if (!editData.value.data.config.structuredOutput) {
              editData.value.data.config.structuredOutput = {
                enabled: false,
                schema: { root: null },
              }
            } else {
              // 确保structuredOutput对象有必要的属性
              if (typeof editData.value.data.config.structuredOutput.enabled !== 'boolean') {
                editData.value.data.config.structuredOutput.enabled = false
              }
              if (!editData.value.data.config.structuredOutput.schema) {
                editData.value.data.config.structuredOutput.schema = { root: null }
              }
            }
          } else if (editData.value.data.config.structuredOutput) {
            editData.value.data.config.structuredOutput.enabled = false
            editData.value.data.config.structuredOutput.schema = { root: null }
          }

          if (editData.value.data.config.model) {
            editData.value.data.config.model = normalizeId(editData.value.data.config.model)
            alignLLMModelSelection()
          }
        }

        // 确保输出节点配置初始化
        if (editData.value.data.nodeType === 'output') {
          // 兼容旧的outputContent字段，转换为新的outputVariables格式
          if (
            editData.value.data.config.outputContent &&
            !editData.value.data.config.outputVariables
          ) {
            editData.value.data.config.outputVariables = [
              {
                name: 'content',
                value: editData.value.data.config.outputContent,
              },
            ]
            // 删除旧字段
            delete editData.value.data.config.outputContent
          }

          // 确保outputVariables是数组
          if (!Array.isArray(editData.value.data.config.outputVariables)) {
            editData.value.data.config.outputVariables = [
              {
                name: 'result',
                value: '',
              },
            ]
          }
        }

        // 确保知识检索节点配置初始化
        if (editData.value.data.nodeType === 'knowledge') {
          // 确保datasetIds是数组
          if (!Array.isArray(editData.value.data.config.datasetIds)) {
            editData.value.data.config.datasetIds = []
          }
          // 确保retrievalTypes是数组
          if (!Array.isArray(editData.value.data.config.retrievalTypes)) {
            editData.value.data.config.retrievalTypes = ['hybrid']
          }
          // 确保其他字段有默认值
          if (!editData.value.data.config.query) {
            editData.value.data.config.query = ''
          }
          if (typeof editData.value.data.config.topK !== 'number') {
            editData.value.data.config.topK = 5
          }
          if (typeof editData.value.data.config.threshold !== 'number') {
            editData.value.data.config.threshold = 0.7
          }

          // 预加载数据集，确保选择器能显示名称
          loadDatasets()
        }

        // 初始化超时和重试次数
        if (typeof editData.value.data.config.timeout !== 'number') {
          editData.value.data.config.timeout = 30
        }
        if (typeof editData.value.data.config.retryCount !== 'number') {
          editData.value.data.config.retryCount = 0
        }
      }
    },
    { immediate: true },
  )

  // 处理关闭事件
  const handleClose = () => {
    emit('update:visible', false)
    emit('close')
  }

  // 添加用户输入变量
  const addUserInput = () => {
    if (!editData.value.data.config.userInputs) {
      editData.value.data.config.userInputs = []
    }
    editData.value.data.config.userInputs.push({
      name: '',
      displayName: '',
      dataType: 'string',
      description: '',
      required: false,
    })
  }

  // 删除用户输入变量
  const removeUserInput = (index) => {
    if (editData.value.data.config.userInputs) {
      editData.value.data.config.userInputs.splice(index, 1)
    }
  }

  // 添加输出变量
  const addOutputVariable = () => {
    if (!editData.value.data.config.outputVariables) {
      editData.value.data.config.outputVariables = []
    }
    editData.value.data.config.outputVariables.push({
      name: '',
      value: '',
    })
  }

  // 删除输出变量
  const removeOutputVariable = (index) => {
    if (editData.value.data.config.outputVariables) {
      editData.value.data.config.outputVariables.splice(index, 1)
    }
  }

  // 添加条件分支
  const addCondition = () => {
    const conditions = editData.value.data.config.conditions
    const newConditionIndex = conditions.length - 1 // 在else之前插入
    const newCondition = {
      id: `condition${Date.now()}`,
      expression: '',
      label: `条件${newConditionIndex + 1}`,
      description: '',
    }
    conditions.splice(newConditionIndex, 0, newCondition)
  }

  // 删除条件分支
  const removeCondition = (index) => {
    editData.value.data.config.conditions.splice(index, 1)
  }

  // 保存配置
  const handleSave = () => {
    emit('save', editData.value)
  }

  // 重置配置
  const resetConfig = () => {
    const defaultConfig = getDefaultConfig(editData.value.data.nodeType)
    editData.value.data.config = defaultConfig
  }

  const createLLMDefaultConfig = () => ({
    model: '',
    temperature: 0.7,
    maxTokens: 1024,
    systemPrompt: '你是一个有用的AI助手，请根据用户输入提供准确和有帮助的回答。',
    messages: [
      {
        id: `msg_${Date.now()}_0`,
        role: 'user',
        content: '',
      },
    ],
    memory: {
      enabled: false,
      window: {
        size: 10,
      },
    },
    structuredOutput: {
      enabled: false,
      schema: { root: null },
    },
    timeout: 30,
    retryCount: 1,
  })

  // 获取默认配置
  const getDefaultConfig = (nodeType) => {
    const defaultConfigs = {
      start: {
        userInputs: [],
      },
      llm: createLLMDefaultConfig(),
      llm_answer: createLLMDefaultConfig(),
      http: {
        method: 'GET',
        url: '',
        params: [],
        headers: [],
        body: {
          type: 'none', // 'none', 'form-urlencoded', 'json'
          formData: [],
          jsonData: '',
        },
        timeout: 30,
        retryCount: 1,
      },
      condition: {
        conditions: [
          { id: 'condition1', expression: '', label: '条件1', description: '' },
          { id: 'else', expression: 'else', label: '其他', description: '默认分支' },
        ],
        timeout: 10,
        retryCount: 0,
      },
      code: {
        language: 'javascript',
        code: "function add(a, b) { return a + b; } add('fxz', ' I love you.');",
        timeout: 30,
        retryCount: 0,
      },
      knowledge: {
        query: '',
        datasetIds: [],
        retrievalTypes: ['hybrid'],
        timeout: 15,
        retryCount: 1,
        referenceParameters: [],
      },
      template: {
        template: '根据用户问题 生成回答',
        timeout: 10,
        retryCount: 0,
      },
      variable: {
        variables: '{"processed_question": "${}"}',
        timeout: 5,
        retryCount: 0,
      },
      direct_reply: {
        replyText: '',
        referenceParameters: [],
        timeout: 5,
        retryCount: 0,
      },
      output: {
        outputVariables: [
          {
            name: 'result',
            value: '',
          },
        ],
        timeout: 5,
        retryCount: 0,
      },
    }

    return (
      defaultConfigs[nodeType] || {
        timeout: 30,
        retryCount: 1,
      }
    )
  }

  // 获取变量引用格式
  const getVariableReference = (nodeId, outputKey) => {
    return `{{output.${nodeId}.${outputKey}}}`
  }

  // 关闭统一变量选择器
  const closeUnifiedVariableSelector = () => {
    showUnifiedVariableSelector.value = false
  }

  // 处理统一变量选择变化
  const handleUnifiedVariableChange = (newParams) => {
    if (Array.isArray(newParams)) {
      editData.value.data.config.referenceParameters = [...newParams]
    }
  }

  // HTTP节点相关方法
  const onHttpMethodChange = (method) => {
    // 当请求方法改变时，如果切换到GET/DELETE，隐藏Body标签页
    if (['GET', 'DELETE'].includes(method)) {
      if (httpActiveTab.value === 'body') {
        httpActiveTab.value = 'params'
      }
      // 重置Body配置
      editData.value.data.config.body = {
        type: 'none',
        formData: [],
        jsonData: '',
      }
    }
  }

  const onBodyTypeChange = (event) => {
    // 当Body类型改变时，重置相应的数据
    const bodyType = event.target ? event.target.value : event

    // 确保body是对象
    if (!editData.value.data.config.body || typeof editData.value.data.config.body !== 'object') {
      editData.value.data.config.body = {
        type: bodyType,
        formData: [],
        jsonData: '',
      }
      return
    }

    // 创建新的body对象以触发响应式更新
    const newBody = { ...editData.value.data.config.body }
    newBody.type = bodyType

    // 根据类型重置相应数据
    if (bodyType === 'form-urlencoded') {
      newBody.jsonData = ''
      if (!Array.isArray(newBody.formData)) {
        newBody.formData = []
      }
    } else if (bodyType === 'json') {
      newBody.formData = []
      if (typeof newBody.jsonData !== 'string') {
        newBody.jsonData = ''
      }
    } else if (bodyType === 'none') {
      newBody.formData = []
      newBody.jsonData = ''
    }

    // 更新整个body对象
    editData.value.data.config.body = newBody
  }

  function normalizeId(value) {
    if (value === undefined || value === null) return ''
    return String(value)
  }

  async function loadModelOptions() {
    if (availableModels.value.length > 0 || modelOptionsLoading.value) {
      return
    }

    try {
      modelOptionsLoading.value = true
      const { models, platformMap } = await ensureAiModelData()
      availableModels.value = models
      modelPlatformMap.value = platformMap
      alignLLMModelSelection()
    } catch (error) {
      console.error('加载模型列表失败', error)
      message.error('加载模型列表失败，请稍后重试')
    } finally {
      modelOptionsLoading.value = false
    }
  }

  function alignLLMModelSelection() {
    const currentValue = editData.value?.data?.config?.model
    if (!currentValue) {
      return
    }

    const matchedModel = findModelByIdOrName(availableModels.value, currentValue)
    if (matchedModel) {
      editData.value.data.config.model = normalizeId(matchedModel.id)
    }
  }

  const loadDatasets = async () => {
    const selectedIds = Array.isArray(editData.value?.data?.config?.datasetIds)
      ? editData.value.data.config.datasetIds
      : []

    const hasMissingSelected = selectedIds.some(
      (id) => !availableDatasets.value.some((dataset: any) => String(dataset.id) === String(id)),
    )

    if (availableDatasets.value.length > 0 && !hasMissingSelected) {
      return
    }

    try {
      datasetsLoading.value = true

      const datasetMap = new Map()
      availableDatasets.value.forEach((item: any) => {
        datasetMap.set(String(item.id), item)
      })

      const response = await getDatasetPage({
        current: 1,
        size: 1000,
      })

      if (response && response.records) {
        response.records.forEach((item) => {
          datasetMap.set(String(item.id), item)
        })
      }

      const missingAfterPage = selectedIds.filter((id) => !datasetMap.has(String(id)))

      if (missingAfterPage.length > 0) {
        const extraDatasets = await Promise.all(
          missingAfterPage.map(async (id) => {
            try {
              const detail = await getDatasetById(id)
              return detail
            } catch (error) {
              console.warn('加载数据集详情失败:', id, error)
              return null
            }
          }),
        )

        extraDatasets.filter(Boolean).forEach((item) => {
          datasetMap.set(String(item.id), item)
        })
      }

      availableDatasets.value = Array.from(datasetMap.values())
    } catch (error) {
      console.error('加载数据集失败:', error)
      message.error('加载数据集失败，请重试')
    } finally {
      datasetsLoading.value = false
    }
  }
</script>

<style scoped>
  .user-input-config {
    border: 1px solid #e8e8e8;
    border-radius: 8px;
    padding: 16px;
  }

  .user-input-item {
    padding: 12px;
    border: 1px solid #f0f0f0;
    border-radius: 6px;
    margin-bottom: 12px;
    background: #fafafa;
  }

  .user-input-item:last-of-type {
    margin-bottom: 0;
  }

  .input-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  /* HTTP配置相关样式 */
  .body-config {
    padding: 0;
  }

  .body-type-selector {
    margin-bottom: 16px;
    padding: 12px;
    background: #fafafa;
    border-radius: 6px;
    border: 1px solid #f0f0f0;
  }

  .body-type-selector .ant-radio-group {
    width: 100%;
  }

  .body-type-selector .ant-radio-button-wrapper {
    flex: 1;
    text-align: center;
  }

  /* 标签页样式优化 */
  :deep(.ant-tabs-card .ant-tabs-tab) {
    border-radius: 6px 6px 0 0;
    border: 1px solid #d9d9d9;
    background: #fafafa;
    margin-right: 4px;
  }

  :deep(.ant-tabs-card .ant-tabs-tab-active) {
    background: #fff;
    border-bottom-color: #fff;
  }

  :deep(.ant-tabs-card .ant-tabs-content-holder) {
    border: 1px solid #d9d9d9;
    border-radius: 0 6px 6px 6px;
    background: #fff;
    padding: 16px;
  }

  :deep(.ant-tabs-card .ant-tabs-tabpane) {
    padding: 0;
  }

  /* 响应式设计 */
  @media (max-width: 768px) {
    .body-type-selector .ant-radio-button-wrapper {
      padding: 4px 8px;
      font-size: 12px;
    }
  }

  .input-label {
    font-weight: 600;
    color: #262626;
  }

  /* 输出变量配置样式 */
  .output-variables-config {
    border: 1px solid #e8e8e8;
    border-radius: 8px;
    padding: 16px;
  }

  .output-variable-item {
    padding: 12px;
    border: 1px solid #f0f0f0;
    border-radius: 6px;
    margin-bottom: 12px;
    background: #fafafa;
  }

  .output-variable-item:last-of-type {
    margin-bottom: 0;
  }

  .output-variable-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .variable-label {
    font-weight: 600;
    color: #262626;
  }

  .condition-list {
    border: 1px solid #e8e8e8;
    border-radius: 8px;
    padding: 16px;
  }

  .condition-item {
    padding: 12px;
    border: 1px solid #f0f0f0;
    border-radius: 6px;
    margin-bottom: 12px;
    background: #fafafa;
  }

  .condition-item:last-of-type {
    margin-bottom: 0;
  }

  .condition-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .condition-label {
    font-weight: 600;
    color: #262626;
  }

  .mb-2 {
    margin-bottom: 8px;
  }

  .mt-3 {
    margin-top: 16px;
  }

  /* 节点输出样式 */
  .node-outputs {
    border: 1px solid #e8e8e8;
    border-radius: 8px;
    padding: 16px;
    background: #fafbfc;
  }

  .outputs-description {
    margin-bottom: 16px;
  }

  .outputs-description p {
    margin: 0;
    color: #64748b;
    font-size: 13px;
  }

  .output-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .output-item {
    padding: 12px;
    border: 1px solid #f0f0f0;
    border-radius: 6px;
    background: #ffffff;
    transition: all 0.2s ease;
  }

  .output-item:hover {
    border-color: #d1d5db;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  }

  .output-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }

  .output-name {
    font-weight: 600;
    color: #1f2937;
    font-size: 14px;
  }

  .output-description {
    color: #6b7280;
    font-size: 12px;
    margin-bottom: 8px;
    line-height: 1.4;
  }

  .output-reference {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .reference-label {
    font-size: 11px;
    color: #9ca3af;
  }

  .reference-code {
    background: #f1f5f9;
    padding: 2px 6px;
    border-radius: 4px;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 11px;
    color: #0ea5e9;
    border: 1px solid #e2e8f0;
  }

  .no-outputs {
    padding: 20px;
    text-align: center;
    color: #9ca3af;
  }

  /* 变量声明区域样式 */
  .variable-declaration {
    border: 1px solid #e8e8e8;
    border-radius: 8px;
    padding: 16px;
    background: #fafbfc;
  }

  .variable-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid #f0f0f0;
  }

  .variable-title {
    font-weight: 500;
    color: #262626;
    font-size: 14px;
  }

  .variable-list {
    min-height: 80px;
  }

  .variable-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    margin-bottom: 8px;
    background: #ffffff;
    border: 1px solid #f0f0f0;
    border-radius: 6px;
    transition: all 0.2s ease;
  }

  .variable-item:hover {
    border-color: #d1d5db;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  }

  .variable-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .variable-name {
    font-weight: 500;
    color: #1f2937;
    font-size: 13px;
  }

  .variable-reference {
    background: #f1f5f9;
    padding: 2px 6px;
    border-radius: 4px;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 11px;
    color: #0ea5e9;
    border: 1px solid #e2e8f0;
  }

  .no-variables {
    padding: 20px;
    text-align: center;
  }

  .variable-help {
    margin-top: 12px;
    padding: 8px 12px;
    background: #f0f9ff;
    border-radius: 4px;
    border: 1px solid #e0f2fe;
  }

  .variable-help p {
    margin: 0;
    font-size: 12px;
    color: #0c4a6e;
  }

  .variable-help code {
    background: #dbeafe;
    padding: 1px 4px;
    border-radius: 3px;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 11px;
    color: #1e40af;
  }

  /* 统一变量选择器覆盖层 */
  .variable-selector-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .variable-selector-panel {
    width: 600px;
    max-height: 80vh;
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .variable-selector-header {
    padding: 16px;
    border-bottom: 1px solid #f0f0f0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #fafafa;
  }

  .variable-selector-header h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 500;
    color: #262626;
  }

  .variable-selector-actions {
    padding: 16px;
    border-top: 1px solid #f0f0f0;
    background: #fafafa;
    display: flex;
    justify-content: flex-end;
  }

  /* HTTP 节点变量选择器样式优化 */
  .http-variable-selector-wrapper {
    position: relative;
  }

  .http-variable-selector :deep(.variable-input) {
    cursor: pointer;
    background-color: #fafafa;
    border: 1px dashed #d9d9d9;
    transition: all 0.3s ease;
  }

  .http-variable-selector :deep(.variable-input:hover) {
    border-color: #40a9ff;
    background-color: #f6ffed;
  }

  .http-variable-selector :deep(.variable-input:focus) {
    border-color: #40a9ff;
    box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
    background-color: #ffffff;
  }

  .http-variable-selector :deep(.variable-input input) {
    cursor: pointer !important;
  }

  .http-variable-selector :deep(.ant-input-suffix .ant-btn) {
    color: #1890ff;
    border: none;
    background: transparent;
  }

  .http-variable-selector :deep(.ant-input-suffix .ant-btn:hover) {
    color: #40a9ff;
    background: rgba(24, 144, 255, 0.1);
  }

  /* 配置卡片样式 */
  .config-card {
    margin-bottom: 16px;
    border: 1px solid #f0f0f0;
    border-radius: 8px;
    transition: all 0.2s ease;
  }

  .config-card:hover {
    border-color: #d9d9d9;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  }

  .config-card :deep(.ant-card-head) {
    background: linear-gradient(135deg, #fafbfc 0%, #f1f5f9 100%);
    border-bottom: 1px solid #f1f5f9;
    border-radius: 8px 8px 0 0;
  }

  .config-card :deep(.ant-card-head-title) {
    font-size: 15px;
    font-weight: 600;
    color: #1f2937;
  }

  .config-card :deep(.ant-card-body) {
    padding: 20px;
  }

  .config-card :deep(.ant-form-item:last-child) {
    margin-bottom: 0;
  }

  /* 知识检索节点样式 */
  .dataset-option {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .dataset-name {
    font-weight: 500;
    color: #1f2937;
  }

  .dataset-desc {
    font-size: 12px;
    color: #6b7280;
  }

  .retrieval-type-selector {
    width: 100%;
  }

  .retrieval-radio-group {
    width: 100%;
  }

  .retrieval-options {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 16px;
    width: 100%;
  }

  .retrieval-option {
    position: relative;
    border: 1px solid #edf2f7;
    border-radius: 12px;
    padding: 18px 16px;
    transition: all 0.3s ease;
    background: #fbfdff;
    cursor: pointer;
    overflow: hidden;
  }

  .retrieval-option::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 12px;
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(59, 130, 246, 0));
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  .retrieval-option:hover {
    border-color: #93c5fd;
    box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
  }

  .retrieval-option:hover::before {
    opacity: 1;
  }

  .retrieval-option.active {
    border-color: #3b82f6;
    box-shadow: 0 12px 32px rgba(59, 130, 246, 0.25);
    background: linear-gradient(145deg, #eef6ff 0%, #fbfdff 100%);
  }

  .retrieval-option.active::before {
    opacity: 1;
  }

  .retrieval-option :deep(.ant-radio-wrapper) {
    width: 100%;
    display: flex;
    align-items: stretch;
  }

  .retrieval-option :deep(.ant-radio) {
    position: absolute;
    top: 12px;
    right: 12px;
  }

  .retrieval-option :deep(.ant-radio .ant-radio-inner) {
    width: 18px;
    height: 18px;
    border-width: 2px;
  }

  .retrieval-option :deep(.ant-radio-checked .ant-radio-inner) {
    border-color: #3b82f6;
  }

  .retrieval-option :deep(.ant-radio-checked .ant-radio-inner::after) {
    background-color: #3b82f6;
    transform: scale(0.6);
  }

  .option-content {
    display: flex;
    align-items: center;
    gap: 10px;
    padding-left: 4px;
  }

  .option-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 6px;
    font-size: 16px;
    flex-shrink: 0;
  }

  .option-icon.vector {
    background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
    color: #3b82f6;
  }

  .option-icon.graph {
    background: linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%);
    color: #ec4899;
  }

  .option-icon.qa {
    background: linear-gradient(135deg, #ffedd5 0%, #fed7aa 100%);
    color: #f97316;
  }

  .option-icon.hybrid {
    background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
    color: #10b981;
  }

  .option-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .option-title {
    font-weight: 600;
    font-size: 13px;
    color: #1f2937;
    line-height: 1.2;
  }

  .option-desc {
    font-size: 11px;
    color: #6b7280;
    line-height: 1.2;
  }

  @media (max-width: 768px) {
    .retrieval-options {
      grid-template-columns: 1fr;
    }
  }

  /* 记忆配置样式 */
  .memory-config-content {
    padding-top: 8px;
  }

  .memory-help-text {
    margin-top: 8px;
    font-size: 12px;
    color: #6b7280;
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .memory-disabled-hint {
    padding: 12px 0;
  }

  .memory-disabled-hint :deep(.ant-empty-description) {
    color: #9ca3af;
    font-size: 13px;
  }

  /* 结构化输出样式 */
  .structured-output-help {
    margin-bottom: 12px;
  }

  .structured-output-disabled-hint {
    padding: 12px 0;
  }

  .structured-output-disabled-hint :deep(.ant-empty-description) {
    color: #9ca3af;
    font-size: 13px;
  }
</style>
