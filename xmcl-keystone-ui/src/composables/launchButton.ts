import { useDialog } from './dialog'
import { JavaIssueDialogKey, useJava } from './java'
import { LaunchStatusDialogKey, useLaunch } from './launch'
import { LoginDialog } from './login'

export function useLaunchButton() {
  const { launch, status: launchStatus, launchCount } = useLaunch()
  const { missing: missingJava } = useJava()
  const { show: showLoginDialog } = useDialog(LoginDialog)
  const { show: showJavaDialog } = useDialog(JavaIssueDialogKey)
  const { show: showLaunchStatusDialog } = useDialog(LaunchStatusDialogKey)
  const { show: showMultiInstanceDialog } = useDialog('multi-instance-launch')

  function onClick() {
    // related task need to handle
    if (needInstall.value) {
      if (props.status === TaskState.Running) {
        emit('pause')
      } else if (props.status === TaskState.Paused) {
        emit('resume')
      } else {
        if (showProblems.value) {
          showProblems.value = false
        }
        if (props.issue) {
          // has issue
          fix(props.issue, issues.value)
        }
        if (pendingInstallFiles.value.length > 0) {
          // has unfinished files
          installInstanceFiles({
            files: pendingInstallFiles.value,
          }).finally(() => {
            refreshInstanceInstall()
          })
        } else {
          refreshInstanceInstall()
        }
      }
    } else if (missingJava.value) {
      // missing java
      showJavaDialog()
    } else if (!state.users[state.selectedUser.id]) {
      // need to login
      showLoginDialog()
    } else if (launchStatus.value === 'checkingProblems' || launchStatus.value === 'launching') {
      // during launching
      showLaunchStatusDialog()
    } else if (launchCount.value === 1 || launchStatus.value !== 'idle') {
      // already launched, need to show dialog
      showMultiInstanceDialog()
    } else {
      launch()
    }
  }
}