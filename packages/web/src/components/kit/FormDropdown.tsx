import { css, cx } from '@emotion/css'
import { TelleryThemeLight, ThemingVariables } from '@app/styles'
import { SVG2DataURI } from '@app/lib/svg'
import { IconCommonArrowDropDown } from '@app/assets/icons'
import { forwardRef, ButtonHTMLAttributes, ReactNode } from 'react'
import Tippy from '@tippyjs/react'

export default forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { menu: ReactNode }>(
  function FormDropdown(props, ref) {
    return (
      <Tippy
        content={props.menu}
        placement="bottom-start"
        trigger="click"
        theme="tellery"
        interactive={true}
        arrow={false}
        offset={[-9, 4]}
      >
        <button
          ref={ref}
          {...props}
          className={cx(
            css`
              height: 36px;
              border: 1px solid ${ThemingVariables.colors.gray[1]};
              border-radius: 8px;
              outline: none;
              font-style: normal;
              font-weight: normal;
              font-size: 14px;
              padding: 0 26px 0 15px;
              appearance: none;
              background-color: transparent;
              background-repeat: no-repeat;
              background-position: calc(100% - 4px) 50%;
              cursor: pointer;
              text-overflow: ellipsis;
              display: block;
              background-image: ${SVG2DataURI(IconCommonArrowDropDown, TelleryThemeLight.colors.gray[0])};
              color: ${ThemingVariables.colors.text[0]};
              &:disabled {
                opacity: 1;
                color: ${ThemingVariables.colors.text[1]};
                background-color: ${ThemingVariables.colors.gray[3]};
                cursor: not-allowed;
              }
            `,
            props.className
          )}
        >
          {props.placeholder ? (
            <option value="" disabled={true}>
              {props.placeholder}
            </option>
          ) : null}
          {props.children}
        </button>
      </Tippy>
    )
  }
)
