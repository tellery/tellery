export type UserInfoDTO = {
  id: string
  // Deprecated
  name: string
  // alias for name
  username: string
  avatar?: string
  email: string
  status: AccountStatus
}

export enum AccountStatus {
  ACTIVE = 'active',
  // user is invited, but have not yet created an account
  CREATING = 'creating',
  VERIFYING = 'verifying',
  // passwd verification, waiting for fulfilling account information
  CONFIRMED = 'confirmed',
}
