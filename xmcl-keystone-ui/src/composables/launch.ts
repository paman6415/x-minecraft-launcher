import { useService } from '@/composables'
import { injection } from '@/util/inject'
import { BaseServiceKey, LaunchServiceKey, UserServiceKey } from '@xmcl/runtime-api'
import { computed } from 'vue'
import { DialogKey } from './dialog'
import { kInstance } from './instance'
import { kInstanceJava } from './instanceJava'
import { kInstanceVersion } from './instanceVersion'
import { kUserContext } from './user'
import { useGlobalSettings } from './setting'

export const LaunchStatusDialogKey: DialogKey<void> = 'launch-status'

export function useLaunch() {
  const { refreshUser } = useService(UserServiceKey)
  const { getMemoryStatus } = useService(BaseServiceKey)
  const { state, launch } = useService(LaunchServiceKey)

  const { globalAssignMemory, globalMaxMemory, globalMinMemory, globalMcOptions, globalVmOptions, globalFastLaunch, globalHideLauncher, globalShowLog } = useGlobalSettings()
  const { path, instance } = injection(kInstance)
  const { resolvedVersion } = injection(kInstanceVersion)
  const { java } = injection(kInstanceJava)
  const { userProfile } = injection(kUserContext)

  const status = computed(() => state.status)
  const launchCount = computed(() => state.activeCount)

  async function launchGame() {
    const ver = resolvedVersion.value
    if (!ver) {
      // TODO: show error
      throw new Error()
    }
    const javaRec = java.value
    if (!javaRec) {
      // TODO: show error
      throw new Error()
    }

    const inst = instance.value
    const assignMemory = inst.assignMemory ?? globalAssignMemory.value
    const fastLaunch = inst.fastLaunch ?? globalFastLaunch.value
    const hideLauncher = inst.hideLauncher ?? globalHideLauncher.value
    const showLog = inst.showLog ?? globalShowLog.value

    if (!fastLaunch) {
      try {
        await refreshUser(userProfile.value.id)
      } catch (e) {
      }
    }

    let minMemory: number | undefined = inst.minMemory ?? globalMinMemory.value
    let maxMemory: number | undefined = inst.maxMemory ?? globalMaxMemory.value
    minMemory = assignMemory === true && minMemory > 0
      ? minMemory
      : assignMemory === 'auto' ? Math.floor((await getMemoryStatus()).free / 1024 / 1024 - 256) : undefined
    maxMemory = assignMemory === true && maxMemory > 0 ? maxMemory : undefined

    const vmOptions = inst.vmOptions ?? globalVmOptions.value.filter(v => !!v)
    const mcOptions = inst.mcOptions ?? globalMcOptions.value.filter(v => !!v)

    await launch({
      gameDirectory: path.value,
      version: instance.value.version || ver.id,
      java: javaRec.path,
      user: userProfile.value,
      minMemory,
      maxMemory,
      vmOptions,
      mcOptions,
      hideLauncher,
      showLog,
    })
  }
  return {
    launchCount,
    status,
    launch: launchGame,
  }
}
