import { defHttp } from '/@/utils/http/axios'
import { PageResult } from '/#/axios'
import { AiModelDTO } from './AiModelTypes'

/**
 * 分页
 */
export function page(params) {
  return defHttp.get<PageResult<AiModelDTO>>({
    url: '/ai/ai/model/page',
    params,
  })
}

/**
 * 获取单条
 */
export function get(id) {
  return defHttp.get<AiModelDTO>({
    url: '/ai/ai/model/findById',
    params: { id },
  })
}

/**
 * 修改
 */
export function update(data: AiModelDTO) {
  return defHttp.post<AiModelDTO>({
    url: '/ai/ai/model/update',
    data,
  })
}

/**
 * 保存
 */
export function add(data: AiModelDTO) {
  return defHttp.post<AiModelDTO>({
    url: '/ai/ai/model/add',
    data,
  })
}

/**
 * 删除
 */
export function del(id) {
  return defHttp.delete<AiModelDTO>({
    url: `/ai/ai/model/delete?id=${id}`,
  })
}
