import config from 'config'
import path from 'path'
import fs from 'fs'
import { parse } from 'node-html-parser'

export function loadFrontendEnvConfig(): Record<string, string> {
  const fromConfigs = config.get<Record<string, string>>('frontendConfig')
  const env = Object.fromEntries(
    Object.entries(process.env)
      .filter(([k, v]) => k.startsWith('FRONTEND_') && v)
      .map(([k, v]) => [k.replace('FRONTEND_', ''), v]),
  ) as Record<string, string>
  return { ...env, ...fromConfigs }
}

export function injectFrontendEnv(frontendAssetPath: string): void {
  const indexPath = path.join(frontendAssetPath, 'index.html')
  if (!fs.existsSync(indexPath)) {
    console.warn('frontend asset not found')
    return
  }
  const indexFileContent = fs.readFileSync(indexPath)
  const html = parse(indexFileContent.toString())
  const script = html.querySelector('#telleryBootstrap')
  script?.set_content(JSON.stringify(loadFrontendEnvConfig()))
  fs.writeFileSync(indexPath, html.toString())
}
