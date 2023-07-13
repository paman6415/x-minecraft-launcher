import { injection } from '@/util/inject'
import { InjectionKey, Ref } from 'vue'
import { useDialog } from './dialog'
import { JavaRecommendation } from './instanceJava'
import { JavaIssueDialogKey, kJavaContext } from './java'
import { LaunchMenuItem } from './launchButton'
import { JavaRecord } from '@xmcl/runtime-api'

export const kInstanceJavaDiagnose: InjectionKey<ReturnType<typeof useInstanceJavaDiagnose>> = Symbol('InstanceJavaDiagnose')

export function useInstanceJavaDiagnose(all: Ref<JavaRecord[]>, javaRecommendation: Ref<JavaRecommendation | undefined>) {
  const { t } = useI18n()
  const issue: Ref<LaunchMenuItem | undefined> = computed(() => {
    if (all.value.length === 0) {
      return {
        title: t('diagnosis.missingJava.name'),
        description: t('diagnosis.missingJava.message'),
      }
    }
    if (javaRecommendation.value) {
      return {
        title: t('diagnosis.incompatibleJava.name', { version: javaRecommendation.value.version, javaVersion: javaRecommendation.value.requirement }),
        description: t('diagnosis.incompatibleJava.message'),
      }
    }
  })
  const { show: showJavaDialog } = useDialog(JavaIssueDialogKey)

  function fix() {
    if (javaRecommendation.value || all.value.length === 0) {
      showJavaDialog()
    }
  }

  return {
    issue,
    fix,
  }
}
