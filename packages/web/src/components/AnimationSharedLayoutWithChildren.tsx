import { AnimateSharedLayout } from 'framer-motion'
import React from 'react'

// const BlockInner = _BlockInner

export const AnimationSharedLayoutWithChildren = ({ children }: { children: React.ReactNode }) => {
  const Layout = AnimateSharedLayout as ReactFCWithChildren
  return <Layout>{children}</Layout>
}
