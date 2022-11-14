import { Project, ProjectVersion } from '@xmcl/modrinth'
import { ModrinthModpackResource, Persisted } from '@xmcl/runtime-api'
import { DialogKey } from './dialog'

export type InstanceInstallOptions = {
  type: 'modrinth'
  project: Project
  current: ProjectVersion
  latest: ProjectVersion
  currentResource?: Persisted<ModrinthModpackResource>
  resource: Persisted<ModrinthModpackResource>
}

export const InstanceInstallDialog: DialogKey<InstanceInstallOptions> = 'instance-install'

export function useInstanceUpgradeDialog() {

}
