import { ErrorTypeEnum } from '/@/enums/exceptionEnum'
import { MenuModeEnum, MenuTypeEnum } from '/@/enums/menuEnum'
import { RoleInfo } from '/@/api/base/model/userModel'

// Error-log information
export interface ErrorLogInfo {
  // Type of error
  type: ErrorTypeEnum
  // Error file
  file: string
  // Error name
  name?: string
  // Error message
  message: string
  // Error stack
  stack?: string
  // Error detail
  detail: string
  // Error url
  url: string
  // Error time
  time?: string
}

export interface UserInfo {
  userId: string | number
  username: string
  password: string | null
  realName: string
  avatar?: string
  description?: string
  homePath?: string
  roles: RoleInfo[]
  sex?: string | number
  email?: string
  mobile?: string
}

export interface BeforeMiniState {
  menuCollapsed?: boolean
  menuSplit?: boolean
  menuMode?: MenuModeEnum
  menuType?: MenuTypeEnum
}
