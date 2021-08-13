import { useHover } from '@app/hooks'
import { ThemingVariables } from '@app/styles'
import { css, cx } from '@emotion/css'
import Tippy from '@tippyjs/react'
import React, { FunctionComponent, SVGAttributes, useEffect } from 'react'

export function MainSideBarTabHeader(props: {
  icon?: FunctionComponent<SVGAttributes<SVGElement>>
  active?: boolean
  title?: string
  hoverTitle?: string
  showTitle?: boolean
  onHover?: () => void
  onClick: (event: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => void
}) {
  const Icon = props.icon
  const [ref, isHovering] = useHover<HTMLAnchorElement>()

  useEffect(() => {
    if (isHovering) {
      props.onHover?.()
    }
  }, [isHovering, props])

  return (
    <Tippy
      disabled={!props.hoverTitle}
      content={props.hoverTitle ?? null}
      hideOnClick={false}
      arrow={false}
      placement="right"
    >
      <div>
        <a
          data-active={props.active}
          ref={ref}
          className={cx(
            sideBarContainerStyle,
            css`
              &:active,
              &[data-active='true'] {
                background: ${ThemingVariables.colors.gray[3]};
                :before {
                  content: '';
                  position: absolute;
                  left: 0px;
                  top: 0;
                  width: 4px;
                  height: 100%;
                  background: ${ThemingVariables.colors.primary[1]};
                  border-radius: 10px;
                }
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
                color={props.active ? ThemingVariables.colors.primary[1] : ThemingVariables.colors.text[0]}
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
      </div>
    </Tippy>
  )
}

const sideBarContainerStyle = css`
  cursor: pointer;
  color: ${ThemingVariables.colors.text[0]};
  height: 60px;
  box-sizing: border-box;
  transition: all 0.1s ease;
  font-size: 12px;
  line-height: 14px;
  margin: 0 -16px;
  text-decoration: none;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
`
