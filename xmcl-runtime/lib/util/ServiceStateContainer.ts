import { OnMutatedHandler } from '@xmcl/runtime-api'
import EventEmitter from 'events'
import { LauncherApp } from '../app/LauncherApp'
import { Logger } from './log'

/**
 * The util class to hold each service state snapshot
 */
export class ServiceStateContainer {
  private activated = false
  private pending = [] as { type: string; payload: any }[]
  public onCommit: OnMutatedHandler | undefined

  constructor(
    readonly app: LauncherApp,
    readonly eventBus: EventEmitter,
    readonly id: string,
    readonly state: any,
    private logger: Logger,
  ) {
    for (const [key, prop] of Object.entries(Object.getOwnPropertyDescriptors(Object.getPrototypeOf(state)))) {
      if (key !== 'constructor' && prop.value instanceof Function) {
        const onCall = (value: any) => {
          const mutation = { type: key, payload: value }
          this.onCommit?.(mutation, prop.value.bind(state))
          if (this.activated) {
            // broadcast mutation to mutation subscriber
            app.controller.broadcast('commit', id, mutation)
            eventBus.emit(key, value)
          } else {
            this.pending.push(mutation)
          }
        }
        function wrapped(this: any, value: any) {
          prop.value.call(this, value)
          onCall(value)
        }
        // decorate original mutation
        Reflect.set(state, key, wrapped)
      }
    }
  }

  commit(type: string, payload: any) {
    if (typeof this.state[type] !== 'function') {
      this.logger.error(new Error(`Cannot find mutation named ${type} in service ${this.id}`))
    } else {
      this.state[type](payload)
    }
  }

  /**
   * Activate the sync function of this proxy
   */
  activate() {
    this.activated = true
    for (const mutation of this.pending) {
      this.app.controller.broadcast('commit', this.id, { mutation })
    }
    this.pending = []
  }
}
