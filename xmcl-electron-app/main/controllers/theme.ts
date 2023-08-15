import { ElectronController } from '@/ElectronController'
import { ControllerPlugin } from './plugin'
import { nativeTheme } from 'electron'
import { BaseService } from '@xmcl/runtime'

const expectedValues = ['dark', 'light', 'system']
export const themePlugin: ControllerPlugin = function (this: ElectronController) {
  this.app.on('engine-ready', async () => {
    const baseService = await this.app.registry.get(BaseService)
    const settings = await baseService.getSettings()
    if (expectedValues.indexOf(settings.theme) === -1) {
      this.app.warn(`Cannot set theme source to unexpected value ${settings.theme}. Use dark as default.`)
      nativeTheme.themeSource = 'dark'
    } else {
      nativeTheme.themeSource = settings.theme
    }
  })
}
