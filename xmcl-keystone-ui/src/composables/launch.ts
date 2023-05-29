import { computed } from 'vue'
import { BaseServiceKey, LaunchServiceKey, UserServiceKey } from '@xmcl/runtime-api'
import { DialogKey } from './dialog'
import { useService } from '@/composables'
import { injection } from '@/util/inject'
import { kInstanceContext } from './instanceContext'

export const LaunchStatusDialogKey: DialogKey<void> = 'launch-status'

export function useLaunch() {
  const { state: userState } = useService(UserServiceKey)
  const { path, resolvedVersion, instance, java: { java } } = injection(kInstanceContext)
  const { state, launch } = useService(LaunchServiceKey)
  const status = computed(() => state.status)
  const launchCount = computed(() => state.activeCount)

  function launchGame() {
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
    launch({
      gameDirectory: path.value,
      version: instance.value.version || ver.id,
      java: javaRec.path,
      user: userState.users[userState.selectedUser.id],
    })
  }
  return {
    launchCount,
    status,
    launch: launchGame,
  }
}
