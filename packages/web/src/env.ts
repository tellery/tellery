const TelleryBootstrap = JSON.parse(document.getElementById('telleryBootstrap')!.textContent as string)

export const env = {
  WEB_SOCKET_URI: (import.meta.env.VITE_WS_URI as string) ?? '/workspace',
  DEV: import.meta.env.DEV,
  PROD: import.meta.env.PROD,
  SENTRY_DSN: (TelleryBootstrap.SENTRY_DSN as string) ?? import.meta.env.VITE_SENTRY_DSN,
  GA4_ID: (TelleryBootstrap.GA4_ID as string) ?? import.meta.env.VITE_GOOGLE_ANALYTICS_4_ID,
  VERSION: TelleryBootstrap.VERSION as string,
  ASAYERIO_PROJECTID:
    (TelleryBootstrap.ASAYERIO_PROJECTID as number) ?? parseInt(import.meta.env.VITE_ASAYERIO_PROJECTID as string, 10)
}
