import { env } from '@app/env'
import React, { useEffect } from 'react'
import ReactGA from 'react-ga4'
import { useLocation } from 'react-use'
import { RoutesWithoutSession } from './RoutesWithoutSession'
import { RoutesWithSession } from './RoutesWithSession'

env.GOOGLE_ANALYTICS_4_ID && ReactGA.initialize(env.GOOGLE_ANALYTICS_4_ID)

export const Routes = () => {
  const locaiton = useLocation()
  useEffect(() => {
    env.GOOGLE_ANALYTICS_4_ID && ReactGA.send('pageview')
  }, [locaiton])

  return (
    <>
      <RoutesWithoutSession />
      <RoutesWithSession />
    </>
  )
}
