import { ServiceKey } from '@xmcl/runtime-api'
import { Manager } from '.'
import LauncherApp from '../app/LauncherApp'
import { Client } from '../engineBridge'
import { AbstractService, ServiceConstructor, getServiceKey } from '../services/Service'
import { AnyError, serializeError } from '../util/error'
import { isStateObject } from './ServiceStateManager'

export default class ServiceManager extends Manager {
  private logger = this.app.logManager.getLogger('ServiceManager')

  private serviceConstructorMap: Record<string, ServiceConstructor> = {}
  private servicesMap: Record<string, AbstractService> = {}

  constructor(app: LauncherApp, private services: ServiceConstructor[]) {
    super(app)

    this.app.controller.handle('service-call', (e, service: string, name: string, ...payload: any[]) => this.handleServiceCall(e.sender, service, name, ...payload))

    for (const type of services) {
      const key = getServiceKey(type)
      if (key) {
        this.serviceConstructorMap[key] = type
      }
    }
  }

  getServiceByKey<T>(type: ServiceKey<T>): T | undefined {
    const service = this.servicesMap[type as string] as any
    if (!service) {
      const con = this.serviceConstructorMap[type as string]
      if (con) {
        return this.get(con) as any
      }
    }
    return service
  }

  get<T extends AbstractService>(ServiceConstructor: ServiceConstructor<T>): T {
    const service = this.app.registry.get(ServiceConstructor)
    if (!service) {
      throw new Error(`Fail construct service ${ServiceConstructor.name}!`)
    }

    const key = getServiceKey(ServiceConstructor)
    if (!this.servicesMap[key]) {
      this.servicesMap[key] = service
      this.logger.log(`Expose service ${key} to remote`)
      service.initialize()
    }

    return service
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
    const serv = this.servicesMap[serviceName]

    if (!serv) {
      const error = new AnyError('ServiceNotFoundError', `Cannot execute service call ${serviceMethod} from service ${serviceName}. No service exposed as ${serviceName}.`)
      this.logger.error(error)
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

  async setup() {
    this.logger.log(`Setup service ${this.app.gameDataPath}`)

    for (const ServiceConstructor of [...Object.values(this.services)]) {
      this.get(ServiceConstructor)
    }
  }

  /**
   * Dispose all services
   */
  async dispose() {
    this.logger.log('Dispose all services')
    await Promise.all(Object.values(this.servicesMap).map((s) => s.dispose().catch((e) => {
      this.logger.error(new Error(`Error during dispose ${Object.getPrototypeOf(s).constructor.name}:`, { cause: e }))
    })))
    this.logger.log('All services are disposed')
  }
}
