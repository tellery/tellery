export const env = {
  WEB_SOCKET_URI: (import.meta.env.VITE_WS_URI as string) ?? '/workspace',
  DEV: import.meta.env.DEV,
  PROD: import.meta.env.PROD,
  SENTRY_DSN: import.meta.env.VITE_SENTRY_DSN as string
}
