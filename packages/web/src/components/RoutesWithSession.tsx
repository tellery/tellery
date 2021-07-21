import { useAuth } from '@app/hooks/useAuth'
import { BlockingUI } from 'components/BlockingUI'
import { OmniBox } from 'components/OmniBox'
import Main from 'layouts/Main'
import Index from 'pages/index'
import Stories from 'pages/stories'
import Story from 'pages/story'
import Thought from 'pages/thought'
import React from 'react'
import { Route, Switch } from 'react-router-dom'
import { CombineProviderSession } from './CombineProviderSession'

const PrivateRoutes = () => {
  return (
    <Switch>
      <React.Suspense fallback={<BlockingUI blocking size={50} />}>
        <CombineProviderSession>
          <Main>
            <OmniBox />
            <React.Suspense fallback={<BlockingUI blocking size={50} />}>
              <Route path="/thought">
                <Thought />
              </Route>
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

export const RoutesWithSession = () => {
  const { user } = useAuth()
  return <Route>{user ? <PrivateRoutes /> : null}</Route>
}
