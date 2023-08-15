import { pluginClientToken } from './pluginClientToken'
import { pluginCommonProtocol } from './pluginCommonProtocol'
import { pluginGFW } from './pluginGFW'
import { pluginImageStorage } from './pluginImageStore'
import { pluginOfficialUserApi } from './pluginOfficialUserApi'
import { pluginOffineUser } from './pluginOfflineUser'
import { pluginSettings } from './pluginSettings'
import { pluginTelemetry } from './pluginTelemetry'
import { pluginUndiciLogger } from './pluginUndiciLogger'
import { pluginUserTokenStorage } from './pluginUserTokenStorage'
import { pluginWorker } from './pluginWorker'
import { pluginYggdrasilHandler } from './pluginYggdrasilHandler'

export const plugins = [
  pluginClientToken,
  pluginUserTokenStorage,
  pluginSettings,
  pluginYggdrasilHandler,
  pluginUndiciLogger,
  pluginWorker,
  pluginTelemetry,
  pluginImageStorage,
  pluginGFW,
  pluginOfficialUserApi,
  pluginOffineUser,
  pluginCommonProtocol,
]
