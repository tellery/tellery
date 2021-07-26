import { defineConfig, loadEnv } from 'vite'
import reactRefresh from '@vitejs/plugin-react-refresh'
import type { ViteSentryPluginOptions } from 'vite-plugin-sentry'
import viteSentry from 'vite-plugin-sentry'
import reactJsx from 'vite-react-jsx'
import { visualizer } from 'rollup-plugin-visualizer'
import optimizeLodashImports from 'rollup-plugin-optimize-lodash-imports'
const reactSvgPlugin = require('vite-plugin-react-svg')

/*
	Configure sentry plugin
*/
const sentryConfig = (mode: string, authToken: string): ViteSentryPluginOptions => ({
  url: 'https://sentry.io',
  authToken: authToken,
  org: 'tellery',
  project: 'tellery',
  release: '1.0',
  deploy: {
    env: mode
  },
  setCommits: {
    auto: true
  },
  sourceMaps: {
    include: ['./dist/assets'],
    ignore: ['node_modules'],
    urlPrefix: '~/assets'
  }
})

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }: { command: string; mode: string }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''))

  return {
    resolve: {
      alias: {
        '@app': '/src'
      }
    },
    server: {
      proxy: {
        '/api': process.env.DEV_PROXY_API || 'http://localhost:8000'
      }
    },
    plugins: [
      command === 'build' && optimizeLodashImports(),
      reactJsx(),
      reactRefresh(),
      reactSvgPlugin({
        defaultExport: 'component',
        svgo: true,
        svgoConfig: {
          plugins: {
            removeViewBox: false
          }
        },
        expandProps: 'end',
        ref: false,
        memo: false,
        replaceAttrValues: null,
        svgProps: null,
        titleProp: false
      }),
      process.env.SENTRY_AUTH_TOKEN && viteSentry(sentryConfig(mode, process.env.SENTRY_AUTH_TOKEN)),
      mode === 'analyze' && visualizer({ open: true })
    ]
  }
})
