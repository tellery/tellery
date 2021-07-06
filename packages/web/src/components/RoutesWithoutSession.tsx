import Confirm from 'pages/confirm'
import Login from '@app/pages/login'
import React from 'react'
import { Route } from 'react-router-dom'

export const RoutesWithoutSession = () => {
  return (
    <>
      <Route path="/login">
        <Login />
      </Route>
      <Route path="/confirm">
        <Confirm />
      </Route>
    </>
  )
}
