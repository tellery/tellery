import { IconCommonClose } from '@app/assets/icons'
import { ThemingVariables } from '@app/styles'
import { css } from '@emotion/css'
import Tippy from '@tippyjs/react'
import { ReactNode, useState } from 'react'

export function ConfigPopover(props: { title: string; content: ReactNode; children: ReactNode }) {
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
            width: 284px;
            background: ${ThemingVariables.colors.gray[5]};
            box-shadow: ${ThemingVariables.boxShadows[0]};
            border-radius: 10px;
          `}
        >
          <div
            className={css`
              height: 48px;
              padding: 0 16px;
              display: flex;
              align-items: center;
              justify-content: space-between;
            `}
          >
            <h3
              className={css`
                margin: 0;
                font-weight: 500;
                font-size: 12px;
                line-height: 15px;
                color: ${ThemingVariables.colors.text[0]};
              `}
            >
              {props.title}
            </h3>
            <IconCommonClose
              onClick={() => setVisible(false)}
              color={ThemingVariables.colors.text[0]}
              className={css`
                cursor: pointer;
              `}
            />
          </div>
          {props.content}
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
