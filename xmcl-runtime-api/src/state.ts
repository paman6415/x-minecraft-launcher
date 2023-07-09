import { SettingState } from './services/BaseService'
import { InstanceModsState } from './services/InstanceModsService'
import { GameOptionsState } from './services/InstanceOptionsService'
import { SaveState } from './services/InstanceSavesService'
import { InstanceState } from './services/InstanceService'
import { InstanceVersionState } from './services/InstanceVersionService'
import { JavaState } from './services/JavaService'
import { LaunchState } from './services/LaunchService'
import { PeerState } from './services/PeerService'
import { UserState } from './services/UserService'
import { VersionState } from './services/VersionService'

export type AllServiceMutations =
  Mutations<SettingState>
  & Mutations<InstanceState>
  & Mutations<InstanceModsState>
  & Mutations<GameOptionsState>
  & Mutations<SaveState>
  & Mutations<JavaState>
  & Mutations<LaunchState>
  & Mutations<UserState>
  & Mutations<VersionState>
  & Mutations<PeerState>
  & Mutations<InstanceVersionState>

export type MutationKeys = keyof AllServiceMutations
export type MutationPayload<T extends MutationKeys> = AllServiceMutations[T]

export type Mutations<T> = {
  [K in keyof T as T[K] extends Function ? K : never]: T[K] extends ((payload: infer P) => void) ? P : never
}

export const AllStates = [
  SettingState,
  InstanceState,
  InstanceModsState,
  GameOptionsState,
  SaveState,
  JavaState,
  LaunchState,
  UserState,
  VersionState,
  PeerState,
  InstanceVersionState,
]
