<template>
  <v-app
    v-if="!shouldSetup"
    class="overflow-auto h-full overflow-x-hidden max-h-[100vh]"
    :class="{ 'dark': vuetify.theme.dark }"
    :style="cssVars"
  >
    <AppBackground />
    <AppSystemBar />
    <div
      class="flex h-full overflow-auto relative"
    >
      <AppSideBar />
      <main
        class="flex flex-col top-0 bottom-0 right-0 overflow-auto max-h-full relative"
        :class="{ solid: !blurMainBody }"
      >
        <transition
          name="fade-transition"
          mode="out-in"
        >
          <router-view class="z-2" />
        </transition>
      </main>
    </div>
    <AppDropDialog />
    <AppContextMenu />
    <AppNotifier />
    <AppFeedbackDialog />
    <AppLoginDialog />
    <AppTaskDialog />
    <AppAddInstanceDialog />
    <AppAddServerDialog />
    <AppExportDialog />
    <AppShareInstanceDialog />
    <AppInstanceDeleteDialog />
    <AppGameExitDialog />
    <AppLaunchBlockedDialog />
    <ImageDialog />
    <SharedTooltip />
  </v-app>
  <v-app
    v-else
    class="overflow-auto h-full overflow-x-hidden max-h-[100vh]"
    :class="{ 'dark': vuetify.theme.dark }"
    :style="cssVars"
  >
    <AppSystemBar
      no-user
      no-task
    />
    <div
      class="flex h-full overflow-auto relative"
    >
      <Setup @ready="shouldSetup = false" />
    </div>
    <AppFeedbackDialog />
  </v-app>
</template>

<script lang=ts setup>
import '@/assets/common.css'
import ImageDialog from '@/components/ImageDialog.vue'
import SharedTooltip from '@/components/SharedTooltip.vue'
import { useAuthProfileImportNotification } from '@/composables/authProfileImport'
import { kBackground, useBackground } from '@/composables/background'
import { kColorTheme, useColorTheme } from '@/composables/colorTheme'
import { kDropHandler, useDropHandler } from '@/composables/dropHandler'
import { useDefaultErrorHandler } from '@/composables/errorHandler'
import { useNotifier } from '@/composables/notifier'
import { kVuetify } from '@/composables/vuetify'
import { useVuetifyColorTheme } from '@/composables/vuetifyColorTheme'
import { injection } from '@/util/inject'
import AppAddInstanceDialog from '@/views/AppAddInstanceDialog.vue'
import AppAddServerDialog from '@/views/AppAddServerDialog.vue'
import AppBackground from '@/views/AppBackground.vue'
import AppContextMenu from '@/views/AppContextMenu.vue'
import AppDropDialog from '@/views/AppDropDialog.vue'
import AppExportDialog from '@/views/AppExportDialog.vue'
import AppFeedbackDialog from '@/views/AppFeedbackDialog.vue'
import AppGameExitDialog from '@/views/AppGameExitDialog.vue'
import AppInstanceDeleteDialog from '@/views/AppInstanceDeleteDialog.vue'
import AppLaunchBlockedDialog from '@/views/AppLaunchBlockedDialog.vue'
import AppLoginDialog from '@/views/AppLoginDialog.vue'
import AppNotifier from '@/views/AppNotifier.vue'
import AppShareInstanceDialog from '@/views/AppShareInstanceDialog.vue'
import AppSideBar from '@/views/AppSideBar.vue'
import AppSystemBar from '@/views/AppSystemBar.vue'
import AppTaskDialog from '@/views/AppTaskDialog.vue'
import Setup from '@/views/Setup.vue'

const shouldSetup = ref(location.search.indexOf('setup') !== -1)

const { cssVars, ...colorTheme } = injection(kColorTheme)

// background
const { blurMainBody } = injection(kBackground)

// color theme sync
const vuetify = injection(kVuetify)
useVuetifyColorTheme(vuetify, colorTheme)

// Notifier
const { notify } = useNotifier()
useDefaultErrorHandler(notify)
useAuthProfileImportNotification(notify)

</script>

<style scoped>
.clip-head {
  clip-path: inset(0px 30px 30px 0px) !important;
  width: 64px;
  height: auto; /*to preserve the aspect ratio of the image*/
}
.v-input__icon--prepend {
  margin-right: 7px;
}
img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
</style>
