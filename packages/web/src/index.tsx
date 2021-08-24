// import './utils/wdyr'
import React from 'react'
import ReactDOM from 'react-dom'
import 'react-perfect-scrollbar/dist/css/styles.css'
import './index.css'
import * as Sentry from '@sentry/react'
import { Integrations } from '@sentry/tracing'
import debug from 'debug'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import App from './App'
import { env } from './env'
import './i18n'
import Stats from 'stats.js'

env.DEV && debug.enable('tellery:*')

dayjs.extend(relativeTime)

const initStats = () => {
  const stats = new Stats()
  stats.showPanel(0) // 0: fps, 1: ms, 2: mb, 3+: custom
  stats.dom.setAttribute(
    'style',
    'position: fixed; left: 0px; top: 50%; cursor: pointer; opacity: 0.9; z-index: 10000;'
  )
  document.body.appendChild(stats.dom)

  function animate() {
    stats.begin()
    stats.end()

    requestAnimationFrame(animate)
  }

  requestAnimationFrame(animate)
}

env.DEV && initStats()

Sentry.init({
  dsn: env.SENTRY_DSN,
  beforeSend(event) {
    return event
  },
  enabled: env.PROD,
  autoSessionTracking: true,
  integrations: [
    new Integrations.BrowserTracing({
      beforeNavigate: (context) => {
        return {
          ...context,
          name: location.pathname.replace(/\/[a-fA-F0-9-]+$/g, '/:id')
        }
      }
    })
  ],
  tracesSampleRate: 1
})

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
)
