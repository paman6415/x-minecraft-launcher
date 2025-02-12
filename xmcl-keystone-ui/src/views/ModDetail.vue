<template>
  <div
    class="mod-detail contained w-full overflow-auto"
    @scroll="onScroll"
  >
    <div class="flex flex-grow gap-4 p-4">
      <div class="self-center">
        <v-img
          width="128"
          height="128"
          class="rounded-xl"
          :src="detail.icon || unknownServer"
        />
      </div>
      <div class="flex flex-col">
        <span
          v-if="detail.url"
        >
          <a
            class="text-2xl font-bold"
            target="browser"
            :href="detail.url"
          >
            {{ detail.title }}
          </a>
        </span>
        <span
          v-else
          class="text-2xl font-bold"
        >
          {{ detail.title }}
        </span>
        <div class="flex flex-grow-0 items-center gap-2">
          {{ detail.author }}
          <v-divider
            v-if="detail.author"
            vertical
          />
          <div
            v-if="detail.downloadCount"
            class="flex flex-grow-0"
          >
            <v-icon
              class="material-icons-outlined pb-0.5"
              :size="22"
              left
            >
              file_download
            </v-icon>
            {{ getExpectedSize(detail.downloadCount, '') }}
          </div>
          <v-divider vertical />
          <div
            v-if="detail.follows"
            class="flex flex-grow-0"
          >
            <v-icon
              color="orange"
              left
              class="material-icons-outlined text-gray-300"
            >
              star_rate
            </v-icon>
            {{ detail.follows }}
          </div>
        </div>
        <div class="my-1">
          {{ detail.description }}
        </div>
        <div
          class="my-2 flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-end"
        >
          <div class="flex items-end gap-2">
            <v-btn
              v-if="selectedInstalled && !noEnabled"
              :disabled="updating"
              small
              plain
              outlined
              hide-details
              @click="_enabled = !_enabled"
            >
              <v-icon left>
                {{ enabled ? 'flash_off' : 'flash_on' }}
              </v-icon>
              {{ !enabled ? t('enable') : t('disable') }}
            </v-btn>
            <v-btn
              v-if="!selectedInstalled"
              class="primary"
              :loading="loadingVersions || updating"
              :disabled="!selectedVersion"
              small
              @click="onInstall"
            >
              <v-icon
                class="material-icons-outlined"
                left
              >
                file_download
              </v-icon>
              {{ !hasInstalledVersion ? t('modInstall.install') : t('modInstall.switch') }}
            </v-btn>
            <div
              v-if="!selectedInstalled"
              class="v-card border-transparent bg-transparent"
              :class="{ 'theme--dark': isDark, 'theme--light': !isDark }"
            >
              <div class="v-card__subtitle overflow-hidden overflow-ellipsis whitespace-nowrap p-0">
                {{
                  versions.length > 0 ?
                    t('modInstall.installHint', { file: 1, dependencies: dependencies.filter(d => d.type === 'required').length })
                    : t('modInstall.noVersionSupported')
                }}
              </div>
            </div>
            <v-btn
              v-if="selectedInstalled && !noDelete"
              class="red"
              :loading="loadingVersions"
              :disabled="!selectedVersion || updating"
              small
              @click="emit('delete')"
            >
              <v-icon
                class="material-icons-outlined"
                left
              >
                delete
              </v-icon>
              {{ t('mod.deletion') }}
            </v-btn>
          </div>

          <div class="flex-grow" />
          <div class="text-center">
            <v-menu
              open-on-hover
              offset-y
            >
              <template #activator="{ on, attrs }">
                <div
                  class="cursor-pointer text-gray-600 dark:text-gray-400"
                  :class="{ flex: versions.length > 0, hidden: versions.length === 0 }"
                  :loading="loadingVersions"
                  v-bind="attrs"
                  v-on="on"
                >
                  <span class="mr-2 whitespace-nowrap">
                    {{ t('modInstall.currentVersion') }}:
                  </span>
                  <span class="max-w-40 xl:max-w-50 block overflow-hidden overflow-ellipsis whitespace-nowrap underline 2xl:max-w-full">
                    {{ selectedVersion?.name }}
                  </span>
                  <v-icon
                    class="material-icons-outlined"
                    right
                  >
                    arrow_drop_down
                  </v-icon>
                </div>
              </template>
              <v-list
                class="max-h-[400px] overflow-auto"
                dense
              >
                <v-list-item
                  v-for="(item, index) in versions"
                  :key="index"
                  :class="{ 'v-list-item--active': item === selectedVersion }"
                  :value="item.installed"
                  @click="selectedVersion = item"
                >
                  <v-list-item-content>
                    <v-list-item-title>{{ item.name }}</v-list-item-title>
                    <v-list-item-subtitle>{{ item.version }}</v-list-item-subtitle>
                  </v-list-item-content>
                  <v-list-item-avatar
                    class="self-center"
                  >
                    <v-icon
                      v-if="item.installed"
                      small
                    >
                      folder
                    </v-icon>
                  </v-list-item-avatar>
                </v-list-item>
              </v-list>
            </v-menu>
          </div>
        </div>
      </div>
    </div>

    <v-tabs
      v-model="tab"
      background-color="transparent"
    >
      <v-tab>
        {{ t('modrinth.description') }}
      </v-tab>
      <v-tab :disabled="props.detail.galleries.length === 0">
        {{ t('modrinth.gallery') }}
      </v-tab>
      <v-tab>
        {{ t('modrinth.versions') }}
      </v-tab>
    </v-tabs>
    <v-divider />

    <div class="grid w-full grid-cols-4 gap-2">
      <v-tabs-items
        v-model="tab"
        class="col-span-3 h-full max-h-full max-w-full bg-transparent p-4"
      >
        <v-tab-item>
          <v-expansion-panels
            v-model="showDependencies"
            :disabled="dependencies.length === 0"
            class="mb-4"
          >
            <v-expansion-panel>
              <v-expansion-panel-header>
                <span>
                  <v-badge
                    inline
                    :content="dependencies.length || '0'"
                  >
                    {{ t('dependencies.name') }}
                  </v-badge>
                </span>
              </v-expansion-panel-header>
              <v-expansion-panel-content>
                <div class="">
                  <template
                    v-if="loadingDependencies"
                  >
                    <v-skeleton-loader
                      type="list-item-two-line, list-item-two-line"
                    />
                    <v-skeleton-loader
                      type="list-item-two-line, list-item-two-line"
                    />
                    <v-skeleton-loader
                      type="list-item-two-line, list-item-two-line"
                    />
                  </template>
                  <template v-else>
                    <v-list-item
                      v-for="dep of dependencies"
                      :key="dep.id"
                      @click="emit('open-dependency', dep)"
                    >
                      <v-list-item-avatar>
                        <v-img :src="dep.icon" />
                      </v-list-item-avatar>
                      <v-list-item-content>
                        <v-list-item-title>
                          {{ dep.title }}
                        </v-list-item-title>
                        <v-list-item-subtitle>
                          {{ dep.description }}
                        </v-list-item-subtitle>
                        <v-list-item-subtitle class="flex gap-2">
                          <div
                            class="inline font-bold"
                            :class="{
                              'text-red-400': dep.type === 'incompatible',
                              'text-green-400': dep.type === 'required'
                            }"
                          >
                            {{ tDepType(dep.type) }}
                          </div>
                          <v-divider
                            v-if="dep.installedVersion"
                            vertical
                          />
                          <div v-if="dep.installedVersion">
                            {{ t('modInstall.installed') }}
                          </div>
                          <v-divider
                            v-if="dep.installedDifferentVersion"
                            vertical
                          />
                          <span v-if="dep.installedDifferentVersion">
                            {{ t('modInstall.dependencyHint', { version: dep.installedDifferentVersion }) }}
                          </span>
                        </v-list-item-subtitle>
                      </v-list-item-content>
                      <v-list-item-action class="self-center">
                        <v-btn
                          text
                          icon
                          :disabled="!!dep.installedVersion"
                          :loading="dep.progress >= 0"
                          @click.stop="emit('install-dependency', dep)"
                        >
                          <v-icon class="material-icons-outlined">
                            file_download
                          </v-icon>
                          <template #loader>
                            <v-progress-circular
                              v-if="dep.progress >= 0"
                              :size="20"
                              :width="2"
                              :value="dep.progress * 100"
                            />
                          </template>
                        </v-btn>
                      </v-list-item-action>
                    </v-list-item>
                  </template>
                </div>
              </v-expansion-panel-content>
            </v-expansion-panel>
          </v-expansion-panels>
          <v-card-text
            v-if="loading"
            class="overflow-auto"
          >
            <v-skeleton-loader type="heading, list-item, paragraph, card, sentences, image, paragraph, paragraph" />
          </v-card-text>
          <div
            v-else
            class="markdown-body select-text whitespace-normal"
            :class="{ 'project-description': curseforge }"
            v-html="detail.htmlContent"
          />
        </v-tab-item>
        <v-tab-item>
          <div class="grid grid-cols-2 gap-2 p-4">
            <v-card
              v-for="g of detail.galleries"
              :key="g.url + g.title"
              hover
              @click="emit('show-image', g)"
            >
              <v-img
                :src="g.url"
                height="200px"
              />
              <v-card-title>
                {{ g.title }}
              </v-card-title>
              <v-card-subtitle>
                {{ g.description }}
                <div v-if="g.date">
                  {{ getLocalDateString(g.date) }}
                </div>
              </v-card-subtitle>
            </v-card>
          </div>
        </v-tab-item>
        <v-tab-item class="h-full">
          <v-skeleton-loader
            v-if="loadingVersions"
            type="table-thead, table-tbody"
          />
          <template v-else-if="versions.length > 0">
            <ModDetailVersion
              v-for="version of versions"
              :key="version.id"
              :version="version"
              :show-changelog="selectedVersion?.id === version.id"
              @click="onVersionClicked"
            />
          </template>
          <Hint
            v-else
            class="h-full"
            :size="100"
            icon="cancel"
            :text="t('modInstall.noVersionSupported')"
          />
        </v-tab-item>
      </v-tabs-items>

      <aside>
        <template v-if="curseforge || modrinth">
          <v-subheader>
            {{ t('modInstall.source') }}
          </v-subheader>
          <span class="flex flex-wrap gap-2 px-2">
            <v-icon
              v-if="modrinth"
            >
              $vuetify.icons.modrinth
            </v-icon>
            <v-icon
              v-if="curseforge"
              class="mt-0.5"
              :size="30"
            >
              $vuetify.icons.curseforge
            </v-icon>
          </span>

          <v-divider
            class="mt-4 w-full"
          />
        </template>

        <v-subheader v-if="detail.categories.length > 0">
          {{ t('modrinth.categories.categories') }}
        </v-subheader>
        <span class="flex flex-wrap gap-2">
          <v-chip
            v-for="item of detail.categories"
            :key="item.name"
            label
            outlined
            class="mr-2"
          >
            <v-avatar
              v-if="item.iconHTML"
              left
              v-html="item.iconHTML"
            />
            <v-icon
              v-else-if="item.icon"
              left
            >{{ item.icon }}</v-icon>
            <v-avatar
              v-else-if="item.iconUrl"
              left
            >
              <v-img :src="item.iconUrl" />
            </v-avatar>
            {{ item.name }}
          </v-chip>
        </span>

        <v-divider
          v-if="detail.externals.length > 0 && detail.categories.length > 0"
          class="mt-4 w-full"
        />

        <v-subheader v-if="detail.externals.length > 0">
          {{ t('modrinth.externalResources') }}
        </v-subheader>
        <div class="px-1">
          <a
            v-for="item of detail.externals"
            :key="item.name + item.url"
            :href="item.url"
            class="flex flex-grow-0 items-center gap-1"
          >
            <v-icon>{{ item.icon }}</v-icon>
            <span class="hover:underline">
              {{ item.name }}
            </span>
          </a>
        </div>

        <v-divider
          v-if="detail.info.length > 0 && detail.externals.length > 0"
          class="mt-4 w-full"
        />

        <div
          v-if="detail.info.length > 0"
          class="px-1"
        >
          <v-subheader>
            {{ t('modrinth.technicalInformation') }}
          </v-subheader>
          <div class="grid grid-cols-1 gap-1 gap-y-3 overflow-auto overflow-y-hidden pr-2">
            <div
              v-for="item of detail.info"
              :key="item.name"
              class="item"
            >
              <v-icon>{{ item.icon }}</v-icon>
              <div class="overflow-x-auto overflow-y-hidden">
                <span>{{ item.name }}</span>
                <a
                  v-if="item.url"
                  :href="item.url"
                >
                  {{ item.value }}
                </a>
                <v-chip
                  v-else
                  v-shared-tooltip="item.value"
                  v-ripple
                  color="grey darken-4"
                  class="cursor-pointer"
                  small
                  @click="onInfoClicked(item.value)"
                >
                  <span
                    class=" select-text overflow-hidden overflow-ellipsis"
                  >
                    {{ item.value }}
                  </span>
                  <v-icon
                    x-small
                    right
                  >
                    content_copy
                  </v-icon>
                </v-chip>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>
<script setup lang="ts">
import { getLocalDateString } from '@/util/date'
import ModDetailVersion, { ModVersion } from './ModDetailVersion.vue'
import { kVuetify } from '@/composables/vuetify'
import { injection } from '@/util/inject'
import unknownServer from '@/assets/unknown_server.png'
import Hint from '@/components/Hint.vue'
import { getExpectedSize } from '@/util/size'
import { vSharedTooltip } from '@/directives/sharedTooltip'

const props = defineProps<{
  detail: ModDetailData
  enabled: boolean
  updating?: boolean
  dependencies: ModDependency[]
  loadingDependencies?: boolean
  loading: boolean
  versions: ModVersion[]
  loadingVersions: boolean
  selectedInstalled: boolean
  hasInstalledVersion: boolean
  noDelete?: boolean
  noEnabled?: boolean
  hasMore: boolean
  curseforge?: boolean
  modrinth?: boolean
}>()

const emit = defineEmits<{
  (event: 'load-changelog', version: ModVersion): void
  (event: 'show-image', img: ModGallery): void
  (event: 'load-more'): void
  (event: 'install', version: ModVersion): void
  (event: 'install-dependency', dep: ModDependency): void
  (event: 'delete'): void
  (event: 'enable', value: boolean): void
  (event: 'open-dependency', dep: ModDependency): void
}>()

export interface ModDependency {
  /**
   * This is the project id
   */
  id: string
  icon?: string
  title: string
  description: string
  version: string
  type: 'required' | 'optional' | 'incompatible' | 'embedded'
  progress: number
  installedVersion?: string
  installedDifferentVersion?: string
}

export interface ModGallery {
  title: string
  description: string
  date?: string
  url: string
}
export interface CategoryItem {
  name: string
  icon?: string
  iconUrl?: string
  iconHTML?: string
}
export interface ExternalResource {
  icon: string
  name: string
  url: string
}
export interface Info {
  icon: string
  name: string
  value: string
  url?: string
}
export interface ModDetailData {
  id: string
  icon: string
  title: string
  description: string
  author: string
  downloadCount: number
  follows: number
  url: string
  categories: CategoryItem[]
  htmlContent: string
  externals: ExternalResource[]
  galleries: ModGallery[]
  info: Info[]
}
const tab = ref(0)

const _enabled = computed({
  get() { return props.enabled },
  set(v: boolean) {
    emit('enable', v)
  },
})

const vuetify = injection(kVuetify)
const isDark = computed(() => vuetify.theme.dark)

const selectedVersion = inject('selectedVersion', ref(props.versions.find(v => v.installed) || props.versions[0] as ModVersion | undefined))
const onVersionClicked = (version: ModVersion) => {
  if (!selectedVersion.value || selectedVersion.value?.id === version.id) return
  selectedVersion.value = version
}
watch(selectedVersion, (v, o) => {
  if (v !== o && v) {
    emit('load-changelog', v)
  }
})
const { t } = useI18n()
watch(() => props.detail, (d, o) => {
  if (d?.id !== o?.id) {
    showDependencies.value = false
    selectedVersion.value = undefined
    tab.value = 0
  }
})
watch(() => props.versions, (vers) => {
  if (!selectedVersion.value) {
    selectedVersion.value = props.versions.find(v => v.installed) || vers[0]
  }
})

const showDependencies = ref(false)

const onSwitchVersion = () => {

}

const tDepType = (ty: ModDependency['type']) => t(`dependencies.${ty}`)

const onInstall = () => {
  if (selectedVersion.value) {
    emit('install', selectedVersion.value)
  }
}

const onInfoClicked = (value: string) => {
  navigator.clipboard.writeText(value)
}

const onScroll = (e: Event) => {
  const t = e.target as HTMLElement
  if (t.scrollTop + t.clientHeight >= t.scrollHeight && tab.value === 3) {
    emit('load-more')
  }
}
</script>

<style>
.mod-detail .v-badge__badge.primary {
  right: -10px;
  height: 20px;
  font-size: 12px;
}
</style>
<style scoped>
.item {
  @apply flex items-center gap-2 overflow-x-auto overflow-y-hidden w-full;
}

.item .v-icon {
  @apply rounded-full p-2;
  background-color: rgba(0, 0, 0, 0.2);
}

.item div {
  @apply flex flex-col;
}

span {
  /* @apply dark:text-gray-400 text-gray-600; */
}

.contained {
  container-type: inline-size;
}
</style>
