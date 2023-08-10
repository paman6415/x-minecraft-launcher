<template>
  <v-menu
    v-model="isShown"
    :close-on-content-click="false"
    :nudge-width="280"
    offset-y
    class="z-20"
  >
    <template #activator="{ on, attrs }">
      <div
        v-bind="attrs"
        class="non-moveable flex flex-grow-0 cursor-pointer items-center gap-2 rounded px-2 transition-all hover:bg-[rgba(255,255,255,0.2)]"
        v-on="on"
      >
        <PlayerAvatar
          class="overflow-hidden rounded-full transition-all duration-300"
          :src="selectedUserGameProfile?.textures.SKIN.url"
          :dimension="28"
        />
        {{ selectedUserGameProfile?.name }}
      </div>
    </template>

    <UserMenu
      :users="users"
      :selected="selectedUser"
      :refreshing="refreshing"
      @select="onSelectUser"
      @refresh="onRefresh"
      @remove="onRemoveUser"
      @abort-refresh="onAbortRefresh"
    />
  </v-menu>
</template>
<script lang="ts" setup>
import PlayerAvatar from '@/components/PlayerAvatar.vue'
import { useService } from '@/composables'
import { useDialog } from '@/composables/dialog'
import { LoginDialog } from '@/composables/login'
import { kUserContext, useUserExpired } from '@/composables/user'
import { UserSkinRenderPaused } from '@/composables/userSkin'
import { injection } from '@/util/inject'
import { UserServiceKey } from '@xmcl/runtime-api'
import UserMenu from './UserMenu.vue'

const { users, select, userProfile: selectedUser, gameProfile: selectedUserGameProfile, yggdrasilServices } = injection(kUserContext)
const { abortRefresh, refreshUser, removeUser } = useService(UserServiceKey)
const { show: showLoginDialog } = useDialog(LoginDialog)
const isShown = ref(false)
const expired = useUserExpired(computed(() => selectedUser.value))

const { t } = useI18n()
const onSelectUser = (user: string) => {
  isShown.value = false
  select(user)
}
watch(isShown, (show) => {
  if (show) {
    onRefresh()
  }
})

const refreshing = ref(false)

function onRefresh() {
  if (users.value.length === 0) {
    showLoginDialog()
    nextTick().then(() => {
      isShown.value = false
    })
  } else if (selectedUser.value?.id || selectedUser.value.invalidated || expired.value) {
    const authService = selectedUser.value?.authService
    if (yggdrasilServices.value.every((e) => new URL(e.url).host !== authService) && authService !== 'microsoft' && authService !== 'offline') {
      
    } else {
      refreshing.value = true
      refreshUser(selectedUser.value.id).catch((e) => {
        console.error(e)
        showLoginDialog({ username: selectedUser.value?.username, service: authService, error: t('login.userRelogin') })
        nextTick().then(() => {
          isShown.value = false
        })
      }).finally(() => {
        refreshing.value = false
      })
    }
  }
}
async function onRemoveUser() {
  const isLastOne = users.value.length <= 0
  await removeUser(selectedUser.value.id)
  if (isLastOne) {
    showLoginDialog()
  }
}

provide(UserSkinRenderPaused, computed(() => !isShown.value))
function onAbortRefresh() {
  abortRefresh()
}
</script>
