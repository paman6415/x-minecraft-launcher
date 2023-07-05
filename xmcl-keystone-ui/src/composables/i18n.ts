
import { injection } from '../util/inject'
import { kSettingsState } from './setting'
import { kVuetify } from './vuetify'

export function useI18nSync() {
  const { state } = injection(kSettingsState)
  const framework = injection(kVuetify)
  const { locale } = useI18n()
  watch(computed(() => state.value?.locale || ''), (newValue: string, oldValue: string) => {
    console.log(`Locale changed ${oldValue} -> ${newValue}`)
    locale.value = newValue
    const lang = framework.lang
    if (newValue === 'zh-CN') {
      lang.current = 'zhHans'
    } else if (newValue === 'ru') {
      lang.current = 'ru'
    } else {
      lang.current = 'en'
    }
  })
}
