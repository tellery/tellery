export const env = {
  WEB_SOCKET_URI: (import.meta.env.VITE_WS_URI as string) ?? '/workspace',
  DEV: import.meta.env.DEV,
  PROD: import.meta.env.PROD,
  SENTRY_DSN: import.meta.env.VITE_SENTRY_DSN as string,
  GOOGLE_ANALYTICS_4_ID: import.meta.env.VITE_GOOGLE_ANALYTICS_4_ID as string
}
