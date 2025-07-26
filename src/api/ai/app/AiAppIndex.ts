import { defHttp } from '/@/utils/http/axios'
import { PageResult } from '/#/axios'
import { AiAppDTO } from './AiAppTypes'

/**
 * 分页
 */
export function page(params) {
  return defHttp.get<PageResult<AiAppDTO>>({
    url: '/ai/ai/app/page',
    params,
  })
}

/**
 * 获取单条
 */
export function get(id) {
  return defHttp.get<AiAppDTO>({
    url: '/ai/ai/app/findById',
    params: { id },
  })
}

/**
 * 修改
 */
export function update(data: AiAppDTO) {
  return defHttp.post<AiAppDTO>({
    url: '/ai/ai/app/update',
    data,
  })
}

/**
 * 保存
 */
export function add(data: AiAppDTO) {
  return defHttp.post<AiAppDTO>({
    url: '/ai/ai/app/add',
    data,
  })
}

/**
 * 删除
 */
export function del(id) {
  return defHttp.delete<AiAppDTO>({
    url: `/ai/ai/app/delete?id=${id}`,
  })
}
