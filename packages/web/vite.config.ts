import { defineConfig, loadEnv } from 'vite'
import type { ViteSentryPluginOptions } from 'vite-plugin-sentry'
import viteSentry from 'vite-plugin-sentry'
import { visualizer } from 'rollup-plugin-visualizer'
import react from '@vitejs/plugin-react'
import optimizeLodashImports from 'rollup-plugin-optimize-lodash-imports'
const reactSvgPlugin = require('./react-svg')
const { resolve } = require('path')

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
        '/api/connectors': {
          target: process.env.DEV_PROXY_API || 'http://localhost:8000',
          changeOrigin: true,
          secure: false,
          ws: true,
          configure: (proxy, options) => {
            proxy.on('proxyRes', function (proxyRes, req, res) {
              const cookies = proxyRes.headers['set-cookie'] as unknown as string[]
              if (cookies && cookies.length) {
                proxyRes.headers['set-cookie'] = [cookies[0].replace('samesite=none; secure; ', '')]
              }
            })
          }
        },
        '/api': {
          target: process.env.DEV_PROXY_API || 'http://localhost:8000',
          changeOrigin: true,
          secure: false,
          ws: true,
          configure: (proxy, options) => {
            proxy.on('proxyRes', function (proxyRes, req, res) {
              const cookies = proxyRes.headers['set-cookie'] as unknown as string[]
              if (cookies && cookies.length) {
                proxyRes.headers['set-cookie'] = [cookies[0].replace('samesite=none; secure; ', '')]
              }
            })
          }
        },
        '/socket.io': {
          target: process.env.DEV_PROXY_API || 'http://localhost:8000',
          changeOrigin: true,
          secure: false,
          ws: true
        }
      }
    },
    build: {
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
          embed: resolve(__dirname, 'embed.html')
        }
      }
    },
    plugins: [
      command === 'build' && optimizeLodashImports(),
      react(),
      reactSvgPlugin({
        defaultExport: 'component',
        svgo: true,
        svgoConfig: {
          plugins: [
            {
              name: 'removeViewBox',
              active: false
            }
          ]
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
