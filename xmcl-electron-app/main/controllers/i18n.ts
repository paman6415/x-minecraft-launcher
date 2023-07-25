import { ElectronController } from '@/ElectronController'
import { BaseService } from '@xmcl/runtime'
import localeMappings from '../../../assets/locales.json'
import { ControllerPlugin } from './plugin'

export const i18n: ControllerPlugin = function (this: ElectronController) {
  this.app.once('engine-ready', async () => {
    const baseService = this.app.serviceManager.get(BaseService)
    const state = await baseService.getSettings()
    state.localesSet(Object.entries(localeMappings).map(([locale, name]) => ({ locale, name })))
    this.app.log(`Set locale for the app ${baseService.state.locales.map(l => l.name)}`)
    this.i18n.use(state.locale)
    state.subscribe('config', (c) => {
      this.i18n.use(c.locale)
      this.app.log(`Set locale for the app ${c.locale}`)
    }).subscribe('localeSet', (l) => {
      this.i18n.use(l)
      this.app.log(`Set locale for the app ${l}`)
    })
  })
}
