import { ServiceKey } from '@xmcl/runtime-api'
import { Manager } from '.'
import LauncherApp from '../app/LauncherApp'
import { Client } from '../engineBridge'
import { AbstractService, ServiceConstructor, getServiceKey } from '../services/Service'
import { AnyError, serializeError } from '../util/error'
import { isStateObject } from './ServiceStateManager'

export default class ServiceManager extends Manager {
  private logger = this.app.logManager.getLogger('ServiceManager')

  private registered: Record<string, ServiceConstructor> = {}
  private instances: Record<string, AbstractService> = {}

  constructor(app: LauncherApp, services: ServiceConstructor[]) {
    super(app)

    this.app.controller.handle('service-call', (e, service: string, name: string, ...payload: any[]) => this.handleServiceCall(e.sender, service, name, ...payload))

    for (const type of services) {
      const key = getServiceKey(type)
      if (key) {
        this.registered[key] = type
      }
    }
  }

  private async get<T extends AbstractService>(skey: ServiceKey<T>, serviceMethod: string): Promise<T> {
    if (!this.instances[skey as string]) {
      const ServiceConstructor = this.registered[skey as string]
      if (!ServiceConstructor) {
        throw new AnyError('ServiceNotFoundError', `Cannot execute service call ${serviceMethod} from service ${skey}.`)
      }
      const service = await this.app.registry.getOrCreate(ServiceConstructor)

      this.instances[skey as string] = service
      this.logger.log(`Create service ${skey as string}`)
      service.initialize()

      return service as T
    }
    return this.instances[skey as string] as T
  }

  /**
   * Handle a service call from a client.
   *
   * If the result of the service call is a state object, this will try to trace the sync state of the state object.
   *
   * @param client The client calling this service
   * @param serviceName The service name
   * @param serviceMethod The service function name
   * @param payload The payload
   * @returns The service call result
   */
  private async handleServiceCall(client: Client, serviceName: string, serviceMethod: string, ...payload: any[]) {
    let serv: AbstractService | undefined
    try {
      serv = await this.get(serviceName, serviceMethod)
    } catch (error) {
      if (error instanceof Error) this.logger.error(error)
      return { error }
    }

    if (typeof (serv as any)[serviceMethod] !== 'function') {
      const error = new AnyError('ServiceMethodNotFoundError', `Cannot execute service call ${serviceMethod} from service ${serviceName}. The service doesn't have such method!`, undefined, { method: serviceMethod })
      this.logger.error(error)
      return { error }
    }

    try {
      const r = await (serv as any)[serviceMethod](...payload)
      if (isStateObject(r)) {
        return { result: this.app.serviceStateManager.serializeAndTrack(client, r) }
      }
      return { result: r }
    } catch (e) {
      this.logger.warn(`Error during service call ${serviceName}.${serviceMethod}:`)
      if (e instanceof Error) {
        this.logger.error(e, serviceName)
      } else {
        this.logger.error(new Error(JSON.stringify(e)), serviceName)
      }
      const error = await serializeError(e)
      error.serviceName = serviceName
      error.serviceMethod = serviceMethod
      return { error }
    }
  }

  /**
   * Dispose all services
   */
  async dispose() {
    this.logger.log('Dispose all services')
    await Promise.all(Object.values(this.instances).map((s) => s.dispose().catch((e) => {
      this.logger.error(new Error(`Error during dispose ${Object.getPrototypeOf(s).constructor.name}:`, { cause: e }))
    })))
    this.logger.log('All services are disposed')
  }
}
