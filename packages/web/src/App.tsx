import 'normalize.css'
import React from 'react'
import { QueryClientProvider } from 'react-query'
import { BrowserRouter as Router, Routes } from 'react-router-dom'
import { Slide, ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { RecoilRoot } from 'recoil'
import 'tippy.js/animations/scale.css'
import 'tippy.js/dist/tippy.css'
import { AuthProvider } from './components/AuthProvider'
import { AppRoutes } from './routes'
import { ThemeProvider } from './components/ThemeProvider'
import { queryClient } from './utils'
import { CustomizedScrollbarProvider } from './components/CustomizedScrollbarProvider'
import { css } from '@emotion/css'
import { ThemingVariables } from './styles'
import IconButton from './components/kit/IconButton'
import { IconCommonClose } from './assets/icons'
import { loader } from '@monaco-editor/react'
import { env } from './env'

loader.config({ paths: { vs: env.MONACO_CDN } })

const App: React.FC = () => {
  return (
    <>
      <ThemeProvider>
        <CustomizedScrollbarProvider />
        <RecoilRoot>
          <QueryClientProvider client={queryClient}>
            <Router>
              <AuthProvider>
                <AppRoutes />
              </AuthProvider>
            </Router>
            <ToastContainer
              position="top-center"
              autoClose={3000}
              hideProgressBar
              newestOnTop={false}
              transition={Slide}
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
              closeButton={<IconButton icon={IconCommonClose}></IconButton>}
              className={css`
                --toastify-toast-min-height: 48px;
                width: initial;
                min-width: var(--toastify-toast-width);
              `}
              toastClassName={css`
                border-radius: 10px;
                box-shadow: ${ThemingVariables.boxShadows[0]};
                padding: 16px;
              `}
              bodyClassName={css`
                > div:last-child {
                  flex: 1;
                }
                padding: 0;
                margin: 0;
              `}
            />
          </QueryClientProvider>
        </RecoilRoot>
      </ThemeProvider>
    </>
  )
}

export default App
