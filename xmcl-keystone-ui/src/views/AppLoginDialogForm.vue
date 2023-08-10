<template>
  <div
    class="h-100vh moveable flex flex-grow flex-col items-center justify-center"
  >
    <AppLoginDialogBackground
      :value="isShown"
      :authority="authority"
    />
    <hint
      v-if="showDropHint"
      icon="save_alt"
      :text="t('login.dropHint').toString()"
    />
    <div
      v-else
      class="min-w-100 non-moveable z-10 m-20 text-center"
    >
      <AppLoginDialogAccountSystemSelect v-model="authority" />

      <v-combobox
        ref="accountInput"
        v-model="data.username"
        :items="history"
        prepend-inner-icon="person"
        outlined
        required
        :label="getUserServiceAccount(authority)"
        :rules="usernameRules"
        :error="!!usernameErrors.length"
        :error-messages="usernameErrors"
        @input="usernameErrors = []"
        @keypress="resetError"
      />
      <v-text-field
        v-if="!isOffline"
        v-model="data.password"
        prepend-inner-icon="lock"
        outlined
        :type="passwordType"
        required
        :label="passwordLabel"
        :placeholder="passwordPlaceholder"
        :rules="!isMicrosoft ? passwordRules : []"
        :disabled="isPasswordDisabled"
        :readonly="isPasswordReadonly"
        :error="!!passwordErrors.length"
        :error-messages="passwordErrors"
        @input="passwordErrors = []"
        @keypress.enter="onLogin"
      />
      <v-text-field
        v-else
        v-model="data.uuid"
        outlined
        prepend-inner-icon="fingerprint"
        :placeholder="uuidLabel"
        :label="uuidLabel"
        @keypress.enter="onLogin"
      />

      <div
        v-if="isMicrosoft"
        class="flex"
      >
        <v-checkbox
          v-if="!data.useFast"
          v-model="data.useDeviceCode"
          :label="t('userServices.microsoft.useDeviceCode')"
        />

        <div
          class="flex-grow"
        />

        <v-checkbox
          v-if="!data.useDeviceCode"
          v-model="data.useFast"
          :label="t('userServices.microsoft.fastLogin')"
        />
      </div>

      <div
        @mouseenter="onMouseEnterLogin"
        @mouseleave="onMouseLeaveLogin"
      >
        <v-btn
          block
          :loading="isLogining && (!hovered)"
          color="primary"
          rounded
          large
          class="z-10 text-white"

          @click="onLogin"
        >
          <span v-if="!isLogining">
            {{ t("login.login") }}
          </span>
          <v-icon v-else>
            close
          </v-icon>
        </v-btn>
      </div>

      <div
        v-if="data.microsoftUrl"
        class="mt-6"
      >
        <a
          :href="data.microsoftUrl"
          class="border-b border-dashed border-b-current"
        >
          {{ t('login.manualLoginUrl') }}
        </a>
      </div>

      <div class="mt-4">
        <a
          style="padding-right: 10px; z-index: 20"
          target="browser"
          href="https://my.minecraft.net/en-us/password/forgot/"
        >{{
          t("login.forgetPassword")
        }}</a>
        <a
          v-if="signUpLink"
          target="browser"
          style="z-index: 20"
          :href="signUpLink"
        >
          {{ t("login.signupDescription") }}
          {{ t("login.signup") }}
        </a>
      </div>
    </div>
  </div>
</template>

<script lang=ts setup>
import Hint from '@/components/Hint.vue'
import { useBusy, useService } from '@/composables'
import { injection } from '@/util/inject'
import { AUTHORITY_DEV, AUTHORITY_MICROSOFT, AUTHORITY_MOJANG, isException, OfficialUserServiceKey, UserException, UserServiceKey } from '@xmcl/runtime-api'
import { Ref } from 'vue'
import { useDialog } from '../composables/dialog'
import { LoginDialog, useAccountSystemHistory } from '../composables/login'
import { kUserContext, useLoginValidation } from '../composables/user'
import AppLoginDialogAccountSystemSelect from './AppLoginDialogAccountSystemSelect.vue'
import AppLoginDialogBackground from './AppLoginDialogBackground.vue'

const props = defineProps<{
  inside: boolean
}>()

const { hide, isShown, dialog } = useDialog(LoginDialog)
const { t } = useI18n()
const { yggdrasilServices } = injection(kUserContext)
const { login, abortLogin } = useService(UserServiceKey)
const { on } = useService(OfficialUserServiceKey)

const data = reactive({
  username: '',
  password: '',
  uuid: '',
  useDeviceCode: false,
  useFast: false,
  microsoftUrl: '',
})
const getUserServicePassword = (serv: string) => {
  if (serv === AUTHORITY_MICROSOFT) return data.useDeviceCode ? t('userServices.microsoft.deviceCode') : t('userServices.microsoft.password')
  if (serv === AUTHORITY_MOJANG) return t('userServices.mojang.password')
  if (serv === AUTHORITY_DEV) return t('userServices.offline.password')
  return t('userServices.mojang.password')
}
const getUserServiceAccount = (serv: string) => {
  if (serv === AUTHORITY_MICROSOFT) return t('userServices.microsoft.account')
  if (serv === AUTHORITY_MOJANG) return t('userServices.mojang.account')
  if (serv === AUTHORITY_DEV) return t('userServices.offline.account')
  return t('userServices.mojang.account')
}

const { authority, history } = useAccountSystemHistory()

const signUpLink = computed(() => {
  if (authority.value === AUTHORITY_MICROSOFT) return 'https://account.live.com/registration'
  if (authority.value === AUTHORITY_MOJANG) return 'https://my.minecraft.net/en-us/store/minecraft/#register'
  const api = yggdrasilServices.value.find(a => new URL(a.url).host === authority.value)
  const url = api?.authlibInjector?.meta.links.register
  return url || ''
})

const isPasswordReadonly = computed(() => isOffline.value || isMicrosoft.value)
const isPasswordDisabled = computed(() => isPasswordReadonly.value && !data.useDeviceCode)
const passwordType = computed(() => data.useDeviceCode ? 'text' : 'password')

const accountInput: Ref<any> = ref(null)
const hovered = ref(false)

const isLogining = useBusy('login')
const isMicrosoft = computed(() => authority.value === AUTHORITY_MICROSOFT)
const isOffline = computed(() => authority.value === AUTHORITY_DEV)

const passwordLabel = computed(() => getUserServicePassword(authority.value))
const passwordPlaceholder = computed(() => data.useDeviceCode ? t('userServices.microsoft.deviceCodeHint') : passwordLabel.value)
const showDropHint = computed(() => isMicrosoft.value && props.inside && isLogining.value)
const uuidLabel = computed(() => t('userServices.offline.uuid'))

const {
  usernameRules,
  usernameErrors,
  passwordRules,
  passwordErrors,
  reset: resetError,
} = useLoginValidation(isOffline)

function handleError(e: unknown) {
  if (isException(UserException, e)) {
    if (e.exception.type === 'loginInvalidCredentials') {
      const msg = t('loginError.invalidCredentials')
      usernameErrors.value = [msg]
      passwordErrors.value = [msg]
    } else if (e.exception.type === 'loginInternetNotConnected') {
      const msg = t('loginError.badNetworkOrServer')
      usernameErrors.value = [msg]
      passwordErrors.value = [msg]
    } else if (e.exception.type === 'loginGeneral') {
      const msg = t('loginError.requestFailed')
      usernameErrors.value = [msg]
      passwordErrors.value = [msg]
    } else if (e.exception.type === 'fetchMinecraftProfileFailed') {
      const msg = t('loginError.fetchMinecraftProfileFailed', { reason: `${e.exception.errorType}, ${e.exception.developerMessage}` })
      usernameErrors.value = [msg]
      passwordErrors.value = [e.exception.error ?? msg]
    } else if (e.exception.type === 'userCheckGameOwnershipFailed') {
      const msg = t('loginError.checkOwnershipFailed')
      usernameErrors.value = [msg]
      passwordErrors.value = [msg]
    } else if (e.exception.type === 'userExchangeXboxTokenFailed') {
      const msg = t('loginError.loginXboxFailed')
      usernameErrors.value = [msg]
      passwordErrors.value = [msg]
    } else if (e.exception.type === 'userLoginMinecraftByXboxFailed') {
      const msg = t('loginError.loginMinecraftByXboxFailed')
      usernameErrors.value = [msg]
      passwordErrors.value = [msg]
    } else if (e.exception.type === 'loginReset') {
      const msg = t('loginError.connectionReset')
      usernameErrors.value = [msg]
      passwordErrors.value = [msg]
    } else if (e.exception.type === 'loginTimeout') {
      const msg = t('loginError.timeout')
      usernameErrors.value = [msg]
      passwordErrors.value = [msg]
    } else if (e.exception.type === 'userAcquireMicrosoftTokenFailed') {
      const msg = t('loginError.acquireMicrosoftTokenFailed')
      usernameErrors.value = [msg]
      passwordErrors.value = [msg]
    }
  } else {
    const msg = t('loginError.requestFailed')
    usernameErrors.value = [msg]
    passwordErrors.value = [JSON.stringify(e)]
  }
  console.error(e)
}

on('microsoft-authorize-url', (url) => {
  data.microsoftUrl = url
})
on('device-code', (code) => {
  data.password = code.userCode
  data.microsoftUrl = code.verificationUri
})

function reset() {
  if (!dialog.value.parameter) {
    data.username = history.value[0] ?? ''
    data.password = ''
    data.microsoftUrl = ''
    usernameErrors.value = []
    passwordErrors.value = []
  } else {
    data.username = dialog.value.parameter?.username ?? data.username
    data.microsoftUrl = ''
    authority.value = dialog.value.parameter?.service ?? authority.value
    usernameErrors.value = dialog.value.parameter.error ? [dialog.value.parameter.error] : []
    passwordErrors.value = dialog.value.parameter.error ? [dialog.value.parameter.error] : []
  }
}

async function onLogin() {
  resetError()
  accountInput.value.blur()
  await nextTick() // wait a tick to make sure username updated.
  if (isLogining.value) {
    await abortLogin()
    return
  }
  const index = history.value.indexOf(data.username)
  if (index === -1) {
    history.value.unshift(data.username)
  }
  try {
    await login({
      username: data.username,
      password: data.password,
      authority: authority.value,
      properties: {
        mode: data.useDeviceCode ? 'device' : data.useFast ? 'fast' : '',
      },
    })
    hide()
  } catch (e) {
    handleError(e)
  }
}

const direction = ref('top')
function nextDirection() {
  const dirs = ['top', 'right', 'left', 'bottom', 'top-right', 'top-left', 'bottom-left', 'bottom-right']
  const i = Math.round(Math.random() * dirs.length)
  direction.value = dirs[i]
}
watch(authority, () => { nextDirection() })

onMounted(() => {
  reset()
})

watch(isShown, (shown) => {
  if (!shown) { return }
  if (shown) {
    reset()
  }
})

const onMouseEnterLogin = () => {
  hovered.value = true
}
const onMouseLeaveLogin = () => {
  hovered.value = false
}
</script>

<style>
.input-group {
  padding-top: 5px;
}

.password {
  padding-top: 5px;
}

.input-group--text-field label {
  top: 5px;
}

.login-card {
  padding-bottom: 25px;
}

.login-card .v-card__text {
  padding-left: 50px;
  padding-right: 50px;
  padding-bottom: 0px;
}
</style>
