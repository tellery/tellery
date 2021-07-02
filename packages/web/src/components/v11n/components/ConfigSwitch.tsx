import { css } from '@emotion/css'
import { ThemingVariables } from 'styles'

export function ConfigSwitch(props: { value: boolean; onChange(value: boolean): void }) {
  return (
    <label
      className={css`
        position: relative;
        display: inline-block;
        width: 46px;
        height: 24px;
        flex-shrink: 0;

        input:checked + span {
          background-color: ${ThemingVariables.colors.primary[1]};
        }

        input:checked + span:before {
          transform: translateX(22px);
        }
      `}
    >
      <input
        checked={props.value}
        onChange={(e) => {
          props.onChange(e.target.checked)
        }}
        type="checkbox"
        className={css`
          opacity: 0;
          width: 0;
          height: 0;
        `}
      />
      <span
        className={css`
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #ccc;
          transition: 0.2s ease;
          border-radius: 24px;

          &:before {
            position: absolute;
            content: '';
            height: 20px;
            width: 20px;
            left: 2px;
            bottom: 2px;
            background-color: ${ThemingVariables.colors.gray[5]};
            transition: 0.2s ease;
            border-radius: 50%;
          }
        `}
      />
    </label>
  )
}
