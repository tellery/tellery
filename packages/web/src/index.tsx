import React from 'react'
import ReactDOM from 'react-dom'
import './index.css'
import * as Sentry from '@sentry/react'
import { Integrations } from '@sentry/tracing'
import debug from 'debug'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import App from './App'
import { env } from './env'

env.DEV && debug.enable('tellery:*')

dayjs.extend(relativeTime)
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
