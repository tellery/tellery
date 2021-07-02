import { css, cx } from '@emotion/css'
// import { useHistory } from "react-router-dom"
import React, { FunctionComponent, SVGAttributes } from 'react'
import { ThemingVariables } from 'styles'
import { useHistory } from 'react-router-dom'
import Icon from 'components/kit/Icon'

export function MainSideBarItem(props: {
  icon?: FunctionComponent<SVGAttributes<SVGElement>>
  active?: boolean
  title: string
  folded: boolean
  onClick: string | ((event: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => void)
}) {
  const history = useHistory()

  return (
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
      onClick={
        typeof props.onClick === 'function'
          ? props.onClick
          : () => {
              history.push(props.onClick as string)
            }
      }
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
      {!props.folded && (
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
  justify-content: flex-start;
`
