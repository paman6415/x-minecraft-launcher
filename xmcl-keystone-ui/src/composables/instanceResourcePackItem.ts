import { PackMeta } from '@xmcl/resourcepack'
import { Instance, InstanceOptionsServiceKey, InstanceResourcePacksServiceKey, isPersistedResource, packFormatVersionRange, Persisted, Resource, ResourcePackResource, ResourceServiceKey } from '@xmcl/runtime-api'
import { computed, onMounted, ref, Ref, watch } from 'vue'

import unknownPack from '@/assets/unknown_pack.png'
import { useService, useServiceBusy } from '@/composables'
import { isStringArrayEquals } from '@/util/equal'
import { kResourcePacks, useResourcePacks } from './resourcePacks'
import { injection } from '@/util/inject'
import { kInstanceContext } from './instanceContext'
import { InstanceResourcePack } from './instanceResourcePack'

export interface ResourcePackItem {
  resourcePack: InstanceResourcePack
  tags: string[]
}

/**
 * The hook return a reactive resource pack array.
 */
export function useInstanceResourcePacks(instance: Ref<Instance>, enabledPacks: Ref<InstanceResourcePack[]>, disabledPacks: Ref<InstanceResourcePack[]>) {
  const { updateResources } = useService(ResourceServiceKey)
  const { editGameSetting } = useService(InstanceOptionsServiceKey)
  const { showDirectory } = useService(InstanceResourcePacksServiceKey)
  const { t } = useI18n()

  function getItemFromPack(pack: InstanceResourcePack): ResourcePackItem {
    return {
      resourcePack: pack,
      tags: [...pack.tags],
    }
  }

  const enabled = computed(() => enabledPacks.value.map(getItemFromPack))
  const disabled = computed(() => disabledPacks.value.map(getItemFromPack))

  /**
   * Add a new resource to the enabled list
   */
  function add(id: string, to?: string) {
    if (typeof to === 'undefined') {
      const found = disabled.value.find(m => m.id === id)
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
  }

  /**
     * Remove a resource from enabled list
     */
  function remove(id: string) {
    if (id === 'vanilla') {
      return
    }

    editGameSetting({ instancePath: instance.value.path, resourcePacks: [...enabled.value.map(e => e.resourcePack.id).filter(v => v !== id)].reverse() })
  }

  function insert(from: string, to: string) {
    const packs = enabledResourcePackNames.value
    const temp = packs.splice(packs.findIndex(p => p === from), 1)
    packs.splice(packs.findIndex(p => p === to), 0, ...temp)
    enabledResourcePackNames.value = [...packs]
  }

  /**
     * Commit the change for current mods setting
     */
  function commit() {
    editGameSetting({ instancePath: path.value, resourcePacks: [...enabledResourcePackNames.value].reverse() })
    const modified = storage.value.filter(v => v.resource).filter((v) => v.name !== v.resource!.name || !isStringArrayEquals(v.tags, v.resource!.tags))
    updateResources(modified.map(res => ({ ...res.resource!, name: res.name, tags: res.tags })))
  }

  watch(optionsResourcePacks, (packs) => {
    const arr = [...packs.map((p) => ((p === 'vanilla' || p.startsWith('file/')) ? p : `file/${p}`))]
    if (arr.indexOf('vanilla') === -1) {
      arr.unshift('vanilla')
    }
    enabledResourcePackNames.value = arr.reverse()
  })
  onMounted(() => {
    storage.value = resources.value.map(getResourcePackItem)

    const arr = [...optionsResourcePacks.value.map((p) => ((p === 'vanilla' || p.startsWith('file/')) ? p : `file/${p}`))]
    if (arr.indexOf('vanilla') === -1) {
      arr.unshift('vanilla')
    }
    enabledResourcePackNames.value = arr.reverse()
  })

  watch(resources, (packs) => {
    storage.value = packs.map(getResourcePackItem)
  })

  return {
    showDirectory,
    modified,
    enabled,
    disabled,
    add,
    remove,
    commit,
    insert,
    loading,
  }
}
