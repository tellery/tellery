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
        height: 100vh;
        width: 100%;
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
