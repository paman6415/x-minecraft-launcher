import { InstanceFile, InstanceInstallServiceKey } from '@xmcl/runtime-api'
import { Ref } from 'vue'
import { IssueItem } from './issues'
import { useRefreshable } from './refreshable'
import { useService } from './service'

export function useInstanceFilesDiagnose(instancePath: Ref<string>) {
  const files: Ref<InstanceFile[]> = ref([])
  const { checkInstanceInstall, installInstanceFiles } = useService(InstanceInstallServiceKey)

  let abortController = new AbortController()
  const { refresh, error, refreshing } = useRefreshable(async () => {
    abortController.abort()
    abortController = new AbortController()
    const abortSignal = abortController.signal
    const result = await checkInstanceInstall(instancePath.value)
    // If abort, just ignore this result
    if (abortSignal.aborted) { return }
    files.value = result
  })

  const issueItems = ref([] as IssueItem[])

  async function fix() {
    if (files.value.length > 0) {
      // has unfinished files
      try {
        await installInstanceFiles({ files: files.value, path: instancePath.value })
      } finally {
        refresh()
      }
    } else {
      refresh()
    }
  }

  onMounted(() => refresh())
  watch(instancePath, () => refresh())

  return {
    issues: issueItems,
    refreshing,
    refresh,
    error,
    fix,
  }
}
