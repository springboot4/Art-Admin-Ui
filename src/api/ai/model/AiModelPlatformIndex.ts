import { defHttp } from '/@/utils/http/axios'
import { PageResult } from '/#/axios'
import { AiModelPlatformDTO } from './AiModelPlatformTypes'

/**
 * 分页
 */
export function page(params) {
  return defHttp.get<PageResult<AiModelPlatformDTO>>({
    url: '/ai/ai/model-platform/page',
    params,
  })
}

/**
 * 获取单条
 */
export function get(id) {
  return defHttp.get<AiModelPlatformDTO>({
    url: '/ai/ai/model-platform/findById',
    params: { id },
  })
}

/**
 * 修改
 */
export function update(data: AiModelPlatformDTO) {
  return defHttp.post<AiModelPlatformDTO>({
    url: '/ai/ai/model-platform/update',
    data,
  })
}

/**
 * 保存
 */
export function add(data: AiModelPlatformDTO) {
  return defHttp.post<AiModelPlatformDTO>({
    url: '/ai/ai/model-platform/add',
    data,
  })
}

/**
 * 删除
 */
export function del(id) {
  return defHttp.delete<AiModelPlatformDTO>({
    url: `/ai/ai/model-platform/delete?id=${id}`,
  })
}
