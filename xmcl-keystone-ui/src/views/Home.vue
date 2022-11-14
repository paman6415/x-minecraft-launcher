<template>
  <div
    class="flex flex-col home-page flex-1 min-h-0 overflow-auto max-h-full"
  >
    <HomeHeader
      class="pt-10 pb-5 px-10"
    />
    <v-divider class="mx-4" />
    <!-- This is to fix strange hover color issue... -->
    <v-divider class="border-transparent" />
    <span class="flex flex-wrap p-10 flex-grow-0 gap-3 items-start">
      <HomeModCard />
      <HomeResourcePacksCard />
      <HomeShaderPackCard />
      <HomeSavesCard />
      <ServerStatusBar v-if="isServer" />
      <HomeUpstreamCard
        v-if="instance.upstream && instance.upstream.type === 'modrinth-modpack'"
        :instance="instance"
        :upstream="instance.upstream"
      />
    </span>

    <!-- <div class="flex absolute left-0 bottom-0 px-8 pb-[20px] gap-6"> -->
    <!-- <home-sync-button /> -->
    <!-- </div> -->

    <HomeLogDialog />
    <AppGameExitDialog />
    <AppLaunchBlockedDialog />
    <HomeLaunchMultiInstanceDialog />
    <HomeLaunchStatusDialog />
    <HomeJavaIssueDialog />
    <HomeInstanceUpgradeDialog />
    <!-- <home-sync-dialog /> -->
  </div>
</template>

<script lang=ts setup>
import { useInstance, useInstanceIsServer } from '../composables/instance'
import { useInstanceServerStatus } from '../composables/serverStatus'
import AppGameExitDialog from './AppGameExitDialog.vue'
import AppLaunchBlockedDialog from './AppLaunchBlockedDialog.vue'
import HomeHeader from './HomeHeader.vue'
import HomeInstanceUpgradeDialog from './HomeInstanceUpgradeDialog.vue'
import HomeJavaIssueDialog from './HomeJavaIssueDialog.vue'
import HomeLaunchMultiInstanceDialog from './HomeLaunchMultiInstanceDialog.vue'
import HomeLaunchStatusDialog from './HomeLaunchStatusDialog.vue'
import HomeLogDialog from './HomeLogDialog.vue'
import HomeModCard from './HomeModCard.vue'
import HomeUpstreamCard from './HomeUpstreamCard.vue'
import HomeResourcePacksCard from './HomeResourcePacksCard.vue'
import HomeSavesCard from './HomeSavesCard.vue'
import ServerStatusBar from './HomeServerStatusBar.vue'
import HomeShaderPackCard from './HomeShaderPackCard.vue'

const router = useRouter()

router.afterEach((r) => {
  document.title = `XMCL KeyStone - ${r.fullPath}`
})

const { instance } = useInstance()
const isServer = useInstanceIsServer(instance)
const { refresh } = useInstanceServerStatus(instance.value.path)

onMounted(() => {
  if (isServer.value) {
    refresh()
  }
})
</script>

<style>
.v-dialog__content--active {
  -webkit-app-region: no-drag;
  user-select: auto;
}
.v-dialog {
  -webkit-app-region: no-drag;
  user-select: auto;
}
.v-badge__badge.primary {
  right: -10px;
  height: 20px;
  width: 20px;
  font-size: 12px;
}

.pointer * {
  cursor: pointer !important;
}

.launch-button {
  @apply p-10;
}
</style>
