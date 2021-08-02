import { ThemingVariables } from '@app/styles'
import { css, cx } from '@emotion/css'
import Tippy from '@tippyjs/react'
import React, { FunctionComponent, SVGAttributes } from 'react'

export function MainSideBarItem(props: {
  icon?: FunctionComponent<SVGAttributes<SVGElement>>
  active?: boolean
  title?: string
  hoverTitle?: string
  showTitle?: boolean
  onClick: (event: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => void
}) {
  const Icon = props.icon
  return (
    <Tippy
      disabled={!props.hoverTitle}
      delay={1000}
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
        {Icon && (
          <div
            className={css`
              width: 20px;
              align-items: center;
              display: flex;
              justify-content: center;
            `}
          >
            <Icon
              color={props.active ? ThemingVariables.colors.gray[5] : ThemingVariables.colors.text[0]}
              className={css`
                flex-shrink: 0;
              `}
            />
          </div>
        )}
        {props.showTitle && (
          <span
            className={css`
              margin-left: 5px;
              width: 100%;
              text-overflow: ellipsis;
              overflow: hidden;
            `}
          >
            {props.title}
          </span>
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
