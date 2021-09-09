import type { Options, Placement } from '@popperjs/core'
import { AnimatePresence, motion } from 'framer-motion'
import { css, cx } from '@emotion/css'
import React, { ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Modifier, usePopper } from 'react-popper'
import { useEditor } from './hooks'
import { useOnClickOutside } from '@app/hooks'
import { PopoverMotionVariants } from '@app/styles/animations'

interface PopoverProps {
  referenceElement: HTMLElement | null | Range
  open: boolean
  setOpen: (open: boolean) => void
  children: ReactNode
  modifiers?: ReadonlyArray<Modifier<unknown>>
  placement?: Placement
  disableClickThrough?: boolean
  lockBodyScroll?: boolean
}

export const EditorPopover = (props: PopoverProps) => {
  return <AnimatePresence>{props.open && <_EditorPopoverContent {...props} />}</AnimatePresence>
}

export const _EditorPopoverContent = (props: PopoverProps) => {
  const [modalRef, setModalRef] = useState<HTMLElement | null>(null)
  const ref = useRef<HTMLElement | null>(null)
  const editor = useEditor()

  useEffect(() => {
    if (props.lockBodyScroll) {
      editor?.lockOrUnlockScroll(true)
      return () => {
        editor?.lockOrUnlockScroll(false)
      }
    }
  }, [editor, props.lockBodyScroll])

  useEffect(() => {
    ref.current = modalRef
  }, [modalRef])

  useOnClickOutside(
    ref,
    useCallback(() => {
      props.setOpen(false)
    }, [props])
  )

  const pop = usePopper(props.referenceElement, modalRef, {
    placement: props.placement,
    modifiers: props.modifiers || [
      {
        name: 'offset',
        enabled: true,
        options: {
          offset: [0, 10]
        }
      },
      {
        name: 'preventOverflow',
        enabled: true,
        options: { boundary: document.getElementsByTagName('main')[0], padding: 10 }
      }
    ]
  })

  return createPortal(
    <div
      onClick={(e) => {
        e.stopPropagation()
        props.setOpen(false)
      }}
      key="modal"
      aria-labelledby="modal-label"
      className={cx(
        css`
          z-index: 1040;
          outline: none;
          position: fixed;
          pointer-events: none;
          top: 0;
          bottom: 0;
          left: 0;
          right: 0;
          height: 100%;
          width: 100%;
          user-select: none;
        `,
        props.disableClickThrough &&
          css`
            pointer-events: auto;
          `
      )}
    >
      <div
        ref={setModalRef}
        {...pop.attributes.popper}
        style={pop.styles.popper as React.CSSProperties}
        onClick={(e) => {
          e.stopPropagation()
        }}
      >
        <motion.div
          initial={'inactive'}
          animate={'active'}
          exit={'inactive'}
          variants={PopoverMotionVariants.scale}
          transition={{ duration: 0.15 }}
          className={css`
            pointer-events: auto;
          `}
        >
          {props.children}
        </motion.div>
      </div>
    </div>,
    document.body
  )
}
