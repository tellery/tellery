import { css, cx } from '@emotion/css'
import { ThemingVariables } from 'styles'
import { SVG2DataURI } from 'lib/svg'
import { IconCommonArrowDropDown } from 'assets/icons'
import { forwardRef, SelectHTMLAttributes } from 'react'

export default forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function FormSelect(props, ref) {
  return (
    <select
      ref={ref}
      {...props}
      className={cx(
        css`
          width: 185px;
          border: 1px solid ${ThemingVariables.colors.gray[1]};
          border-radius: 8px;
          outline: none;
          font-style: normal;
          font-weight: normal;
          font-size: 14px;
          padding: 9px 26px 9px 9px;
          appearance: none;
          background-repeat: no-repeat;
          background-position: calc(100% - 4px) 50%;
          cursor: pointer;
          text-overflow: ellipsis;
          display: block;
          padding-right: 30px;
          background-image: ${SVG2DataURI(IconCommonArrowDropDown)};
          color: ${ThemingVariables.colors.text[0]};
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
    </select>
  )
})
