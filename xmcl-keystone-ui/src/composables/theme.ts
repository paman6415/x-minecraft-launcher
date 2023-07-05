import { injection } from '@/util/inject'
import { computed } from 'vue'
import { kSettingsState } from './setting'
import { kVuetify } from './vuetify'

export function useTheme() {
  const vuetify = injection(kVuetify)

  const darkTheme = computed({
    get(): boolean { return vuetify.theme.dark },
    set(v: boolean) { vuetify.theme.dark = v },
  })

  return {
    darkTheme,
  }
}

export function usePreferDark() {
  const preferDark = ref(true)
  const matches = (window.matchMedia) ? window.matchMedia('(prefers-color-scheme: dark)') : false
  if (matches) {
    preferDark.value = matches.matches
    matches.onchange = ({ matches }) => {
      preferDark.value = matches
    }
  }
  return preferDark
}

export function useThemeSync() {
  const framework = injection(kVuetify)
  const { state } = injection(kSettingsState)
  const preferDark = usePreferDark()

  const updateTheme = (theme: 'dark' | 'system' | 'light') => {
    if (theme === 'system') {
      framework.theme.dark = preferDark.value
    } else if (theme === 'dark') {
      framework.theme.dark = true
    } else if (theme === 'light') {
      framework.theme.dark = false
    }
  }

  watch(computed(() => state.value?.theme ?? 'system'), (newValue: string, oldValue: string) => {
    console.log(`Theme changed ${oldValue} -> ${newValue}`)
    updateTheme(newValue as any)
  })

  updateTheme(state.value?.theme || 'system')
}
