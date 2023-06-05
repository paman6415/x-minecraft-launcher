import { InstanceResourcePacksService as IInstanceResourcePacksService, InstanceResourcePacksServiceKey, isResourcePackResource, packFormatVersionRange, ResourceDomain } from '@xmcl/runtime-api'
import { existsSync } from 'fs'
import { ensureDir } from 'fs-extra/esm'
import { lstat, readdir, readlink, rename, rm, unlink } from 'fs/promises'
import { join } from 'path'
import LauncherApp from '../app/LauncherApp'
import { LauncherAppKey } from '../app/utils'
import { isSystemError } from '../util/error'
import { createSymbolicLink, ENOENT_ERROR, linkWithTimeoutOrCopy } from '../util/fs'
import { Inject } from '../util/objectRegistry'
import { DiagnoseService } from './DiagnoseService'
import { InstanceOptionsService } from './InstanceOptionsService'
import { InstanceService } from './InstanceService'
import { ResourceService } from './ResourceService'
import { AbstractService, ExposeServiceKey, Singleton } from './Service'

/**
 * Provide the abilities to import resource pack and resource packs files to instance
 */
@ExposeServiceKey(InstanceResourcePacksServiceKey)
export class InstanceResourcePackService extends AbstractService implements IInstanceResourcePacksService {
  private active: string | undefined
  private linked = false

  constructor(@Inject(LauncherAppKey) app: LauncherApp,
    @Inject(ResourceService) private resourceService: ResourceService,
    @Inject(InstanceService) private instanceService: InstanceService,
    @Inject(InstanceOptionsService) gameSettingService: InstanceOptionsService,
  ) {
    super(app)
    this.storeManager/* .subscribe('instanceGameSettingsLoad', async (payload) => {
      if (payload.resourcePacks && this.active && !this.instanceService.isUnderManaged(this.active)) {
        for (const pack of payload.resourcePacks.filter(v => v !== 'vanilla')) {
          const fileName = pack.startsWith('file/') ? pack.substring('file/'.length) : pack
          const existedResource = await this.resourceService.getResourceUnder({ domain: ResourceDomain.ResourcePacks, fileName })
          const localFilePath = join(this.active, fileName)
          if (!existsSync(localFilePath)) {
            if (existedResource) {
              linkWithTimeoutOrCopy(existedResource.path, localFilePath)
            }
          }
        }
      }
    }) */.subscribe('instanceSelect', (instancePath) => {
      this.link(instancePath).catch((e) => {
        // TODO: decorate error
        const err = new Error(`Fail to link instance ${instancePath} resource pack!`, { cause: e })
        this.error(err)
        this.emit('error', err)
      })
    })

    this.resourceService.registerInstaller(ResourceDomain.ResourcePacks, async (resource, path) => {
      gameSettingService.editGameSetting({
        instancePath: path,
      })
    })

    // this.storeManager.subscribe('resource', (r) => {
    //   if (!this.active) return
    //   const existed = this.activeResourcePacks.find(p => p.hash === r.hash)
    //   if (!existed) {
    //     linkWithTimeoutOrCopy(r.path, join(this.active, basename(r.path)))
    //   }
    // })
    // this.storeManager.subscribe('resources', (rs) => {
    //   if (!this.active) return
    //   for (const r of rs) {
    //     const existed = this.activeResourcePacks.find(p => p.hash === r.hash)
    //     if (!existed) {
    //       linkWithTimeoutOrCopy(r.path, join(this.active, basename(r.path)))
    //     } else {
    //       if (basename(existed.path, r.ext) !== r.fileName) {
    //         rename(existed.path, join(dirname(existed.path), r.fileName + r.ext))
    //       }
    //     }
    //   }
    // })
    // this.storeManager.subscribe('resourcesRemove', (rs) => {
    //   if (!this.active) return
    //   for (const r of rs) {
    //     const existed = this.activeResourcePacks.find(p => p.hash === r.hash)
    //     if (existed) {
    //       unlink(existed.path)
    //     }
    //   }
    // })
  }

  // private watcher: FSWatcher | undefined
  // private activeResourcePacks: AnyPersistedResource[] = []

  @Singleton(p => p)
  async link(instancePath: string): Promise<void> {
    await this.resourceService.whenReady(ResourceDomain.ResourcePacks)
    const destPath = join(instancePath, 'resourcepacks')
    const srcPath = this.getPath('resourcepacks')
    const stat = await lstat(destPath).catch((e) => {
      if (isSystemError(e) && e.code === ENOENT_ERROR) {
        return
      }
      throw e
    })
    this.active = destPath
    await this.resourceService.whenReady(ResourceDomain.ResourcePacks)
    await this.dispose()
    const scan = async () => {
      const files = await readdir(destPath)

      this.log(`Import resourcepacks directories while linking: ${instancePath}`)
      await Promise.all(files.map(f => join(destPath, f)).map(async (filePath) => {
        const [resource] = await this.resourceService.importResources([{ path: filePath, domain: ResourceDomain.ResourcePacks }])
        if (isResourcePackResource(resource)) {
          this.log(`Add resource pack ${filePath}`)
        } else {
          this.warn(`Non resource pack resource added in /resourcepacks directory! ${filePath}`)
        }
      }))
    }
    this.log(`Linking the resourcepacks at domain to ${instancePath}`)
    if (stat) {
      if (stat.isSymbolicLink()) {
        if (await readlink(destPath) === srcPath) {
          this.log(`Skip linking the resourcepacks at domain as it already linked: ${instancePath}`)
          this.linked = true
          return
        } else {
          this.log(`Relink the resourcepacks domain: ${instancePath}`)
          await unlink(destPath)
        }
      } else {
        // Keep the dictionary and transport all files into it
        if (stat.isDirectory()) {
          // Import all directory content
          await scan()
          this.linked = false
        } else {
          await rename(destPath, `${destPath}_backup`)
        }
      }
    } else if (!this.instanceService.isUnderManaged(instancePath)) {
      // do not link if this is not an managed instance
      await ensureDir(destPath)
      this.linked = false
      return
    }

    try {
      await createSymbolicLink(srcPath, destPath, this)
      this.linked = true
    } catch (e) {
      this.error(e as Error)
      this.linked = false
    }
  }

  async showDirectory(path: string): Promise<void> {
    await this.app.shell.openDirectory(join(path, 'resourcepacks'))
  }
}
