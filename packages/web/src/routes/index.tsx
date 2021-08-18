import { env } from '@app/env'
import React, { useEffect } from 'react'
import ReactGA from 'react-ga4'
import { useLocation } from 'react-use'
import { RoutesWithoutSession } from './RoutesWithoutSession'
import { RoutesWithSession } from './RoutesWithSession'

const ENABLE_GA = env.PROD && env.GA4_ID

ENABLE_GA && ReactGA.initialize(env.GA4_ID)

export const Routes = () => {
  const locaiton = useLocation()
  useEffect(() => {
    ENABLE_GA && ReactGA.send('pageview')
  }, [locaiton])

  return (
    <>
      <RoutesWithoutSession />
      <RoutesWithSession />
    </>
  )
}
