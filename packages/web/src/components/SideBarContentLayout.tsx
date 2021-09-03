import { ThemingVariables } from '@app/styles'
import { css } from '@emotion/css'
import styled from '@emotion/styled'
import React, { ReactNode } from 'react'

export const SideBarContentLayout: React.FC<{ title: ReactNode }> = ({ children, title }) => {
  return (
    <>
      <div
        className={css`
          padding: 0;
          width: 100%;
          display: flex;
          flex-direction: column;
          height: 100%;
        `}
      >
        <div
          className={css`
            display: flex;
            justify-content: flex-end;
            padding: 16px;
          `}
        ></div>
        <SideBarTitle>{title}</SideBarTitle>
        <div
          className={css`
            flex: 1;
            overflow-y: hidden;
            display: flex;
            flex-direction: column;
          `}
        >
          {children}
        </div>
      </div>
    </>
  )
}

export const SideBarTitle = styled.div`
  font-style: normal;
  font-weight: bold;
  font-size: 24px;
  line-height: 29px;
  color: ${ThemingVariables.colors.text[0]};
  flex-grow: 0;
  flex-shrink: 0;
  padding: 0px 16px 10px 16px;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
`
