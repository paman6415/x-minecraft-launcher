import { InstallServiceKey, RuntimeVersions, VersionServiceKey } from '@xmcl/runtime-api'
import { useMinecraftVersions } from './version'
import useSWRV from 'swrv'
import { useSWRVConfig } from './swrvConfig'
import { useService } from './service'

export function useInstanceVersionInstall() {
  const { cache } = useSWRVConfig()
  const { state, resolveLocalVersion } = useService(VersionServiceKey)
  const { getMinecraftVersionList, getForgeVersionList, getFabricVersionList, installForge, installMinecraft } = useService(InstallServiceKey)
  async function installRuntime(runtime: RuntimeVersions) {
    const { minecraft, forge, fabricLoader, quiltLoader, optifine } = runtime
    const mcVersions = await getMinecraftVersionList()
    const local = state.local
    if (!local.find(v => v.id === minecraft)) {
      const metadata = mcVersions.versions.find(v => v.id === minecraft)!
      await installMinecraft(metadata)
    }

    let forgeVersion = undefined as undefined | string
    if (forge) {
      const localForge = local.find(v => v.forge === forge && v.minecraft === minecraft)
      if (!localForge) {
        const forgeVersions = await getForgeVersionList({ minecraftVersion: minecraft })
        const found = forgeVersions.find(v => v.version === forge)
        const forgeVersionId = found?.version ?? forge
        forgeVersion = await installForge({ mcversion: minecraft, version: forgeVersionId, installer: found?.installer })
      } else {
        forgeVersion = localForge.id
      }
    }

    if (optifine) {
      let optifineVersion = optifine
      if (optifineVersion.startsWith(minecraft)) {
        optifineVersion = optifineVersion.substring(minecraft.length)
      }
      const localOptifine = local.find(v => v.optifine === optifineVersion && v.forge === (forgeVersion || ''))
      if (localOptifine) {
        return localOptifine.id
      }
      const index = optifineVersion.lastIndexOf('_')
      const type = optifineVersion.substring(0, index)
      const patch = optifineVersion.substring(index + 1)
      return await this.installService.installOptifineUnsafe({ type, patch, mcversion: minecraft, inheritFrom: forgeVersion })
    } else if (forgeVersion) {
      return forgeVersion
    }

    if (fabricLoader) {
      const localFabric = local.find(v => v.fabric === fabricLoader && v.minecraft === runtime.minecraft)
      if (localFabric) {
        return localFabric.id
      }
      return await this.installService.installFabricUnsafe({ loader: fabricLoader, minecraft })
    }

    if (quiltLoader) {
      const localQuilt = local.find(v => v.quilt === quiltLoader)
      if (localQuilt) {
        return localQuilt.id
      }
      return await this.installService.installQuiltUnsafe({ version: quiltLoader, minecraftVersion: minecraft })
    }
    // TODO: check liteloader
    return minecraft
  }
}
