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
import { kLaunchTask, useLaunchTask } from './launchTask'
import { kModsSearch, useModsSearch } from './modSearch'
import { kModSearchItems, useModSearchItems } from './modSearchItems'
import { useMods } from './mods'
import { kInstanceSave, useInstanceSaves } from './save'
import { kUserContext, useUserContext } from './user'
import { kUserDiagnose, useUserDiagnose } from './userDiagnose'

/**
 * The context to hold the instance related data. This is used to share data between different components.
 */
export function useContext() {
  const user = useUserContext()
  const instance = useInstance()
  const instanceVersion = useInstanceVersion(instance.instance)
  const java = useInstanceJava(instance.instance, instanceVersion.resolvedVersion)
  const options = useInstanceOptions(instance.instance)
  const saves = useInstanceSaves(instance.instance)
  const resourcePacks = useInstanceResourcePacks(options.gameOptions)
  const mods = useInstanceMods(instance.instance, java.java)
  const files = useInstanceFiles(instance.path)
  const task = useLaunchTask(instance.path, instance.runtime, instanceVersion.versionHeader)

  const allMods = useMods()
  const modsSearch = useModsSearch(ref(''), allMods.resources, instance.runtime, mods.mods)
  const modSearchItems = useModSearchItems(modsSearch.keyword, modsSearch.modrinth, modsSearch.curseforge, modsSearch.mods, modsSearch.existedMods)

  const versionDiagnose = useInstanceVersionDiagnose(instance.runtime, instanceVersion.resolvedVersion)
  const javaDiagnose = useInstanceJavaDiagnose(java.recommendation)
  const filesDiagnose = useInstanceFilesDiagnose(files.files, files.install)
  const userDiagnose = useUserDiagnose(user.userProfile)

  provide(kUserContext, user)
  provide(kInstance, instance)
  provide(kInstanceVersion, instanceVersion)
  provide(kInstanceJava, java)
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
