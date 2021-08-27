import React, { ReactNode } from 'react'
import Tippy from '@tippyjs/react/headless'
import { useTippyMenuAnimation } from '@app/hooks/useTippyMenuAnimation'
import { motion } from 'framer-motion'
import { MenuWrapper } from './MenuWrapper'

export const MenuConfirmPopover: React.FC<{ content: ReactNode; width: number }> = ({ children, content, width }) => {
  const animation = useTippyMenuAnimation('fade')

  return (
    <Tippy
      // content={content}
      render={(attrs) => {
        return (
          <motion.div animate={animation.controls} {...attrs}>
            <MenuWrapper width={width}>{content}</MenuWrapper>
          </motion.div>
        )
      }}
      hideOnClick={true}
      interactive
      trigger="click"
      placement="top"
      onMount={animation.onMount}
      onHide={(instance) => {
        animation.onHide(instance)
      }}
    >
      <span>{children}</span>
    </Tippy>
  )
}
