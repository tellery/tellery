import React from 'react'
import ContentLoader from 'react-content-loader'

export const SideBarLoader: ReactFCWithChildren = () => {
  return (
    <ContentLoader viewBox="0 0 210 36" style={{ width: '100%', height: '32px', padding: '0' }}>
      <rect x="0" y="0" rx="0" ry="0" width="210" height="36" />
    </ContentLoader>
  )
}
