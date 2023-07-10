import { kInstance, useInstance } from './instance'
import { kInstanceFiles, useInstanceFiles } from './instanceFiles'
import { kInstanceFilesDiagnose, useInstanceFilesDiagnose } from './instanceFilesDiagnose'
import { kInstanceJava, useInstanceJava } from './instanceJava'
import { kInstanceJavaDiagnose, useInstanceJavaDiagnose } from './instanceJavaDiagnose'
import { kInstanceModsContext, useInstanceMods } from './instanceMods'
import { kInstanceOptions, useInstanceOptions } from './instanceOptions'
import { kInstanceResourcePacks, useInstanceResourcePacks } from './instanceResourcePack'
import { kInstanceVersion, useInstanceVersion } from './instanceVersion'
import { kInstanceVersionDiagnose, useInstanceVersionDiagnose } from './instanceVersionDiagnose'
import { useInstances } from './instances'
import { kJavaContext, useJavaContext } from './java'
import { kLaunchTask, useLaunchTask } from './launchTask'
import { kModsSearch, useModsSearch } from './modSearch'
import { kModSearchItems, useModSearchItems } from './modSearchItems'
import { useMods } from './mods'
import { kInstanceSave, useInstanceSaves } from './save'
import { kUserContext, useUserContext } from './user'
import { kUserDiagnose, useUserDiagnose } from './userDiagnose'
import { useLocalVersions } from './versionLocal'

/**
 * The context to hold the instance related data. This is used to share data between different components.
 */
export function useContext() {
  const user = useUserContext()
  const java = useJavaContext()
  const localVersions = useLocalVersions()
  const instances = useInstances()
  const instance = useInstance(instances.instances)
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
  const javaDiagnose = useInstanceJavaDiagnose(instanceJava.recommendation)
  const filesDiagnose = useInstanceFilesDiagnose(files.files, files.install)
  const userDiagnose = useUserDiagnose(user.userProfile)

  provide(kUserContext, user)
  provide(kJavaContext, java)
  provide(kInstance, instance)
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
}
