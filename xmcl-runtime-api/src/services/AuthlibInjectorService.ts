import { UserProfile } from '../entities/user.schema'
import { ServiceKey } from './Service'

export interface AuthlibInjectorService {
  isAuthlibInjectorReady(): Promise<boolean>
  getOrInstallAuthlibInjector(): Promise<string>
  getYggdrasilAuthHost(user: UserProfile): Promise<string | undefined>
}

export const AuthlibInjectorServiceKey: ServiceKey<AuthlibInjectorService> = 'AuthlibInjectorService'
