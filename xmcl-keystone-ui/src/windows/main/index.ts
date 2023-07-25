import TextComponent from '@/components/TextComponent'
import { kSemaphores, kServiceFactory, useSemaphores, useServiceFactory } from '@/composables'
import { kDialogModel, useDialogModel } from '@/composables/dialog'
import { kExceptionHandlers, useExceptionHandlers } from '@/composables/exception'
import { kNotificationQueue, useNotificationQueue } from '@/composables/notifier'
import { kServerStatusCache, useServerStatusCache } from '@/composables/serverStatus'
import { kTaskManager, useTaskManager } from '@/composables/taskManager'
import { kVuetify } from '@/composables/vuetify'
import messages from '@intlify/unplugin-vue-i18n/messages'
import 'virtual:windi.css'
import Vue, { defineComponent, getCurrentInstance, h, provide } from 'vue'
import VueI18n from 'vue-i18n'
import { castToVueI18n, createI18n } from 'vue-i18n-bridge'
import VueObserveVisibility from 'vue-observe-visibility'
import Router from 'vue-router'
import Vuetify from 'vuetify'
import Vuex from 'vuex'
import '../../../locales/en.yaml'
import '../../../locales/zh-CN.yaml'
import MainWindow from './App.vue'
import { createRouter } from './router'
import vuetify from './vuetify'
import { kSWRVConfig, useSWRVConfig } from '@/composables/swrvConfig'

// to prevent the universal drop activated on self element dragging
document.addEventListener('dragstart', (e) => {
  if (e.dataTransfer?.effectAllowed === 'uninitialized') {
    e.dataTransfer!.effectAllowed = 'none'
  }
})

Vue.use(VueI18n, { bridge: true })
Vue.use(Router)
Vue.use(Vuex)
Vue.use(Vuetify)
Vue.use(VueObserveVisibility)

const i18n = castToVueI18n(
  createI18n(
    {
      legacy: false,
      locale: 'en',
      silentTranslationWarn: true,
      missingWarn: false,
      messages,
    },
    VueI18n,
  ),
) // `createI18n` which is provide `vue-i18n-bridge` has second argument, you **must** pass `VueI18n` constructor which is provide `vue-i18n`

const router = createRouter()
Vue.use(i18n)

const app = new Vue(defineComponent({
  i18n,
  vuetify,
  router,
  setup() {
    const root = getCurrentInstance()!.proxy.$root
    Object.defineProperty(root, '$router', {
      value: new Proxy(root.$router, {
        get(target, key) {
          const prop = Reflect.get(target, key)
          if (prop instanceof Function) {
            return (prop as Function).bind(target)
          }
          return prop
        },
      }),
    })

    provide(kServiceFactory, useServiceFactory())
    provide(kVuetify, vuetify.framework)
    provide(kSWRVConfig, useSWRVConfig())
    provide(kSemaphores, useSemaphores())
    provide(kExceptionHandlers, useExceptionHandlers())
    provide(kDialogModel, useDialogModel())
    provide(kTaskManager, useTaskManager())
    provide(kServerStatusCache, useServerStatusCache())
    provide(kNotificationQueue, useNotificationQueue())

    return () => h(MainWindow)
  },
}))

Vue.component('TextComponent', TextComponent)

app.$mount('#app')
