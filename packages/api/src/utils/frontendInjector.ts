import config from 'config'
import path from 'path'
import fs from 'fs'

export function loadFrontendEnvConfig(): Record<string, string> {
  const fromConfigs = config.get<Record<string, string>>('frontendConfig')
  const env = Object.fromEntries(
    Object.entries(process.env)
      .filter(([k, v]) => k.startsWith('FRONTEND_') && v)
      .map(([k, v]) => [k.replace('FRONTEND_', ''), v]),
  ) as Record<string, string>
  return { ...env, ...fromConfigs }
}

export function injectFrontendEnvToFile(frontendAssetPath: string, envString: string): void {
  const indexPath = path.join(frontendAssetPath, 'index.html')
  if (!fs.existsSync(indexPath)) {
    console.warn('frontend asset not found')
    return
  }
  const indexFileContent = fs.readFileSync(indexPath)
  fs.writeFileSync(
    indexPath,
    indexFileContent
      .toString()
      .replace(
        /(<script .*?\s* id="telleryBootstrap">\s*)(\{.*?\})(\s*<\/script>)/s,
        (match, p1, p2, p3) => {
          return `${p1}${envString}${p3}`
        },
      ),
  )
}
