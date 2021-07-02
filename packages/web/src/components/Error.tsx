import { css } from '@emotion/css'
import React from 'react'

export const Error = (props: { statusCode: number }) => {
  return (
    <>
      <div
        className={css`
          position: relative;
          display: flex;
          height: 100%;
          min-height: 300px;
          align-items: center;
          justify-content: center;
        `}
      >
        {props.statusCode === 404 && 'Not Found'}
        {props.statusCode === -1 && '  An Error Occurred'}
      </div>
    </>
  )
}
