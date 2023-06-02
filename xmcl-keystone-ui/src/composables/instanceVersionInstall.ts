import { injection } from '@/util/inject'
import { InstallServiceKey, RuntimeVersions, VersionServiceKey } from '@xmcl/runtime-api'
import { useService } from './service'
import { kSWRVConfig } from './swrvConfig'

export function useInstanceVersionInstall() {
  const { cache } = injection(kSWRVConfig)
  const { state } = useService(VersionServiceKey)
  const {
    getMinecraftVersionList,
    getForgeVersionList,
    installForge,
    installMinecraft,
    installOptifine,
    installFabric,
    installQuilt,
  } = useService(InstallServiceKey)

  const getCacheOrFetch = async <T>(key: string, fetcher: () => Promise<T>) => {
    const cached = cache.get(key)
    if (cached) {
      return cached.data as T
    }
    const data = await fetcher()
    cache.set(key, data, 1000 * 60 * 60 * 24)
    return data
  }
  async function install(runtime: RuntimeVersions) {
    const { minecraft, forge, fabricLoader, quiltLoader, optifine } = runtime
    const mcVersions = await getCacheOrFetch('/minecraft-versions', () => getMinecraftVersionList())
    const local = state.local
    if (!local.find(v => v.id === minecraft)) {
      const metadata = mcVersions.versions.find(v => v.id === minecraft)!
      await installMinecraft(metadata)
    }

    let forgeVersion = undefined as undefined | string
    if (forge) {
      const localForge = local.find(v => v.forge === forge && v.minecraft === minecraft)
      if (!localForge) {
        const forgeVersions = await getCacheOrFetch(`/forge-versions/${minecraft}`, () => getForgeVersionList({ minecraftVersion: minecraft }))
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
      return await installOptifine({ type, patch, mcversion: minecraft, inheritFrom: forgeVersion })
    } else if (forgeVersion) {
      return forgeVersion
    }

    if (fabricLoader) {
      const localFabric = local.find(v => v.fabric === fabricLoader && v.minecraft === runtime.minecraft)
      if (localFabric) {
        return localFabric.id
      }
      return await installFabric({ loader: fabricLoader, minecraft })
    }

    if (quiltLoader) {
      const localQuilt = local.find(v => v.quilt === quiltLoader)
      if (localQuilt) {
        return localQuilt.id
      }
      return await installQuilt({ version: quiltLoader, minecraftVersion: minecraft })
    }
    return minecraft
  }

  return {
    install,
  }
}
