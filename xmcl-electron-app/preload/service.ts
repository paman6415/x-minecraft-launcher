/* eslint-disable no-dupe-class-members */

import { AllStates, ServiceChannels, ServiceKey, MutableState, StateMetadata } from '@xmcl/runtime-api'
import { contextBridge, ipcRenderer } from 'electron'
import EventEmitter from 'events'

function getPrototypeMetadata(T: { new(): object }, prototype: object, name: string) {
  const methods = Object.getOwnPropertyNames(prototype)
    .map((name) => [name, Object.getOwnPropertyDescriptor(prototype, name)?.value] as const)
    .filter(([, v]) => v instanceof Function)
  return {
    name,
    constructor: () => new T(),
    methods: methods.map(([name, f]) => [name, f.call] as [string, (o: any, ...args: any[]) => any]),
    prototype,
  }
}

const idToStatePrototype: Record<string, StateMetadata> = AllStates.reduce((obj, cur) => {
  obj[cur.name] = getPrototypeMetadata(cur, cur.prototype, cur.name)
  return obj
}, {} as Record<string, StateMetadata>)

async function receive(sessionId: number, registerState: (id: string, source: MutableState<object>) => void, disposeState: (id: string) => void) {
  const { result, error } = await ipcRenderer.invoke('session', sessionId)
  if (error) {
    if (error.errorMessage) {
      error.toString = () => error.errorMessage
    }
    return Promise.reject(error)
  }

  if (result && typeof result === 'object' && '__state__' in result) {
    // recover state object
    const id = result.id
    const prototype = idToStatePrototype[result.__state__]
    if (!prototype) {
      // Wrong version of runtime
      throw new TypeError(`Unknown state object ${result.__state__}!`)
    }
    delete result.__state__
    const state = Object.assign(result, {
      dispose() {
        ipcRenderer.send('dispose', id)
        disposeState(id)
      },
      onCommit: undefined,
    })

    for (const [method, handler] of prototype.methods) {
      // explictly bind to the state object under electron context isolation
      state[method] = function (...args: any[]) {
        handler(this, ...args)
      }
    }

    // register state to receive event
    registerState(id, state)
    return state
  }

  return result
}

function createServiceChannels(): ServiceChannels {
  const servicesEmitter = new Map<ServiceKey<any>, EventEmitter>()
  const states: Record<string, MutableState<object>> = {}

  ipcRenderer.on('service-event', (_, { service, event, args }) => {
    const emitter = servicesEmitter.get(service)
    if (emitter) {
      emitter.emit(event, ...args)
    }
  })

  ipcRenderer.on('commit', (event, id, mutation) => {
    const state = states[id]
    if (state) {
      const onCommit = state.onMutated
      if (onCommit) {
        onCommit(mutation, (state as any)[mutation.key])
      }
    }
  })

  return {
    getStatesMetadata() {
      return Object.values(idToStatePrototype)
    },
    open(serviceKey) {
      if (!servicesEmitter.has(serviceKey)) {
        servicesEmitter.set(serviceKey, new EventEmitter())
      }
      const emitter = servicesEmitter.get(serviceKey)!
      return {
        key: serviceKey,
        sync(id?: number) {
          return ipcRenderer.invoke('sync', serviceKey, id)
        },
        commit(key: string, payload: any): void {
          ipcRenderer.invoke('commit', serviceKey, key, payload)
        },
        on(channel: any, listener: any) {
          emitter.on(channel, listener)
          return this
        },
        once(channel: any, listener: any) {
          emitter.once(channel, listener)
          return this
        },
        removeListener(channel: any, listener: any) {
          emitter.removeListener(channel, listener)
          return this
        },
        call(method, ...payload) {
          const promise: Promise<any> = ipcRenderer.invoke('service-call', serviceKey, method, ...payload).then((sessionId: any) => {
            if (typeof sessionId !== 'number') {
              throw new Error(`Cannot find service call named ${method as string} in ${serviceKey}`)
            }
            return receive(sessionId, (id, source) => {
              states[id] = source
              ipcRenderer.send('activate', id)
            }, (id) => {
              delete states[id]
            })
          })
          return promise
        },
      }
    },
  }
}

contextBridge.exposeInMainWorld('serviceChannels', createServiceChannels())
