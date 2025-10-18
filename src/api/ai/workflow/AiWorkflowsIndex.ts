import { defHttp } from '/@/utils/http/axios'
import { PageResult } from '/#/axios'
import { AiWorkflowsDTO } from './AiWorkflowsTypes'
import { AiWorkflowsPublishDTO } from '/@/api/ai/workflow/AiWorkflowsPublishTypes'

/**
 * 工作流运行时执行接口
 */
export function executeWorkflowRuntime(data: { workflowId: string; inputs: Record<string, any> }) {
  return defHttp.post<any>({
    url: '/ai/ai/workflows/runtime/run',
    data,
  })
}

/**
 * 根据appId查询最新的工作流信息
 */
export function findByAppId(appId) {
  return defHttp.get<AiWorkflowsDTO>({
    url: '/ai/ai/workflows/findByAppId',
    params: { appId },
  })
}

/**
 * 修改
 */
export function publish(data: AiWorkflowsPublishDTO) {
  return defHttp.post<AiWorkflowsPublishDTO>({
    url: '/ai/ai/workflows/publish',
    data,
  })
}

/**
 * 分页
 */
export function page(params) {
  return defHttp.get<PageResult<AiWorkflowsDTO>>({
    url: '/ai/ai/workflows/page',
    params,
  })
}

/**
 * 获取单条
 */
export function get(id) {
  return defHttp.get<AiWorkflowsDTO>({
    url: '/ai/ai/workflows/findById',
    params: { id },
  })
}

/**
 * 修改
 */
export function update(data: AiWorkflowsDTO) {
  return defHttp.post<AiWorkflowsDTO>({
    url: '/ai/ai/workflows/update',
    data,
  })
}

/**
 * 保存
 */
export function add(data: AiWorkflowsDTO) {
  return defHttp.post<AiWorkflowsDTO>({
    url: '/ai/ai/workflows/add',
    data,
  })
}

/**
 * 草稿
 */
export function draft(data: AiWorkflowsDTO) {
  return defHttp.post<AiWorkflowsDTO>({
    url: '/ai/ai/workflows/draft',
    data,
  })
}

/**
 * 删除
 */
export function del(id) {
  return defHttp.delete<AiWorkflowsDTO>({
    url: `/ai/ai/workflows/delete?id=${id}`,
  })
}
