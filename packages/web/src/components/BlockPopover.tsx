import type { Options, Placement } from '@popperjs/core'
import { AnimatePresence, motion } from 'framer-motion'
import { css } from '@emotion/css'
import React, { ReactNode, useState } from 'react'
import { createPortal } from 'react-dom'
import { Modifier, usePopper } from 'react-popper'

interface PopoverProps {
  referenceElement: HTMLElement | null
  open: boolean
  setOpen: (open: boolean) => void
  children: ReactNode
  modifiers?: Partial<Modifier<'offset', Options>>[] | undefined
  placement?: Placement
}

export const _BlockPopover = (props: PopoverProps) => {
  // return <_BlockPopoverContent {...props} />
  return <AnimatePresence>{props.open && <_BlockPopoverContent {...props} />}</AnimatePresence>
}

export const _BlockPopoverContent = (props: PopoverProps) => {
  const [modalRef, setModalRef] = useState<HTMLElement | null>(null)
  const pop = usePopper(props.referenceElement, modalRef, {
    placement: props.placement,
    modifiers: props.modifiers || [
      {
        name: 'offset',
        enabled: true,
        options: {
          offset: [0, 10]
        }
      }
    ]
  })

  return createPortal(
    <div
      onClick={() => {
        props.setOpen(false)
      }}
      key="modal"
      aria-labelledby="modal-label"
      className={css`
        z-index: 1040;
        outline: none;
        position: fixed;
        top: 0;
        bottom: 0;
        left: 0;
        right: 0;
        height: 100%;
        width: 100%;
        user-select: none;
      `}
    >
      <div
        ref={setModalRef}
        {...pop.attributes.popper}
        style={pop.styles.popper as React.CSSProperties}
        onClick={(e) => {
          e.stopPropagation()
        }}
        onMouseDown={(e) => {
          e.stopPropagation()
        }}
        onTouchStart={(e) => {
          e.stopPropagation()
        }}
      >
        <motion.div
          initial={{ opacity: 0, transform: 'scale(0.8)' }}
          animate={{ opacity: 1, transform: 'scale(1)' }}
          exit={{ opacity: 0, transform: 'scale(0.8)' }}
          transition={{ duration: 0.15 }}
        >
          {props.children}
        </motion.div>
      </div>
    </div>,
    document.body
  )
}
export const BlockPopover = _BlockPopover
