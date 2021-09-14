import { ThemingVariables } from '@app/styles'
import { css } from '@emotion/css'
import Tippy from '@tippyjs/react'
import { ReactNode } from 'react'
import { ConfigTab } from './ConfigTab'

export function ConfigPopoverWithTabs(props: { tabs: string[]; target: ReactNode; children: ReactNode[] }) {
  return (
    <Tippy
      theme="tellery"
      arrow={false}
      interactive={true}
      trigger="click"
      content={
        <div
          className={css`
            width: 360px;
            background: ${ThemingVariables.colors.gray[5]};
            box-shadow: ${ThemingVariables.boxShadows[0]};
            border-radius: 10px;
          `}
        >
          <ConfigTab tabs={props.tabs}>{props.children}</ConfigTab>
        </div>
      }
    >
      <div
        className={css`
          line-height: 0;
        `}
      >
        {props.target}
      </div>
    </Tippy>
  )
}
