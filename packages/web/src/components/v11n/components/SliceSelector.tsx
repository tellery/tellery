import { cx, css } from '@emotion/css'
import { CSSProperties, ReactNode } from 'react'
import { ThemingVariables } from '@app/styles'
import { IconCommonCheck } from '@app/assets/icons'
import Tippy from '@tippyjs/react'

export function SliceSelector(props: {
  className?: string
  value: { key: string; title: string; color: number }
  onChange(value: { key: string; title: string; color: number }): void
}) {
  return (
    <div
      className={cx(
        props.className,
        css`
          overflow: hidden;
          display: inline-flex;
          align-items: center;
          height: 32px;
          width: 100%;
        `
      )}
    >
      <Tippy
        theme="tellery"
        arrow={false}
        interactive={true}
        trigger="click"
        content={
          <div
            className={css`
              padding: 20px;
              width: 240px;
              background: ${ThemingVariables.colors.gray[5]};
              box-shadow: ${ThemingVariables.boxShadows[0]};
              border-radius: 8px;
            `}
          >
            <div
              className={css`
                margin: -2.5px;
                display: flex;
                flex-wrap: wrap;
              `}
            >
              {ThemingVariables.colors.visualization.map((color, index) => (
                <Button
                  key={color}
                  onClick={() => {
                    props.onChange({
                      ...props.value,
                      color: index
                    })
                  }}
                  style={{
                    backgroundColor: color,
                    cursor: props.value.color === index ? 'default' : 'pointer'
                  }}
                >
                  {props.value.color === index ? <IconCommonCheck color={ThemingVariables.colors.gray[5]} /> : ''}
                </Button>
              ))}
            </div>
          </div>
        }
      >
        <div
          className={css`
            flex-shrink: 0;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            cursor: pointer;
            background-color: ${ThemingVariables.colors.visualization[props.value.color] ||
            ThemingVariables.colors.visualizationOther};
          `}
        />
      </Tippy>
      <input
        className={css`
          margin-left: 10px;
          flex: 1;
          width: 0;
          font-size: 12px;
          line-height: 14px;
          appearance: none;
          outline: none;
          border: none;
          font-weight: normal;
          text-overflow: ellipsis;
          background-color: transparent;
          color: ${ThemingVariables.colors.text[0]};
        `}
        value={props.value.title}
        onChange={(e) => {
          props.onChange({
            ...props.value,
            title: e.target.value
          })
        }}
        placeholder={props.value.key}
      />
    </div>
  )
}

function Button(props: { style?: CSSProperties; onClick: () => void; children?: ReactNode }) {
  return (
    <button
      onClick={props.onClick}
      className={css`
        appearance: none;
        border: none;
        outline: none;
        width: 36px;
        height: 36px;
        border-radius: 6px;
        margin: 2.5px;
        display: flex;
        align-items: center;
        justify-content: center;
      `}
      style={props.style}
    >
      {props.children}
    </button>
  )
}
