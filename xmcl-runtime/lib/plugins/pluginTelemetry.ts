import { randomUUID } from 'crypto'
import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { LauncherAppPlugin } from '../app/LauncherApp'
import { IS_DEV } from '../constant'
import { kTelemtrySession, APP_INSIGHT_KEY } from '../entities/telemetry'
import { LaunchService } from '../services/LaunchService'
import { UserService } from '../services/UserService'
import { BaseService } from '../services/BaseService'
import { ResourceService } from '../services/ResourceService'
import { Resource } from '@xmcl/runtime-api'
import { Contracts } from 'applicationinsights'

class _StackFrame {
  // regex to match stack frames from ie/chrome/ff
  // methodName=$2, fileName=$4, lineNo=$5, column=$6
  public static regex = /^(\s+at)?(.*?)(@|\s\(|\s)([^(\n]+):(\d+):(\d+)(\)?)$/
  public static baseSize = 58 // '{"method":"","level":,"assembly":"","fileName":"","line":}'.length
  public sizeInBytes = 0
  public level: number
  public method: string
  public assembly: string
  public fileName = ''
  public line = 0

  constructor(frame: string, level: number) {
    this.level = level
    this.method = '<no_method>'
    this.assembly = frame.trim()
    const matches = frame.match(_StackFrame.regex)
    if (matches && matches.length >= 5) {
      this.method = (matches[2])?.trim() || this.method
      this.fileName = (matches[4])?.trim() || '<no_filename>'
      this.line = parseInt(matches[5]) || 0
    }

    this.sizeInBytes += this.method.length
    this.sizeInBytes += this.fileName.length
    this.sizeInBytes += this.assembly.length

    // todo: these might need to be removed depending on how the back-end settles on their size calculation
    this.sizeInBytes += _StackFrame.baseSize
    this.sizeInBytes += this.level.toString().length
    this.sizeInBytes += this.line.toString().length
  }
}

const parseStack = (stack: any) => {
  let parsedStack: _StackFrame[] | undefined
  if (typeof stack === 'string') {
    const frames = stack.split('\n')
    parsedStack = []
    let level = 0

    let totalSizeInBytes = 0
    for (let i = 0; i <= frames.length; i++) {
      const frame = frames[i]
      if (_StackFrame.regex.test(frame)) {
        const parsedFrame = new _StackFrame(frames[i], level++)
        totalSizeInBytes += parsedFrame.sizeInBytes
        parsedStack.push(parsedFrame)
      }
    }

    // DP Constraint - exception parsed stack must be < 32KB
    // remove frames from the middle to meet the threshold
    const exceptionParsedStackThreshold = 32 * 1024
    if (totalSizeInBytes > exceptionParsedStackThreshold) {
      let left = 0
      let right = parsedStack.length - 1
      let size = 0
      let acceptedLeft = left
      let acceptedRight = right

      while (left < right) {
        // check size
        const lSize = parsedStack[left].sizeInBytes
        const rSize = parsedStack[right].sizeInBytes
        size += lSize + rSize

        if (size > exceptionParsedStackThreshold) {
          // remove extra frames from the middle
          const howMany = acceptedRight - acceptedLeft + 1
          parsedStack.splice(acceptedLeft, howMany)
          break
        }

        // update pointers
        acceptedLeft = left
        acceptedRight = right

        left++
        right--
      }
    }
  }

  return parsedStack
}

function decorateError(e: Error) {
  if (e.name === 'Error') {
    if (e.message.startsWith('ECANCELED:')) {
      e.name = 'FSWatchError'
    } else if (e.message.startsWith('EPERM:')) {
      e.name = 'FSPermError'
    }
  }
}

export const pluginTelemetry: LauncherAppPlugin = async (app) => {
  if (IS_DEV) {
    return
  }
  const appInsight = await import('applicationinsights')
  const contract = new appInsight.Contracts.ContextTagKeys()

  const clientSessionFile = join(app.appDataPath, 'client_session')
  let clientSession = ''
  try {
    const session = await readFile(clientSessionFile).then(b => b.toString())
    clientSession = session
  } catch {
    clientSession = randomUUID()
    await writeFile(clientSessionFile, clientSession)
  }

  const sessionId = randomUUID()

  app.registry.register(kTelemtrySession, clientSession)

  appInsight.setup(APP_INSIGHT_KEY)
    .setDistributedTracingMode(appInsight.DistributedTracingModes.AI_AND_W3C)
    .setAutoCollectExceptions(true)
    .setAutoCollectConsole(false)
    .setAutoCollectPerformance(false)
    .setAutoCollectDependencies(false)
    .setAutoCollectRequests(false)
    .start()

  const tags = appInsight.defaultClient.context.tags
  tags[contract.sessionId] = sessionId
  tags[contract.userId] = clientSession
  tags[contract.applicationVersion] = IS_DEV ? '0.0.0' : `${app.version}#${app.build}`
  tags[contract.operationParentId] = 'root'

  app.on('engine-ready', () => {
    const baseService = app.serviceManager.get(BaseService)
    process.on('uncaughtException', (e) => {
      if (baseService.state.disableTelemetry) return
      if (appInsight.defaultClient) {
        appInsight.defaultClient.trackException({
          exception: e,
          properties: e ? { ...e } : undefined,
        })
      }
    })
    process.on('unhandledRejection', (e) => {
      if (baseService.state.disableTelemetry) return
      if (appInsight.defaultClient) {
        appInsight.defaultClient.trackException({
          exception: e as any, // the applicationinsights will convert it to error automatically
          properties: e ? { ...e } : undefined,
        })
      }
    })
    app.serviceManager.get(LaunchService)
      .on('minecraft-start', (options) => {
        if (baseService.state.disableTelemetry) return
        appInsight.defaultClient.trackEvent({
          name: 'minecraft-start',
          properties: options,
        })
      })
      .on('minecraft-exit', ({ code, signal, crashReport }) => {
        if (baseService.state.disableTelemetry) return
        const normalExit = code === 0
        const crashed = crashReport && crashReport.length > 0
        if (normalExit) {
          appInsight.defaultClient.trackEvent({
            name: 'minecraft-exit',
          })
        } else {
          appInsight.defaultClient.trackEvent({
            name: 'minecraft-exit',
            properties: {
              code,
              signal,
              crashed,
            },
          })
        }
      })

    const createExceptionDetails = (msg?: string, name?: string, stack?: string) => {
      const d = new Contracts.ExceptionDetails()
      d.message = msg?.substring(0, 32768) || ''
      d.typeName = name?.substring(0, 1024) || ''
      d.parsedStack = parseStack(stack) as any
      d.hasFullStack = (d.parsedStack instanceof Array) && d.parsedStack.length > 0
      return d
    }

    appInsight.defaultClient.addTelemetryProcessor((envelope, contextObjects) => {
      if (contextObjects?.error) {
        const exception = envelope.data.baseData as Contracts.ExceptionData
        const e = contextObjects?.error
        if (e instanceof Error) {
          if (e.cause instanceof Error) {
            exception.exceptions.push(createExceptionDetails(e.cause.message, e.cause.name, e.cause.stack))
          } else if (e instanceof AggregateError) {
            for (const cause of e.errors) {
              exception.exceptions.push(createExceptionDetails(cause.message, cause.name, cause.stack))
            }
          }
        }
      }
      return true
    })

    app.logManager.logBus.on('failure', (tag, message: string, e: Error) => {
      if (baseService.state.disableTelemetry) return
      appInsight.defaultClient.trackException({
        exception: e,
        properties: e ? { ...e } : undefined,
        contextObjects: {
          error: e,
        },
        tagOverrides: {
          [contract.operationParentId]: tag,
        },
      })
    })

    app.serviceManager.get(ResourceService).on('resourceAdd', (res: Resource) => {
      if (baseService.state.disableTelemetry) return
      appInsight.defaultClient.trackEvent({
        name: 'resource-metadata',
        properties: {
          fileName: res.fileName,
          domain: res.domain,
          sha1: res.hash,
          metadata: res.metadata,
        },
      })
    }).on('resourceUpdate', (res: Resource) => {
      if (baseService.state.disableTelemetry) return
      appInsight.defaultClient.trackEvent({
        name: 'resource-metadata',
        properties: {
          fileName: res.fileName,
          domain: res.domain,
          sha1: res.hash,
          metadata: res.metadata,
        },
      })
    })

    app.serviceManager.get(UserService).on('user-login', (authService) => {
      if (baseService.state.disableTelemetry) return
      appInsight.defaultClient.trackEvent({
        name: 'user-login',
        properties: {
          authService,
        },
      })
    })
  })
}
