import { ElectronController } from '@/ElectronController'
import { BaseService } from '@xmcl/runtime'
import localeMappings from '../../../assets/locales.json'
import { ControllerPlugin } from './plugin'
import { Settings } from '@xmcl/runtime-api'
import { kSettings } from '@xmcl/runtime/lib/entities/settings'

export const i18n: ControllerPlugin = function (this: ElectronController) {
  this.app.once('engine-ready', async () => {
    const state = await this.app.registry.get(kSettings)
    state.localesSet(Object.entries(localeMappings).map(([locale, name]) => ({ locale, name })))
    this.app.log(`Set locale for the app ${state.locales.map(l => l.name)}`)
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
