import { cx, css } from '@emotion/css'
import BoringAvatar from 'boring-avatars'
import { Img } from 'react-image'
import ContentLoader from 'react-content-loader'
import React from 'react'

const AvatarLoader: ReactFCWithChildren<{ size: number }> = ({ size }) => (
  <ContentLoader width={size} height={size} viewBox={`0 0 40 40`}>
    <circle cx="20" cy="20" r="20" />
  </ContentLoader>
)

export default function Avatar(props: { className?: string; size: number; email: string; src?: string }) {
  return props.src ? (
    <Img
      src={props.src}
      loader={<AvatarLoader size={props.size} />}
      decode={false}
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
