import { IconCommonMore, IconMenuDelete, IconMenuEdit } from '@app/assets/icons'
import { ThemingVariables } from '@app/styles'
import { Editor } from '@app/types'
import { css } from '@emotion/css'
import Tippy from '@tippyjs/react'
import { useState } from 'react'
import IconButton from './kit/IconButton'
import { MenuItem } from './MenuItem'
import { MenuWrapper } from './MenuWrapper'

type Value = NonNullable<Editor.SmartQueryBlock['content']['filters']>[0]

export default function FilterCard(props: { value: Value; onEdit(): void; onDelete(): void }) {
  const [visible, setVisible] = useState(false)

  return (
    <div
      className={css`
        background: ${ThemingVariables.colors.gray[3]};
        border-radius: 4px;
        padding: 6px;
        display: flex;
      `}
    >
      {props.value.operands.length > 1 ? (
        <div
          className={css`
            flex-shrink: 0;
            width: 30px;
            position: relative;
            margin-right: 6px;
          `}
        >
          <div
            className={css`
              position: absolute;
              top: 0;
              bottom: 0;
              left: 50%;
              right: 0;
              border: 1px solid ${ThemingVariables.colors.primary[3]};
              border-right: none;
            `}
          />
          <div
            className={css`
              position: absolute;
              top: calc(50% - 10px);
              background-color: ${ThemingVariables.colors.primary[3]};
              border-radius: 20px;
              font-size: 10px;
              line-height: 12px;
              width: 30px;
              height: 20px;
              padding: 4px 0;
              text-align: center;
              color: ${ThemingVariables.colors.text[0]};
            `}
          >
            {props.value.operator}
          </div>
        </div>
      ) : null}
      <div
        className={css`
          flex: 1;
          width: 0;
          > div + div {
            margin-top: 4px;
          }
        `}
      >
        {props.value.operands.map((operand, index) => (
          <div
            key={index}
            className={css`
              width: fit-content;
              background: ${ThemingVariables.colors.gray[5]};
              border: 1px solid ${ThemingVariables.colors.gray[1]};
              border-radius: 4px;
              padding: 6px 8.5px;
              font-size: 10px;
              line-height: 12px;
            `}
          >
            <span
              className={css`
                font-weight: 500;
                color: ${ThemingVariables.colors.text[0]};
              `}
            >
              {operand.fieldName}
            </span>
            &nbsp;
            <span
              className={css`
                color: ${ThemingVariables.colors.text[1]};
              `}
            >
              {operand.func}
            </span>
            &nbsp;
            <span
              className={css`
                font-weight: 500;
                color: ${ThemingVariables.colors.text[0]};
              `}
            >
              {operand.args.join('~')}
            </span>
          </div>
        ))}
      </div>
      <div
        className={css`
          flex-shrink: 0;
          padding-top: 3px;
        `}
      >
        <Tippy
          visible={visible}
          onClickOutside={() => setVisible(false)}
          interactive={true}
          placement="left-start"
          theme="tellery"
          arrow={false}
          offset={[0, 0]}
          appendTo={document.body}
          content={
            <MenuWrapper>
              <MenuItem
                title="Edit"
                icon={<IconMenuEdit />}
                onClick={() => {
                  setVisible(false)
                  props.onEdit()
                }}
              />
              <MenuItem
                title="Delete"
                icon={<IconMenuDelete />}
                onClick={() => {
                  setVisible(false)
                  props.onDelete()
                }}
              />
            </MenuWrapper>
          }
        >
          <IconButton
            icon={IconCommonMore}
            onClick={() => {
              setVisible(true)
            }}
          />
        </Tippy>
      </div>
    </div>
  )
}
