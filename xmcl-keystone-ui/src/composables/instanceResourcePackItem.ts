import { Instance, InstanceOptionsServiceKey, InstanceResourcePacksServiceKey, ResourceServiceKey } from '@xmcl/runtime-api'
import { Ref, computed, watch } from 'vue'

import { useService } from '@/composables'
import { isStringArrayEquals } from '@/util/equal'
import debounce from 'lodash.debounce'
import { InstanceResourcePack } from './instanceResourcePack'

export interface ResourcePackItem {
  resourcePack: InstanceResourcePack
  name: string
  tags: string[]
}

/**
 * The hook return a reactive resource pack array.
 */
export function useInstanceResourcePackItem(instancePath: Ref<string>, enabledPacks: Ref<InstanceResourcePack[]>, disabledPacks: Ref<InstanceResourcePack[]>) {
  const { updateResources } = useService(ResourceServiceKey)
  const { editGameSetting } = useService(InstanceOptionsServiceKey)
  const { showDirectory } = useService(InstanceResourcePacksServiceKey)

  function getItemFromPack(pack: InstanceResourcePack): ResourcePackItem {
    return {
      resourcePack: markRaw(pack),
      name: pack.name,
      tags: [...pack.tags],
    }
  }

  const enabled = computed(() => enabledPacks.value.map(getItemFromPack))
  const disabled = computed(() => disabledPacks.value.map(getItemFromPack))

  const enabledResourcePackNames = ref(enabledPacks.value.map(p => p.id))

  watch(enabledPacks, (packs) => {
    enabledResourcePackNames.value = packs.map(p => p.id)
  })

  const loading = ref(false)
  const doCommit = debounce(() => commit(), 3000)

  /**
   * Add a new resource to the enabled list
   */
  function add(id: string, to?: string) {
    loading.value = true
    if (typeof to === 'undefined') {
      const found = disabled.value.find(m => m.resourcePack.id === id)
      if (found) {
        enabledResourcePackNames.value.push(id)
      }
    } else {
      const index = enabledResourcePackNames.value.indexOf(to)
      if (index !== -1) {
        enabledResourcePackNames.value.splice(index, 0, id)
        enabledResourcePackNames.value = [...enabledResourcePackNames.value]
      } else {
        enabledResourcePackNames.value.push(id)
      }
    }
    doCommit()
  }

  /**
     * Remove a resource from enabled list
     */
  function remove(id: string) {
    if (id === 'vanilla') {
      return
    }

    loading.value = true
    enabledResourcePackNames.value = enabledResourcePackNames.value.filter(v => v !== id)
    doCommit()
  }

  function insert(from: string, to: string) {
    loading.value = true
    const packs = enabledResourcePackNames.value
    const temp = packs.splice(packs.findIndex(p => p === from), 1)
    packs.splice(packs.findIndex(p => p === to), 0, ...temp)
    enabledResourcePackNames.value = [...packs]
    doCommit()
  }

  /**
   * Commit the change for current mods setting
   */
  function commit() {
    const modified = enabled.value.filter(e => e.name !== e.resourcePack.resource?.name || !isStringArrayEquals(e.tags, e.resourcePack.resource?.tags))
      .concat(disabled.value.filter(e => e.name !== e.resourcePack.resource?.name || !isStringArrayEquals(e.tags, e.resourcePack.resource?.tags)))
      .filter(v => !!v.resourcePack.resource)

    Promise.all([
      editGameSetting({ instancePath: instancePath.value, resourcePacks: [...enabledResourcePackNames.value].reverse() }).catch(console.error),
      updateResources(modified.map(e => ({ hash: e.resourcePack.resource!.hash, name: e.name, tags: e.tags }))).catch(console.error),
    ]).finally(() => {
      loading.value = false
    })
  }

  onUnmounted(() => {
    doCommit.flush()
  })

  return {
    showDirectory,
    enabled,
    disabled,
    add,
    remove,
    insert,
    loading,
  }
}
