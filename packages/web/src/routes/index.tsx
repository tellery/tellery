import { BlockingUI } from '@app/components/BlockingUI'
import { CombineProviderSession } from '@app/components/CombineProviderSession'
import { OmniBox } from '@app/components/OmniBox'
import { env } from '@app/env'
import { useAuth } from '@app/hooks/useAuth'
import Main from '@app/layouts/Main'
import Confirm from '@app/pages/confirm'
import Embed from '@app/pages/embed'
import Index from '@app/pages/index'
import Login from '@app/pages/login'
import Stories from '@app/pages/stories'
import Story from '@app/pages/story'
import React, { useEffect } from 'react'
import ReactGA from 'react-ga4'
import { Route, Switch } from 'react-router-dom'
import { useLocation } from 'react-use'

const ENABLE_GA = env.PROD && env.GA4_ID

ENABLE_GA && ReactGA.initialize(env.GA4_ID)

const PrivateRoutes = () => {
  const { user, autoLogin } = useAuth()
  useEffect(() => {
    autoLogin()
  }, [autoLogin])
  if (!user) return null

  return (
    <Switch>
      <React.Suspense fallback={<BlockingUI blocking size={50} />}>
        <CombineProviderSession>
          <Main>
            <OmniBox />
            <React.Suspense fallback={<BlockingUI blocking size={50} />}>
              <Route path="/story/:id">
                <Story />
              </Route>
              <Route path="/stories">
                <Stories />
              </Route>
              <Route path="/">
                <Index />
              </Route>
            </React.Suspense>
          </Main>
        </CombineProviderSession>
      </React.Suspense>
    </Switch>
  )
}

export const Routes = () => {
  const locaiton = useLocation()
  useEffect(() => {
    ENABLE_GA && ReactGA.send('pageview')
  }, [locaiton])

  return (
    <>
      <Switch>
        <Route path="/login">
          <Login />
        </Route>
        <Route path="/confirm">
          <Confirm />
        </Route>
        <Route path="/embed/:id">
          <Embed />
        </Route>
        <Route>
          <PrivateRoutes />
        </Route>
      </Switch>
    </>
  )
}
