<template>
  <v-card>
    <v-card-title>
      <v-icon left>
        $vuetify.icons.modrinth
      </v-icon>
      Modrinth
      {{ t('modpack.name', 1) }}
      <v-spacer />
      <v-btn
        icon
        @click="goToPage"
      >
        <v-icon>
          open_in_new
        </v-icon>
      </v-btn>
    </v-card-title>
    <v-card-text v-if="project">
      <p v-html="t('modrinthCard.projectHint', { title: project.title, id: project.id })" />
      <div>
        {{ t('modrinthCard.projectLastUpdateDate') }}
        <span
          class="text--primary"
        >
          {{ getLocalDateString(project.updated) }}
        </span>
      </div>
      <div
        class="grid grid-cols-2"
      >
        <div v-if="currentVersion">
          {{ t('modrinthCard.currentVersion') }}:
          <span class="text--primary">
            {{ currentVersion.version_number }}
          </span>
        </div>
        <div v-if="latestVersion">
          {{ t('modrinthCard.projectLastUpdateVersion') }}:
          <span
            class="text--primary"
          >
            {{ latestVersion.version_number }}
          </span>
        </div>
      </div>
    </v-card-text>
    <v-card-text v-else>
      <v-skeleton-loader
        type="paragraph"
      />
    </v-card-text>
    <v-card-actions>
      <v-btn
        text
        :loading="refreshing"
        @click="checkUpdate()"
      >
        {{ t('checkUpdate.name') }}
      </v-btn>
      <v-spacer />
      <v-btn
        v-if="latestVersion"
        :disabled="refreshing || !hasUpdate"
        :loading="refreshing || downloadingModpack"
        color="teal accent-4"
        text
        @click="update()"
      >
        <template v-if="hasUpdate && currentVersion && !pendingModpack">
          {{ t('download') }} ({{ currentVersion.version_number }} -> {{ latestVersion.version_number }})
        </template>
        <template v-else-if="hasUpdate && currentVersion && pendingModpack">
          {{ t('install') }} ({{ currentVersion.version_number }} -> {{ latestVersion.version_number }})
        </template>
        <template v-else>
          {{ t('launcherUpdate.noUpdateAvailable' ) }}
        </template>
      </v-btn>
    </v-card-actions>
  </v-card>
</template>
<script lang="ts" setup>
import { Project, ProjectVersion } from '@xmcl/modrinth'
import { CurseForgeServiceKey, InstanceData, ModpackServiceKey, ModrinthServiceKey, ResourceServiceKey } from '@xmcl/runtime-api'
import { useDialog } from '../composables/dialog'
import { useService, useServiceBusy } from '@/composables'
import { getLocalDateString } from '@/util/date'
import { InstanceInstallDialog } from '@/composables/instanceUpgrade'
import { File } from '@xmcl/curseforge'

const props = defineProps<{
  instance: InstanceData
  upstream: Required<InstanceData>['upstream']
}>()

const { state } = useService(ResourceServiceKey)
const currentModpack = computed(() => {
  if (props.upstream.type === 'modrinth-modpack') {
    const upstream = props.upstream
    return state.modpacks.find(v => v.metadata.modrinth &&
      v.metadata.modrinth.projectId === upstream.projectId &&
      v.metadata.modrinth.versionId === upstream.versionId)
  }
  if (props.upstream.type === 'curseforge-modpack') {
    const upstream = props.upstream
    return state.modpacks.find(v => v.metadata.curseforge &&
      v.metadata.curseforge.projectId === upstream.modId &&
      v.metadata.curseforge.fileId === upstream.fileId)
  }
  return undefined
})

const { getLatestProjectVersion, getProject, getProjectVersion, installVersion } = useService(ModrinthServiceKey)
const { fetchProjectFiles, installFile, fetchModFiles } = useService(CurseForgeServiceKey)

const currentVersion = ref(undefined as undefined | ProjectVersion | File)
const latestVersion = ref(undefined as undefined | ProjectVersion | File)

const hasUpdate = computed(() => latestVersion.value && latestVersion.value.id !== props.upstream.versionId)
const pendingModpack = computed(() => !latestVersion.value ? undefined : state.modpacks.find(m => m.metadata.modrinth?.projectId === latestVersion.value?.project_id && m.metadata.modrinth?.versionId === latestVersion.value?.id))

const refreshingLatestProjectVersion = useServiceBusy(ModrinthServiceKey, 'getLatestProjectVersion', computed(() => currentModpack.value?.hash ?? ''))
const refreshingProject = useServiceBusy(ModrinthServiceKey, 'getProject')
const refreshing = computed(() => refreshingLatestProjectVersion.value || refreshingProject.value)

async function checkUpdate() {
  if (props.upstream.type === 'modrinth-modpack') {
    const hash = props.upstream.sha1 || currentModpack?.value?.hash
    if (!hash) {
      // TODO: show error
      return
    }
    latestVersion.value = await getLatestProjectVersion(hash)
  } else if (props.upstream.type === 'curseforge-modpack') {
    const result = await fetchProjectFiles({ modId: props.upstream.modId, gameVersion: '', pageSize: 1 })
  }
}

const downloadingModpack = useServiceBusy(ModrinthServiceKey, 'installVersion', computed(() => latestVersion.value?.id ?? ''))
const { push } = useRouter()
function goToPage() {
  if (props.upstream.type === 'modrinth-modpack') {
    push(`/modrinth/${props.upstream.projectId}`)
  } else if (props.upstream.type === 'curseforge-modpack') {
    push(`/curseforge/${props.upstream.modId}`)
  }
}

async function refreshProject() {
  if (props.upstream.type === 'modrinth-modpack') {
    currentVersion.value = await getProjectVersion(props.upstream.versionId)
  } else if (props.upstream.type === 'curseforge-modpack') {
    currentVersion.value = await getProjectVersion(props.upstream.fileId)
  }
}

const { show } = useDialog(InstanceInstallDialog)

async function update() {
  if (latestVersion.value) {
    if (!pendingModpack.value) {
      await installVersion({ version: latestVersion.value, project: project.value })
    } else {
      show({
        type: 'modrinth',
        project: project.value!,
        current: currentVersion.value!,
        latest: latestVersion.value,
        currentResource: currentModpack.value,
        resource: pendingModpack.value,
      })
    }
  }
}

watch(computed(() => props.upstream), refreshProject)

onMounted(() => {
  refreshProject()
  checkUpdate()
})

const { t } = useI18n()
</script>
