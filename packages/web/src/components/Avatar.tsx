import { cx, css } from '@emotion/css'
import BoringAvatar from 'boring-avatars'

export default function Avatar(props: { className?: string; size: number; email: string; src?: string }) {
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
        name={props.email}
        square={false}
        variant="beam"
        colors={['#E9EFFF', '#002FA7', '#005BC5', '#00B4FC', '#42FEFE']}
      />
    </div>
  )
}
