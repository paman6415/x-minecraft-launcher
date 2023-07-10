import { useService } from '@/composables'
import { injection } from '@/util/inject'
import { AuthlibInjectorServiceKey, BaseServiceKey, LaunchOptions, LaunchServiceKey, UserServiceKey } from '@xmcl/runtime-api'
import { computed } from 'vue'
import { DialogKey } from './dialog'
import { kInstance } from './instance'
import { kInstanceJava } from './instanceJava'
import { kInstanceVersion } from './instanceVersion'
import { useGlobalSettings } from './setting'
import { kUserContext } from './user'

export const LaunchStatusDialogKey: DialogKey<void> = 'launch-status'

export function useLaunchOption() {
  const { globalAssignMemory, globalMaxMemory, globalMinMemory, globalMcOptions, globalVmOptions, globalFastLaunch, globalHideLauncher, globalShowLog } = useGlobalSettings()
  const { path, instance } = injection(kInstance)
  const { resolvedVersion } = injection(kInstanceVersion)
  const { java } = injection(kInstanceJava)
  const { userProfile } = injection(kUserContext)
  const { getMemoryStatus } = useService(BaseServiceKey)
  const { getOrInstallAuthlibInjector, getYggdrasilAuthHost } = useService(AuthlibInjectorServiceKey)

  async function generateLaunchOptions() {
    const ver = resolvedVersion.value
    if (!ver) {
      throw new Error()
    }
    const javaRec = java.value
    if (!javaRec) {
      throw new Error()
    }

    const yggdrasilHost = await getYggdrasilAuthHost(userProfile.value)
    let yggdrasilAgent: LaunchOptions['yggdrasilAgent']

    if (yggdrasilHost) {
      yggdrasilAgent = {
        jar: await getOrInstallAuthlibInjector(),
        server: yggdrasilHost,
      }
    }

    const inst = instance.value
    const assignMemory = inst.assignMemory ?? globalAssignMemory.value
    const hideLauncher = inst.hideLauncher ?? globalHideLauncher.value
    const showLog = inst.showLog ?? globalShowLog.value
    const fastLaunch = inst.fastLaunch ?? globalFastLaunch.value

    let minMemory: number | undefined = inst.minMemory ?? globalMinMemory.value
    let maxMemory: number | undefined = inst.maxMemory ?? globalMaxMemory.value
    minMemory = assignMemory === true && minMemory > 0
      ? minMemory
      : assignMemory === 'auto' ? Math.floor((await getMemoryStatus()).free / 1024 / 1024 - 256) : undefined
    maxMemory = assignMemory === true && maxMemory > 0 ? maxMemory : undefined

    const vmOptions = inst.vmOptions ?? globalVmOptions.value.filter(v => !!v)
    const mcOptions = inst.mcOptions ?? globalMcOptions.value.filter(v => !!v)

    const options: LaunchOptions = {
      version: instance.value.version || ver.id,
      gameDirectory: path.value,
      user: userProfile.value,
      java: javaRec.path,
      hideLauncher,
      showLog,
      minMemory,
      maxMemory,
      skipAssetsCheck: fastLaunch,
      vmOptions,
      mcOptions,
      yggdrasilAgent,
    }
    return options
  }

  return { generateLaunchOptions }
}

export function useLaunch() {
  const { refreshUser } = useService(UserServiceKey)
  const { launch } = useService(LaunchServiceKey)
  const { userProfile } = injection(kUserContext)
  const { generateLaunchOptions } = useLaunchOption()

  const status = computed(() => '')
  const launchCount = computed(() => 0)

  async function launchGame() {
    const options = await generateLaunchOptions()

    if (!options.skipAssetsCheck) {
      try {
        await refreshUser(userProfile.value.id)
      } catch (e) {
      }
    }
    await launch(options)
  }
  return {
    launchCount,
    status,
    launch: launchGame,
  }
}
