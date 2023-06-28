import { injection } from '@/util/inject'
import { TaskState } from '@xmcl/runtime-api'
import { useDialog } from './dialog'
import { LaunchStatusDialogKey, useLaunch } from './launch'

export interface LaunchMenuItem {
  title: string
  description: string
  icon?: string
  rightIcon?: string
  color?: string
}

export function useLaunchButton() {
  const { launch, status: launchStatus, launchCount } = useLaunch()
  const { show: showLaunchStatusDialog } = useDialog(LaunchStatusDialogKey)
  const { show: showMultiInstanceDialog } = useDialog('multi-instance-launch')

  const {
    isRefreshingVersion,
    files: { refreshing: refreshingFiles },
    task: { status, pause, resume },
    versionDiagnose: { issues: versionIssues, fix: fixVersionIssues, loading: loadingVersionIssues },
    javaDiagnose: { issue: javaIssue, fix: fixJavaIssue },
    filesDiagnose: { issue: filesIssue, fix: fixInstanceFileIssue },
    userDiagnose: { issue: userIssue, fix: fixUserIssue },
   } = injection(kInstanceContext)

  const { t } = useI18n()
  const launchButtonFacade = computed(() => {
    if (status.value === TaskState.Running) {
      return {
        icon: 'pause',
        text: t('task.pause'),
        color: 'blue',
        onClick: () => pause(),
      }
    } else if (status.value === TaskState.Paused) {
      resume()
      return {
        icon: 'get_app',
        text: t('install'),
        color: 'blue',
        onClick: () => resume(),
      }
    } else if (userIssue.value) {
      return {
        icon: 'account_circle',
        text: t('login.login'),
        color: 'blue',
        menu: [userIssue.value],
        onClick: () => fixUserIssue(),
      }
    } else if (javaIssue.value) {
      return {
        icon: 'get_app',
        text: t('install'),
        color: 'blue',
        menu: [javaIssue.value],
        onClick: () => fixJavaIssue(),
      }
    } else if (versionIssues.value.length > 0) {
      return {
        icon: 'get_app',
        text: t('install'),
        color: 'blue',
        menu: versionIssues.value,
        onClick: () => fixVersionIssues(),
      }
    } else if (filesIssue.value) {
      return {
        icon: 'get_app',
        text: t('install'),
        color: 'blue',
        menu: [filesIssue.value],
        onClick: () => fixInstanceFileIssue(),
      }
    } else {
      return {
        icon: 'play_arrow',
        text: t('launch.launch'),
        color: 'primary',
        right: true,
        onClick: () => {
          if (launchStatus.value === 'launching') {
            showLaunchStatusDialog()
          } else if (launchCount.value >= 1) {
            showMultiInstanceDialog()
          } else {
            launch()
          }
        },
      }
    }
  })

  /**
   * The launch button color.
   */
  const color = computed(() => launchButtonFacade.value.color)
  const icon = computed(() => launchButtonFacade.value.icon)
  const text = computed(() => launchButtonFacade.value.text)
  const loading = computed(() => launchStatus.value === 'launching' ||
    loadingVersionIssues.value ||
    refreshingFiles.value ||
    isRefreshingVersion.value)
  const right = computed(() => launchButtonFacade.value.right || false)
  const menuItems = computed<LaunchMenuItem[]>(() => launchButtonFacade.value.menu || [])

  /**
   * The button click listener.
   *
   * 1. User need to login
   * 2. User need to install java
   * 3. User need to install version and files
   */
  function onClick() {
    launchButtonFacade.value.onClick()
  }

  return {
    count: launchCount,
    onClick,
    color,
    icon,
    text,
    loading,
    right,
    menuItems,
  }
}
