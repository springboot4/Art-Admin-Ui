import { defHttp } from '/@/utils/http/axios'
import { PageResult } from '/#/axios'
import { AiWorkflowsDTO } from './AiWorkflowsTypes'

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
 * 删除
 */
export function del(id) {
  return defHttp.delete<AiWorkflowsDTO>({
    url: `/ai/ai/workflows/delete?id=${id}`,
  })
}
