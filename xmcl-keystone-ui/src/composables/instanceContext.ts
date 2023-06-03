import { InjectionKey } from 'vue'
import { useInstance, useInstanceIsServer } from './instance'
import { useInstanceJava } from './instanceJava'
import { kInstanceModsContext, useInstanceMods } from './instanceMods'
import { useInstanceOptions } from './instanceOptions'
import { useInstanceVersion } from './instanceVersion'
import { useLaunchTask } from './launchTask'
import { useInstanceSaves } from './save'
import { useInstanceResourcePacks } from './instanceResourcePack'
import { useInstanceVersionDiagnose } from './instanceVersionDiagnose'
import { useInstanceFilesDiagnose } from './instanceFilesDiagnose'
import { useInstanceJavaDiagnose } from './instanceJavaDiagnose'
import { useUserDiagnose } from './userDiagnose'
import { useService } from './service'
import { UserServiceKey } from '@xmcl/runtime-api'
import { useInstanceFiles } from './instanceFiles'

/**
 * The context to hold the instance related data. This is used to share data between different components.
 */
export function useInstanceContext() {
  const { path, instance, refreshing, select } = useInstance()
  const name = computed(() => instance.value.name)
  const { runtime, versionHeader, resolvedVersion, minecraft, forge, fabricLoader, folder, quiltLoader, isValidating: isRefreshingVersion } = useInstanceVersion(instance)
  const isServer = useInstanceIsServer(instance)
  const task = useLaunchTask(path, runtime, versionHeader)
  const java = useInstanceJava(instance, resolvedVersion)

  const options = useInstanceOptions(instance)
  const saves = useInstanceSaves(instance)
  const resourcePacks = useInstanceResourcePacks(options.gameOptions)
  const mods = useInstanceMods(instance, java.java)
  const files = useInstanceFiles(path)

  provide(kInstanceModsContext, mods)

  const versionDiagnose = useInstanceVersionDiagnose(runtime, resolvedVersion)
  const javaDiagnose = useInstanceJavaDiagnose(java.recommendation)
  const filesDiagnose = useInstanceFilesDiagnose(files.files, files.install)
  const { state } = useService(UserServiceKey)
  const userDiagnose = useUserDiagnose(computed(() => state.users[state.selectedUser.id]))

  return {
    path,
    name,
    mods,
    options,
    java,
    saves,
    files,
    resourcePacks,
    version: runtime,
    isRefreshingVersion,
    resolvedVersion,
    minecraft,
    forge,
    fabricLoader,
    folder,
    quiltLoader,
    instance,
    isServer,
    refreshing,
    select,

    task,

    versionDiagnose,
    javaDiagnose,
    filesDiagnose,
    userDiagnose,
  }
}

export const kInstanceContext: InjectionKey<ReturnType<typeof useInstanceContext>> = Symbol('InstanceContext')
