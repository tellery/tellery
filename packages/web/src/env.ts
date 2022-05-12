const TelleryBootstrap = JSON.parse(document.getElementById('telleryBootstrap')!.textContent as string) as {
  sentry_dsn?: string
  ga4Id?: string
  version?: string
  asayerioProjectId?: string
  oauth2?: {
    enable: boolean
    clientId: string
    scope: string
    providerName?: string
    providerIcon?: string
    authorizeUrl?: string
  }
}

const ASAYERIO_PROJECTID =
  (TelleryBootstrap.asayerioProjectId as string) ?? (import.meta.env.VITE_ASAYERIO_PROJECTID as string)

export const env = {
  WEB_SOCKET_URI: (import.meta.env.VITE_WS_URI as string) ?? '/workspace',
  DEV: import.meta.env.DEV,
  PROD: import.meta.env.PROD,
  SENTRY_DSN: (TelleryBootstrap.sentry_dsn as string) ?? import.meta.env.VITE_SENTRY_DSN,
  GA4_ID: (TelleryBootstrap.ga4Id as string) ?? import.meta.env.VITE_GOOGLE_ANALYTICS_4_ID,
  VERSION: TelleryBootstrap.version as string,
  ASAYERIO_PROJECTID: ASAYERIO_PROJECTID ?? undefined,
  VITE_ENABLE_EMBED: !!import.meta.env.VITE_ENABLE_EMBED,
  MONACO_CDN: (import.meta.env.VITE_MONACO_EDITOR_CDN ??
    'https://cdn.jsdelivr.net/npm/monaco-editor@0.30.1/min/vs') as string,
  oauth2: {
    ...TelleryBootstrap.oauth2,
    enable: !!import.meta.env.VITE_OAUTH2_ENABLE,
    authorizeUrl: TelleryBootstrap.oauth2?.authorizeUrl ?? import.meta.env.VITE_OAUTH2_AUTHORIZE_URL,
    providerName: TelleryBootstrap.oauth2?.providerName ?? import.meta.env.VITE_OAUTH2_PROVIDER_NAME,
    providerIcon: TelleryBootstrap.oauth2?.providerIcon ?? import.meta.env.VITE_OAUTH2_PROVIDER_ICON
  }
}
