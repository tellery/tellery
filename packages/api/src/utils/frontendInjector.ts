import config from 'config'

export function loadFrontendEnvConfig(): Record<string, string> {
  const fromConfigs = config.get<Record<string, string>>('frontendConfig')
  const env = Object.fromEntries(
    Object.entries(process.env)
      .filter(([k, v]) => k.startsWith('FRONTEND_') && v)
      .map(([k, v]) => [k.replace('FRONTEND_', ''), v]),
  ) as Record<string, string>
  return { ...env, ...fromConfigs }
}
