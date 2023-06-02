import { computed, InjectionKey, Ref } from 'vue'
import { DiagnoseSemaphoreKey, DiagnoseServiceKey, Issue, IssueKey } from '@xmcl/runtime-api'
import { injection } from '../util/inject'
import { useBusy } from './semaphore'
import { useService } from './service'

export const kIssueHandlers: InjectionKey<IssueHandler> = Symbol('IssueHandlerKey')

export interface IssueItem {
  title: string
  description: string
}

export class IssueHandler {
  handlers: Record<string, (content: any) => void > = {}

  handle(issue: Issue): boolean {
    const handler = this.handlers[issue.id]
    if (handler) {
      handler(issue.parameters[0])
      return true
    }
    return false
  }

  register<T>(key: IssueKey<T>, handler: (content: T) => void): void {
    this.handlers[key as string] = handler
  }
}

export function useIssues() {
  function register(issueDep: Ref<IssueItem[]>) {
    watch(issueDep, () => {})
  }
  return {
  }
}
