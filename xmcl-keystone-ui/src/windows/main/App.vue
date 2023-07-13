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
import { kFilterCombobox, useExternalRoute, useFilterComboboxData, useI18nSync, useThemeSync } from '@/composables'
import { useAuthProfileImportNotification } from '@/composables/authProfileImport'
import { kBackground, useBackground } from '@/composables/background'
import { kColorTheme, useColorTheme } from '@/composables/colorTheme'
import { kDropHandler, useDropHandler } from '@/composables/dropHandler'
import { useDefaultErrorHandler } from '@/composables/errorHandler'
import { kImageDialog, useImageDialog } from '@/composables/imageDialog'
import { kInstance, useInstance } from '@/composables/instance'
import { kInstanceFiles, useInstanceFiles } from '@/composables/instanceFiles'
import { kInstanceFilesDiagnose, useInstanceFilesDiagnose } from '@/composables/instanceFilesDiagnose'
import { kInstanceJava, useInstanceJava } from '@/composables/instanceJava'
import { kInstanceJavaDiagnose, useInstanceJavaDiagnose } from '@/composables/instanceJavaDiagnose'
import { kInstanceModsContext, useInstanceMods } from '@/composables/instanceMods'
import { kInstanceOptions, useInstanceOptions } from '@/composables/instanceOptions'
import { kInstanceResourcePacks, useInstanceResourcePacks } from '@/composables/instanceResourcePack'
import { kInstanceVersion, useInstanceVersion } from '@/composables/instanceVersion'
import { kInstanceVersionDiagnose, useInstanceVersionDiagnose } from '@/composables/instanceVersionDiagnose'
import { kInstances, useInstances } from '@/composables/instances'
import { kJavaContext, useJavaContext } from '@/composables/java'
import { kLaunchTask, useLaunchTask } from '@/composables/launchTask'
import { kModsSearch, useModsSearch } from '@/composables/modSearch'
import { kModSearchItems, useModSearchItems } from '@/composables/modSearchItems'
import { kModpacks, useModpacks } from '@/composables/modpack'
import { useMods } from '@/composables/mods'
import { useNotifier } from '@/composables/notifier'
import { kPeerState, usePeerState } from '@/composables/peers'
import { kInstanceSave, useInstanceSaves } from '@/composables/save'
import { kSettingsState, useSettingsState } from '@/composables/setting'
import { kUILayout, useUILayout } from '@/composables/uiLayout'
import { kMarketRoute, useMarketRoute } from '@/composables/useMarketRoute'
import { kUserContext, useUserContext } from '@/composables/user'
import { kUserDiagnose, useUserDiagnose } from '@/composables/userDiagnose'
import { kLocalVersions, useLocalVersions } from '@/composables/versionLocal'
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

const colorTheme = useColorTheme()
const { cssVars } = colorTheme
provide(kColorTheme, colorTheme)

// background
const background = useBackground()
const { blurMainBody } = background
provide(kBackground, background)

// color theme sync
const vuetify = injection(kVuetify)
useVuetifyColorTheme(vuetify, colorTheme)

// drop
provide(kDropHandler, useDropHandler())

// Notifier
const { notify } = useNotifier()
useDefaultErrorHandler(notify)
useAuthProfileImportNotification(notify)

const user = useUserContext()
const java = useJavaContext()
const localVersions = useLocalVersions()
const instances = useInstances()
const peerState = usePeerState()
provide(kPeerState, peerState)
const instance = useInstance(instances.instances)

const initializing = computed(() => instances.isValidating.value)

const settings = useSettingsState()
const instanceVersion = useInstanceVersion(instance.instance, localVersions.versions)
const instanceJava = useInstanceJava(instance.instance, instanceVersion.resolvedVersion, java.all)
const options = useInstanceOptions(instance.instance)
const saves = useInstanceSaves(instance.instance)
const resourcePacks = useInstanceResourcePacks(options.gameOptions)
const mods = useInstanceMods(instance.instance, instanceJava.java)
const files = useInstanceFiles(instance.path)
const task = useLaunchTask(instance.path, instance.runtime, instanceVersion.versionHeader)

const allMods = useMods()
const modsSearch = useModsSearch(ref(''), allMods.resources, instance.runtime, mods.mods)
const modSearchItems = useModSearchItems(modsSearch.keyword, modsSearch.modrinth, modsSearch.curseforge, modsSearch.mods, modsSearch.existedMods)

const versionDiagnose = useInstanceVersionDiagnose(instance.runtime, instanceVersion.resolvedVersion, localVersions.versions)
const javaDiagnose = useInstanceJavaDiagnose(java.all, instanceJava.recommendation)
const filesDiagnose = useInstanceFilesDiagnose(files.files, files.install)
const userDiagnose = useUserDiagnose(user.userProfile)

provide(kUserContext, user)
provide(kJavaContext, java)
provide(kSettingsState, settings)
provide(kInstances, instances)
provide(kInstance, instance)
provide(kLocalVersions, localVersions)

provide(kInstanceVersion, instanceVersion)
provide(kInstanceJava, instanceJava)
provide(kInstanceOptions, options)
provide(kInstanceSave, saves)
provide(kInstanceResourcePacks, resourcePacks)
provide(kInstanceModsContext, mods)
provide(kInstanceFiles, files)
provide(kLaunchTask, task)

provide(kInstanceVersionDiagnose, versionDiagnose)
provide(kInstanceJavaDiagnose, javaDiagnose)
provide(kInstanceFilesDiagnose, filesDiagnose)
provide(kUserDiagnose, userDiagnose)

provide(kModsSearch, modsSearch)
provide(kModSearchItems, modSearchItems)
provide(kModpacks, useModpacks())

useI18nSync(vuetify, settings.state)
useThemeSync(vuetify, settings.state)

const router = useRouter()
useExternalRoute(router)

provide(kUILayout, useUILayout())
provide(kImageDialog, useImageDialog())
provide(kMarketRoute, useMarketRoute())
provide(kFilterCombobox, useFilterComboboxData())

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
