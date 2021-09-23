import { ThemingVariables } from '@app/styles'
import { css } from '@emotion/css'
import Tippy from '@tippyjs/react'
import { ReactNode, useState } from 'react'
import { ConfigTab } from './ConfigTab'

export function ConfigPopoverWithTabs(props: {
  tabs: string[]
  content: (({ onClose }: { onClose: () => void }) => ReactNode)[]
  children: ReactNode
}) {
  const [visible, setVisible] = useState(false)

  return (
    <Tippy
      theme="tellery"
      arrow={false}
      interactive={true}
      visible={visible}
      onClickOutside={() => setVisible(false)}
      placement="left-start"
      appendTo={document.body}
      content={
        <div
          className={css`
            width: 360px;
            background: ${ThemingVariables.colors.gray[5]};
            box-shadow: ${ThemingVariables.boxShadows[0]};
            border-radius: 10px;
          `}
        >
          <ConfigTab tabs={props.tabs}>
            {props.content.map((content, index) => (
              <div
                key={index}
                className={css`
                  padding: 8px 10px;
                  > * + * {
                    margin-top: 4px;
                  }
                `}
              >
                {content({ onClose: () => setVisible(false) })}
              </div>
            ))}
          </ConfigTab>
        </div>
      }
    >
      <div
        onClick={() => setVisible((old) => !old)}
        className={css`
          line-height: 0;
        `}
      >
        {props.children}
      </div>
    </Tippy>
  )
}
