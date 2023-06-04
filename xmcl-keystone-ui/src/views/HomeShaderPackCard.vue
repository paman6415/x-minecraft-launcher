<template>
  <v-card
    :color="cardColor"
    class="flex flex-col h-full"
  >
    <v-card-title>
      <v-icon
        left
      >
        gradient
      </v-icon>
      {{ t('shaderPack.name', 2) }}
    </v-card-title>
    <v-card-text
      class="flex-grow"
    >
      {{ shaderPack ? t('shaderPack.enable', { name: shaderPack }) : t('shaderPack.empty') }}
    </v-card-text>
    <v-card-actions>
      <v-btn
        text
        color="teal accent-4"
        @click="push('/shader-pack-setting')"
      >
        {{ t('shaderPack.manage') }}
      </v-btn>
    </v-card-actions>
  </v-card>
</template>
<script lang="ts" setup>
import { kColorTheme } from '@/composables/colorTheme'
import { kInstanceContext } from '@/composables/instanceContext'
import { injection } from '@/util/inject'

const { cardColor } = injection(kColorTheme)
const { options } = injection(kInstanceContext)
const shaderPack = computed(() => options.gameOptions.value?.shaderPack || '')
const { t } = useI18n()
const { push } = useRouter()

</script>
