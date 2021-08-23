import { ThemingVariables } from '@app/styles'
import { cx, css } from '@emotion/css'
import BoringAvatar from 'boring-avatars'

export default function Avatar(props: { className?: string; size: number; name: string; src?: string }) {
  return props.src ? (
    <img
      src={props.src}
      className={cx(
        css`
          width: ${props.size}px;
          height: ${props.size}px;
          border-radius: 50%;
        `,
        props.className
      )}
    />
  ) : (
    <div
      className={cx(
        css`
          border-radius: 50%;
          line-height: 0;
        `,
        props.className
      )}
    >
      <BoringAvatar
        size={props.size}
        name={props.name}
        square={false}
        variant="pixel"
        colors={ThemingVariables.colors.visualization}
      />
    </div>
  )
}
