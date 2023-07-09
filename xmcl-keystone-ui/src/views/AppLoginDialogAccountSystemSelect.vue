<template>
  <v-select
    v-model="selected"
    outlined
    prepend-inner-icon="vpn_key"
    :items="items"
    :label="t('user.authMode')"
    flat
  >
    <template #item="{ item, on, attr }">
      <v-list-item
        v-bind="attr"
        :key="item.value"
        v-on="on"
      >
        <v-list-item-avatar>
          <v-img :src="item.icon" />
        </v-list-item-avatar>
        <v-list-item-content>
          <v-list-item-title>
            {{ item.text }}
          </v-list-item-title>
        </v-list-item-content>
      </v-list-item>
    </template>
  </v-select>
</template>
<script setup lang="ts">
import { useService } from '@/composables'
import { kSettingsState } from '@/composables/setting'
import { kUserContext } from '@/composables/user'
import { injection } from '@/util/inject'
import { BaseServiceKey, UserServiceKey } from '@xmcl/runtime-api'
import { Ref } from 'vue'

const props = defineProps<{
  value: string
}>()
const emit = defineEmits(['input'])

interface ServiceItem {
  icon: string
  text: string
  value: string
}

const { users, yggdrasilServices } = injection(kUserContext)
const { state: setting } = injection(kSettingsState)
const { t } = useI18n()
const hasMicrosoft = computed(() => Object.values(users.value)?.some(u => u.authService === 'microsoft'))

const items: Ref<ServiceItem[]> = computed(() => {
  const items = [
    {
      value: 'microsoft',
      text: t('userServices.microsoft.name'),
      icon: 'mdi-microsoft',
    },
    {
      value: 'mojang',
      text: t('userServices.mojang.name'),
      icon: 'mdi-minecraft',
    },
  ] as ServiceItem[]

  if (setting.value?.developerMode || hasMicrosoft) {
    items.push({
      value: 'offline',
      text: t('userServices.offline.name'),
      icon: 'mdi-account-off',
    })
    for (const api of yggdrasilServices.value) {
      try {
        const host = new URL(api.url).host
        items.push({
          value: host,
          text: api.authlibInjector?.meta.serverName ?? host,
          icon: api.favicon ?? '',
        })
      } catch {}
    }
  }

  return items
})
const selected = computed<ServiceItem>({
  get() { return items.value.find(a => a.value === props.value)! },
  set(v) { emit('input', v) },
})

</script>
