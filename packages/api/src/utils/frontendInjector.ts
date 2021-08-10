import config from 'config'
import path from 'path'
import fs from 'fs'
import { parse } from 'node-html-parser'

export function injectFrontendEnv(frontendAssetPath: string) {
  const indexPath = path.join(frontendAssetPath, 'index.html')
  if (!fs.existsSync(indexPath)) {
    console.warn('frontend asset not found')
    return
  }
  const indexFileContent = fs.readFileSync(indexPath)
  const html = parse(indexFileContent.toString())
  const script = html.querySelector('#telleryBootstrap')
  script.set_content(JSON.stringify(config.get<unknown>('frontendConfig')))
  fs.writeFileSync(indexPath, html.toString())
}
