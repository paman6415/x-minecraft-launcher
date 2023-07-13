import { MutationKeys, MutationPayload, OnMutatedHandler, State, MutableState } from '@xmcl/runtime-api'
import { EventEmitter } from 'events'
import { Manager } from '.'
import LauncherApp from '../app/LauncherApp'
import { ServiceStateContainer } from '../util/ServiceStateContainer'

export const kStateKey = '__state__'

export function isStateObject(v: object): v is MutableState<any> {
  return v && typeof v === 'object' && kStateKey in v
}

export default class ServiceStateManager extends Manager {
  private logger = this.app.logManager.getLogger('ServiceStateManager')
  private eventBus = new EventEmitter()

  private containers: Record<string, ServiceStateContainer> = {}

  constructor(app: LauncherApp) {
    super(app)
    app.controller.handle('activate', async (event, id) => {
      const stateProxy = this.containers[id]
      if (!stateProxy) return 'NOT_STATE_SERVICE'
      stateProxy.activate()
    })
    app.controller.handle('commit', (event, key, type, payload) => {
      const stateProxy = this.containers[key]
      if (!stateProxy) return 'NOT_STATE_SERVICE'
      stateProxy.commit(type, payload)
    })
  }

  subscribe<T extends MutationKeys>(key: T, listener: (payload: MutationPayload<T>) => void) {
    this.eventBus.addListener(key, listener)
    return this
  }

  unsubscribe<T extends MutationKeys>(key: T, listener: (payload: MutationPayload<T>) => void) {
    this.eventBus.removeListener(key, listener)
    return this
  }

  subscribeAll(events: MutationKeys[], listener: () => void) {
    for (const e of events) {
      this.eventBus.addListener(e, listener)
    }
    return this
  }

  get(id: string): MutableState<any> | undefined {
    return this.containers[id]?.state
  }

  async registerOrGet<T extends State<T>>(id: string, suppier: () => Promise<[T, () => void]>): Promise<MutableState<T>> {
    if (this.containers[id]) {
      const container = this.containers[id]
      return container.state
    }
    const [state, dispose] = await suppier()
    return this.register(id, state, dispose)
  }

  register<T extends State<T>>(id: string, state: T, dispose: () => void): MutableState<T> {
    const container = new ServiceStateContainer(
      this.app,
      this.eventBus,
      id,
      state,
      this.logger,
    )
    this.containers[id] = container;
    (state as any)[kStateKey] = Object.getPrototypeOf(state).constructor.name
    return Object.assign(state, {
      dispose: () => {
        delete this.containers[id]
        dispose()
      },
      id,
      get onMutated(): OnMutatedHandler | undefined {
        return container.onCommit
      },
      set onMutated(v: OnMutatedHandler| undefined) {
        container.onCommit = v
      },
    }) as MutableState<T>
  }
}
