enum AuthType {
  BASIC = 'basic',
  TOKEN = 'token',
  TLS = 'tls',
  NONE = 'none',
}

type AuthData = Partial<Record<'username' | 'password' | 'token' | 'cert', string>>

export { AuthType, AuthData }
