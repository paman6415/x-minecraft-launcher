import { InjectionKey } from 'vue'
import { useInstance, useInstanceIsServer } from './instance'
import { useInstanceJava } from './instanceJava'
import { kInstanceModsContext, useInstanceMods } from './instanceMods'
import { useInstanceOptions } from './instanceOptions'
import { useInstanceVersion } from './instanceVersion'
import { useLaunchIssue } from './launchIssue'
import { useLaunchTask } from './launchTask'
import { useInstanceSaves } from './save'
import { useInstanceResourcePacks } from './instanceResourcePack'

/**
 * The context to hold the instance related data. This is used to share data between different components.
 */
export function useInstanceContext() {
  const issue = useLaunchIssue()
  const { path, instance, refreshing, select } = useInstance()
  const name = computed(() => instance.value.name)
  const { runtime, versionHeader, resolvedVersion, minecraft, forge, fabricLoader, folder, quiltLoader } = useInstanceVersion(instance)
  const task = useLaunchTask(path, runtime, versionHeader)
  const java = useInstanceJava(instance, resolvedVersion)
  const isServer = useInstanceIsServer(instance)

  const options = useInstanceOptions(instance)
  const saves = useInstanceSaves(instance)
  const resourcePacks = useInstanceResourcePacks(options.gameOptions)
  const mods = useInstanceMods(instance, java.java)
  provide(kInstanceModsContext, mods)

  return {
    issue,
    task,
    path,
    name,
    mods,
    options,
    java,
    saves,
    resourcePacks,
    version: runtime,
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
  }
}

export const kInstanceContext: InjectionKey<ReturnType<typeof useInstanceContext>> = Symbol('InstanceContext')
