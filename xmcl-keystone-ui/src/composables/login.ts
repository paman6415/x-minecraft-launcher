import { DialogKey } from './dialog'
import { useLocalStorageCacheStringValue, useLocalStorageCache } from '@/composables/cache'

export function useAccountSystemHistory() {
  const authority = useLocalStorageCacheStringValue('loginLastAuthAuthority', 'mojang' as string, 'last-auth-service')
  const history = computed(() => useLocalStorageCache<string[]>(`loginAuthorityHistory:${authority.value}`, () => [], JSON.stringify, JSON.parse).value)
  const yggdrasilAuthorities = useLocalStorageCache('loginYggdrasilAuthorities', () => [], JSON.stringify, JSON.parse)

  return {
    authority,
    history,
  }
}

export const LoginDialog: DialogKey<{ username?: string; service?: string; error?: string }> = 'login'
