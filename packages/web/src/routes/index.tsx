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
import Explore from '@app/pages/explore'
import Story from '@app/pages/story'
import AnalyzeSql from '@app/pages/analyzeSql'
import React, { useEffect } from 'react'
import ReactGA from 'react-ga4'
import { Route, Routes } from 'react-router-dom'
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
    <React.Suspense fallback={<BlockingUI blocking size={50} />}>
      <CombineProviderSession>
        <Main>
          <OmniBox />
          <React.Suspense fallback={<BlockingUI blocking size={50} />}>
            <Routes>
              <Route path="/story/:id" element={<Story />}></Route>
              <Route path="/stories" element={<Stories />}></Route>
              <Route path="/explore" element={<Explore />}></Route>
              <Route path="/explore/analyzeSql" element={<AnalyzeSql />}></Route>
              <Route path="/" element={<Index />}></Route>
            </Routes>
          </React.Suspense>
        </Main>
      </CombineProviderSession>
    </React.Suspense>
  )
}

export const AppRoutes = () => {
  const locaiton = useLocation()
  useEffect(() => {
    ENABLE_GA && ReactGA.send('pageview')
  }, [locaiton])

  return (
    <Routes>
      <Route path="/login" element={<Login />}></Route>
      <Route path="/confirm" element={<Confirm />}></Route>
      <Route path="/embed/:id" element={<Embed />}></Route>
      <Route path="*" element={<PrivateRoutes />}></Route>
    </Routes>
  )
}
