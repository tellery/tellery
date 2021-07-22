import { useAuth } from '@app/hooks/useAuth'
import { BlockingUI } from '@app/components/BlockingUI'
import { OmniBox } from '@app/components/OmniBox'
import Main from '@app/layouts/Main'
import Index from '@app/pages/index'
import Stories from '@app/pages/stories'
import Story from '@app/pages/story'
import Thought from '@app/pages/thought'
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
