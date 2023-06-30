import { IssueKey } from '../entities/issue'
import { UserProfile } from '../entities/user.schema'
import { ServiceKey } from './Service'

export const MissingAuthLibInjectorIssue: IssueKey<void> = 'missingAuthlibInjector'

export interface ExternalAuthSkinService {
  isAuthLibInjectorReady(userProfile: UserProfile): Promise<boolean>
  installAuthLibInjector(userProfile: UserProfile): Promise<string>
}

export const ExternalAuthSkinServiceKey: ServiceKey<ExternalAuthSkinService> = 'ExternalAuthSkinService'
