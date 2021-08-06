const TelleryBootstrap = JSON.parse(document.getElementById('telleryBootstrap')!.textContent as string)

export const env = {
  WEB_SOCKET_URI: (import.meta.env.VITE_WS_URI as string) ?? '/workspace',
  DEV: import.meta.env.DEV,
  PROD: import.meta.env.PROD,
  SENTRY_DSN: TelleryBootstrap.SENTRY_DSN as string,
  GA4_ID: TelleryBootstrap.GA4_ID as string,
  VERSION: TelleryBootstrap.VERSION as string
}
