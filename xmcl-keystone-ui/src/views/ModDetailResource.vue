<script setup lang="ts">
import { Mod, ModFile } from '@/util/mod'
import ModDetail, { ExternalResource, ModDetailData, Info } from './ModDetail.vue'
import { ModVersion } from './ModDetailVersion.vue'
import { useService } from '@/composables'
import { InstanceModsServiceKey, PartialResourceHash, ResourceServiceKey, RuntimeVersions } from '@xmcl/runtime-api'
import { injection } from '@/util/inject'
import { kInstance } from '@/composables/instance'
import { useModDetailUpdate, useModDetailEnable } from '@/composables/modDetail'
import { clientModrinthV2 } from '@/util/clients'
import { useInstanceModLoaderDefault } from '@/util/instanceModLoaderDefault'
import { isNoModLoader } from '@/util/isNoModloader'
import { getExpectedSize } from '@/util/size'

const props = defineProps<{
  mod: Mod
  files: ModFile[]
  runtime: RuntimeVersions
  installed: ModFile[]
}>()

const versions = computed(() => {
  const files = props.files
  const all: ModVersion[] = files.map((f) => {
    const version: ModVersion = {
      id: f.path,
      name: f.resource.fileName,
      version: f.version,
      downloadCount: 0,
      installed: true,
      loaders: f.modLoaders,
      minecraftVersion: f.dependencies.find((d) => d.modId === 'minecraft')?.semanticVersion as string,
      type: 'release',
      disabled: false,
    }
    return version
  })
  return all
})

const installedVersions = computed(() => {
  const ver = props.mod.installed.map(v => versions.value.find(f => f.id === v.modId)).filter((v): v is ModVersion => !!v)
  return ver
})
const selectedVersion = ref(installedVersions.value[0] ?? versions.value[0])
provide('selectedVersion', selectedVersion)
watch(installedVersions, (v) => {
  if (v) {
    selectedVersion.value = installedVersions.value[0]
  } else {
    selectedVersion.value = versions.value[0]
  }
})

const { t } = useI18n()
const model = computed(() => {
  const file = props.files.find(f => f.path === selectedVersion.value?.id)

  const externals = computed(() => {
    const file = props.files.find(f => f.path === selectedVersion.value?.id)
    const result: ExternalResource[] = []
    if (file?.links.home) {
      result.push({
        icon: 'mdi-home',
        name: 'Home',
        url: file.links.home,
      })
    }
    if (file?.links.issues) {
      result.push({
        icon: 'mdi-bug',
        name: 'Issues',
        url: file.links.issues,
      })
    }
    if (file?.links.source) {
      result.push({
        icon: 'mdi-source-repository',
        name: 'Source',
        url: file.links.source,
      })
    }
    if (file?.links.update) {
      result.push({
        icon: 'mdi-file-document',
        name: 'Javadoc',
        url: file.links.update,
      })
    }

    return result
  })

  const info = computed(() => {
    const result: Info[] = []
    if (!file) return []
    if (file.license) {
      result.push({ icon: 'description', name: t('modrinth.license'), value: file.license.name, url: file.license.url })
    }
    const resource = file.resource
    result.push({
      icon: '123',
      name: t('fileDetail.fileSize'),
      value: getExpectedSize(resource.size),
    }, {
      icon: 'tag',
      name: t('fileDetail.hash'),
      value: resource.hash,
    })
    return result
  })

  const result: ModDetailData = reactive({
    id: props.mod.id,
    icon: props.mod.icon,
    title: props.mod.title,
    description: props.mod.description,
    categories: [],
    externals: externals.value,
    info,
    galleries: [],
    author: computed(() => file?.authors.join(', ') ?? ''),
    downloadCount: 0,
    follows: 0,
    url: computed(() => file?.links.home ?? ''),
    htmlContent: props.mod.description,
    installed: !!props.mod.installed,
    enabled: computed(() => file?.enabled ?? false),
  })
  return result
})

const updating = useModDetailUpdate()
const { enabled, installed, hasInstalledVersion } = useModDetailEnable(selectedVersion, computed(() => props.installed), updating)
const { path } = injection(kInstance)

const { updateResources } = useService(ResourceServiceKey)
watch(() => props.mod, async () => {
  updating.value = false

  const versions = await clientModrinthV2.getProjectVersionsByHash(props.files.map(f => f.hash), 'sha1')

  const options = Object.entries(versions).map(([hash, version]) => {
    const f = props.files.find(f => f.hash === hash)
    if (f) return { hash: f.hash, metadata: { modrinth: { projectId: version.project_id, versionId: version.id } } }
    return undefined
  }).filter((v): v is any => !!v)
  updateResources(options)
})

const installDefaultModLoader = useInstanceModLoaderDefault(path, computed(() => props.runtime))
const { install, uninstall } = useService(InstanceModsServiceKey)
const onDelete = async () => {
  updating.value = true
  const file = props.files.find(f => f.path === selectedVersion.value.id)
  if (file) {
    await uninstall({ path: path.value, mods: [file.resource] })
  }
}

const onInstall = async () => {
  updating.value = true

  const file = props.files.find(f => f.path === selectedVersion.value.id)
  if (file) {
    if (isNoModLoader(props.runtime)) {
      // forge, fabric, quilt or neoforge
      await installDefaultModLoader(file.modLoaders)
    }

    await install({ path: path.value, mods: [file.resource] })
  }
}

</script>
<template>
  <ModDetail
    :detail="model"
    :dependencies="[]"
    :enabled="enabled"
    :has-installed-version="hasInstalledVersion"
    :selected-installed="installed"
    :loading="false"
    :versions="versions"
    :updating="updating"
    :has-more="false"
    :loading-versions="false"
    @install="onInstall"
    @delete="onDelete"
    @enable="enabled = $event"
  />
</template>
