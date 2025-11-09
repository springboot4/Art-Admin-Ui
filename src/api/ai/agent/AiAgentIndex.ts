import { defHttp } from '/@/utils/http/axios'
import type { PageResult } from '/#/axios'
import type { AiAgentDTO, AgentPageQuery } from './AiAgentTypes'

const PREFIX = '/ai/ai/agent'

export function addAgent(data: AiAgentDTO) {
  return defHttp.post<boolean>({
    url: `${PREFIX}/add`,
    data,
  })
}

export function updateAgent(data: AiAgentDTO) {
  return defHttp.post<boolean>({
    url: `${PREFIX}/update`,
    data,
  })
}

export function saveAgentDraft(data: AiAgentDTO) {
  return defHttp.post<boolean>({
    url: `${PREFIX}/draft`,
    data,
  })
}

export function publishAgent(data: AiAgentDTO) {
  return defHttp.post<boolean>({
    url: `${PREFIX}/publish`,
    data,
  })
}

export function deleteAgent(id: number) {
  return defHttp.delete<boolean>({
    url: `${PREFIX}/delete`,
    params: { id },
  })
}

export function findAgentById(id: number) {
  return defHttp.get<AiAgentDTO>({
    url: `${PREFIX}/findById`,
    params: { id },
  })
}

export function getPublishedAgent(appId: number) {
  return defHttp.get<AiAgentDTO | null>({
    url: `${PREFIX}/published`,
    params: { appId },
  })
}

export function getLastAgent(appId: string) {
  return defHttp.get<AiAgentDTO | null>({
    url: `${PREFIX}/last`,
    params: { appId },
  })
}

export function listAgents(appId: number) {
  return defHttp.get<AiAgentDTO[]>({
    url: `${PREFIX}/list`,
    params: { appId },
  })
}

export function pageAgents(params: AgentPageQuery) {
  return defHttp.get<PageResult<AiAgentDTO>>({
    url: `${PREFIX}/page`,
    params,
  })
}
