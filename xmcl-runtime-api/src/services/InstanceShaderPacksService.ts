import { ServiceKey } from './Service'

export interface InstanceShaderPacksService {
  /**
   * It will start to watch `shaderpacks` directory and `optionsshaders.txt` under the instance path
   * @param instancePath The instance absolute path
   */
  link(instancePath: string): Promise<void>
  /**
   * Show shaderPacks folder under the instance path
   * @param instancePath The instance absolute path
   */
  showDirectory(instancePath: string): Promise<void>
}

export const InstanceShaderPacksServiceKey: ServiceKey<InstanceShaderPacksService> = 'InstanceShaderPacksService'
