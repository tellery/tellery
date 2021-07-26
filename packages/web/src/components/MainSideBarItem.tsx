import Icon from '@app/components/kit/Icon'
import { ThemingVariables } from '@app/styles'
import { css, cx } from '@emotion/css'
import Tippy from '@tippyjs/react'
import React, { FunctionComponent, SVGAttributes } from 'react'

export function MainSideBarItem(props: {
  icon?: FunctionComponent<SVGAttributes<SVGElement>>
  active?: boolean
  title?: string
  hoverTitle?: string
  onClick: (event: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => void
}) {
  return (
    <Tippy
      disabled={!props.hoverTitle}
      content={props.hoverTitle ?? null}
      hideOnClick={false}
      arrow={false}
      placement="right"
    >
      <a
        data-active={props.active}
        className={cx(
          sideBarContainerStyle,
          css`
            &:hover {
              background: ${ThemingVariables.colors.primary[3]};
            }
            &:active {
              background: ${ThemingVariables.colors.primary[2]};
            }
            &[data-active='true'] {
              cursor: default;
              background: ${ThemingVariables.colors.primary[1]};
              color: ${ThemingVariables.colors.gray[5]};
            }
          `
        )}
        title={props.title}
        onClick={props.onClick}
      >
        {(props.icon && (
          <div
            className={css`
              width: 20px;
              align-items: center;
              display: flex;
              justify-content: center;
            `}
          >
            <Icon
              icon={props.icon}
              color={props.active ? ThemingVariables.colors.gray[5] : ThemingVariables.colors.text[0]}
              className={css`
                flex-shrink: 0;
              `}
            />
          </div>
        )) ?? (
          <div
            className={css`
              width: 20px;
              flex-shrink: 0;
            `}
          />
        )}
      </a>
    </Tippy>
  )
}

export const sideBarContainerStyle = css`
  cursor: pointer;
  color: ${ThemingVariables.colors.text[0]};
  border-radius: 8px;
  height: 36px;
  padding: 0px 8px;
  box-sizing: border-box;
  transition: all 0.1s ease;
  font-size: 12px;
  line-height: 14px;
  text-decoration: none;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
  display: flex;
  align-items: center;
  margin-bottom: 10px;
  justify-content: center;
`
