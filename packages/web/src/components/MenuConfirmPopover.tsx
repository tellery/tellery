import React, { ReactNode } from 'react'
import Tippy from '@tippyjs/react/headless'
import { useTippyMenuAnimation } from '@app/hooks/useTippyMenuAnimation'
import { motion } from 'framer-motion'
import { MenuWrapper } from './MenuWrapper'

export const MenuConfirmPopover: React.FC<{ content: ReactNode }> = ({ children, content }) => {
  const animation = useTippyMenuAnimation('fade')
  return (
    <Tippy
      // content={content}
      render={(attrs) => {
        return (
          <motion.div animate={animation.controls} {...attrs}>
            <MenuWrapper>{content}</MenuWrapper>
          </motion.div>
        )
      }}
      hideOnClick={true}
      interactive
      trigger="click"
      placement="top"
      onMount={animation.onMount}
      onHide={animation.onHide}
    >
      <span>{children}</span>
    </Tippy>
  )
}
