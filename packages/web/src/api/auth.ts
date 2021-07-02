import type { AxiosInstance, AxiosStatic } from 'axios'

export interface OptionsSchema {
  authHeaders?: Record<string, string>
  retries: number
  retryDelay?: number
}

const namespace = 'jike-tellery-auth'

const defaultOptions: OptionsSchema = {
  authHeaders: {},
  retries: 10,
  retryDelay: 0
}

export function wrapAuth(axios: AxiosInstance | AxiosStatic) {
  axios.interceptors.response.use(undefined, (error) => {
    console.error(error)
    const currentState = getCurrentState(error.config)
    if (error.response.status === 401) {
      if (currentState.retryCount <= 0) {
        if (window.location.pathname !== '/login') {
          window.open('/login', '_self')
        }
        throw new Error('Retry Count Exceed')
      }
      currentState.retryCount -= 1
      return new Promise((resolve) => setTimeout(() => resolve(axios(error.config)), defaultOptions.retryDelay))
    }
    return Promise.reject(error)
  })
  return axios
}

function getCurrentState(config: { [namespace: string]: { retryCount: number } }) {
  const currentState = config[namespace] || { retryCount: 0 }
  currentState.retryCount = currentState.retryCount === undefined ? defaultOptions.retries : currentState.retryCount
  config[namespace] = currentState
  return currentState
}
