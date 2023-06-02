import { JavaRecord, JavaServiceKey } from '@xmcl/runtime-api'
import { Ref } from 'vue'
import { JavaRecommendation } from './instanceJava'
import { IssueItem } from './issues'
import { JavaIssueDialogKey } from './java'
import { useDialog } from './dialog'
import { useService } from './service'

export function useInstanceJavaDiagnose(javaRecommendation: Ref<JavaRecommendation | undefined>) {
  const { t } = useI18n()
  const issues: Ref<IssueItem[]> = computed(() => {
    if (state.all.length === 0) {
      return [{
        title: t('diagnosis.missingJava.name'),
        description: t('diagnosis.missingJava.message'),
      }]
    }
    if (javaRecommendation.value) {
      return [{
        title: t('diagnosis.incompatibleJava.name', { version: javaRecommendation.value.version, javaVersion: javaRecommendation.value.requirement }),
        description: t('diagnosis.incompatibleJava.message'),
      }]
    }
  })
  const { state } = useService(JavaServiceKey)
  const { show: showJavaDialog } = useDialog(JavaIssueDialogKey)

  function fix() {
    if (javaRecommendation.value || state.all.length === 0) {
      showJavaDialog()
    }
  }
}
