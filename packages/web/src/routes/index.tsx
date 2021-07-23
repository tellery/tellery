import React from 'react'
import { RoutesWithoutSession } from './RoutesWithoutSession'
import { RoutesWithSession } from './RoutesWithSession'

export const Routes = () => {
  return (
    <>
      <RoutesWithoutSession />
      <RoutesWithSession />
    </>
  )
}
