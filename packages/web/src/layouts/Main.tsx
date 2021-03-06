import { css } from '@emotion/css'
import { SideBar } from '@app/components/SideBar'
import { useMediaQuery } from '@app/hooks'
import type { ReactNode } from 'react'

export const Page = (props: { children: ReactNode }) => {
  const matches = useMediaQuery('only screen and (min-width: 700px)')

  return (
    <div
      className={css`
        display: flex;
        width: 100%;
        height: 100vh;
        /* mobile viewport bug fix */
        /* height: -webkit-fill-available; */
        /* overflow: hidden; */
        margin: 0;
      `}
    >
      {matches && <SideBar />}
      <main
        className={css`
          flex: 1 1;
          display: flex;
          flex-direction: column;
          position: relative;
          overflow-x: hidden;
        `}
      >
        {props.children}
      </main>
    </div>
  )
}

export default Page
