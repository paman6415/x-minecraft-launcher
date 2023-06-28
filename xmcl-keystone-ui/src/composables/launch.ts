import { useService } from '@/composables'
import { injection } from '@/util/inject'
import { BaseServiceKey, LaunchServiceKey, UserServiceKey } from '@xmcl/runtime-api'
import { computed } from 'vue'
import { DialogKey } from './dialog'
import { kInstanceContext } from './instanceContext'

export const LaunchStatusDialogKey: DialogKey<void> = 'launch-status'

export function useLaunch() {
  const { state: userState, refreshUser } = useService(UserServiceKey)
  const { state: globalState, getMemoryStatus } = useService(BaseServiceKey)
  const { path, resolvedVersion, instance, java: { java } } = injection(kInstanceContext)
  const { state, launch } = useService(LaunchServiceKey)
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
    const assignMemory = inst.assignMemory ?? globalState.globalAssignMemory
    let minMemory: number | undefined = inst.minMemory ?? globalState.globalMinMemory
    let maxMemory: number | undefined = inst.maxMemory ?? globalState.globalMaxMemory

    if (!inst.fastLaunch) {
      try {
        await refreshUser()
      } catch (e) {
      }
    }

    minMemory = assignMemory === true && minMemory > 0
      ? minMemory
      : assignMemory === 'auto' ? Math.floor((await getMemoryStatus()).free / 1024 / 1024 - 256) : undefined
    maxMemory = assignMemory === true && maxMemory > 0 ? maxMemory : undefined

    const vmOptions = inst.vmOptions ?? globalState.globalVmOptions.filter(v => !!v)
    const mcOptions = inst.mcOptions ?? globalState.globalMcOptions.filter(v => !!v)

    await launch({
      gameDirectory: path.value,
      version: instance.value.version || ver.id,
      java: javaRec.path,
      user: userState.users[userState.selectedUser.id],
      minMemory,
      maxMemory,
      vmOptions,
      mcOptions,
    })
  }
  return {
    launchCount,
    status,
    launch: launchGame,
  }
}
