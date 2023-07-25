import { ElectronController } from '@/ElectronController'
import { ControllerPlugin } from './plugin'
import { nativeTheme } from 'electron'
import { BaseService } from '@xmcl/runtime'

const expectedValues = ['dark', 'light', 'system']
export const themePlugin: ControllerPlugin = function (this: ElectronController) {
  this.app.on('engine-ready', () => {
    const baseService = this.app.serviceManager.get(BaseService)
    baseService.getSettings().then((state) => {
      if (expectedValues.indexOf(state.theme) === -1) {
        this.app.warn(`Cannot set theme source to unexpected value ${state.theme}. Use dark as default.`)
        nativeTheme.themeSource = 'dark'
      } else {
        nativeTheme.themeSource = state.theme
      }
    })
  })
}
