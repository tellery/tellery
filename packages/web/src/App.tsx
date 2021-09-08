import 'normalize.css'
import React from 'react'
import { QueryClientProvider } from 'react-query'
import { BrowserRouter as Router, Switch } from 'react-router-dom'
import { Slide, ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { RecoilRoot } from 'recoil'
import 'tippy.js/animations/scale.css'
import 'tippy.js/dist/tippy.css'
import { AuthProvider } from './components/AuthProvider'
import { Routes } from './routes'
import { ThemeProvider } from './components/ThemeProvider'
import { queryClient } from './utils'
import { CustomizedScrollbarProvider } from './components/CustomizedScrollbarProvider'
import { css } from '@emotion/css'

const App: React.FC = () => {
  return (
    <>
      <ThemeProvider>
        <CustomizedScrollbarProvider />
        <RecoilRoot>
          <QueryClientProvider client={queryClient}>
            <Router>
              <Switch>
                <AuthProvider>
                  <Routes />
                </AuthProvider>
              </Switch>
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
              bodyClassName={css`
                > div {
                  width: 100%;
                }
              `}
            />
          </QueryClientProvider>
        </RecoilRoot>
      </ThemeProvider>
    </>
  )
}

export default App
