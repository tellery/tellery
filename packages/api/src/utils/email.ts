export type EmailCodePayload = {
  userId: string
  expiresAt: number
  type: 'confirm'
}
