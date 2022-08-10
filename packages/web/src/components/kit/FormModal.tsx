/* eslint-disable @typescript-eslint/no-explicit-any */
import { ThemingVariables } from '@app/styles'
import { css, cx } from '@emotion/css'
import { forwardRef, ReactNode, ComponentType, ForwardedRef } from 'react'

export default forwardRef<
  HTMLOrSVGElement,
  {
    title?: string
    subtitle?: string
    body?: ReactNode
    footer?: ReactNode
    as?: keyof JSX.IntrinsicElements
  } & React.HTMLAttributes<HTMLOrSVGElement>
>(function FormModal(props, ref) {
  const { title, subtitle, body, footer, className, as, ...restProps } = props
  const Tag = (as || ('form' as keyof JSX.IntrinsicElements)) as unknown as ComponentType<
    {
      children: ReactNode
      ref: ForwardedRef<HTMLOrSVGElement>
    } & React.HTMLAttributes<HTMLOrSVGElement>
  >
  return (
    <Tag
      {...restProps}
      ref={ref}
      className={cx(
        css`
          width: 500px;
          min-height: 500px;
          background: ${ThemingVariables.colors.gray[5]};
          border-radius: 20px;
          overflow: hidden;
          padding: 40px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        `,
        className
      )}
    >
      {title ? (
        <h1
          className={css`
            font-style: normal;
            font-weight: 600;
            font-size: 24px;
            line-height: 28px;
            color: ${ThemingVariables.colors.text[0]};
            margin: 0;
          `}
        >
          {title}
        </h1>
      ) : null}
      {subtitle ? (
        <h2
          className={css`
            font-style: normal;
            font-weight: normal;
            font-size: 14px;
            line-height: 16px;
            text-align: center;
            color: ${ThemingVariables.colors.text[0]};
            margin: 10px 0 0;
          `}
        >
          {subtitle}
        </h2>
      ) : null}
      {body ? (
        <div
          className={css`
            margin-top: 30px;
            width: 100%;
          `}
        >
          {body}
        </div>
      ) : null}
      {footer ? (
        <div
          className={css`
            margin-top: 30px;
            width: 100%;
          `}
        >
          {footer}
        </div>
      ) : null}
    </Tag>
  )
})
