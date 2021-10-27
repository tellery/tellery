import { IconCommonArrowDropDown } from '@app/assets/icons'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { ThemingVariables } from '@app/styles'
import { css, cx } from '@emotion/css'
import React, { forwardRef, ReactNode } from 'react'
import { PopoverMotionVariants } from '@app/styles/animations'
import { AnimatePresence, motion } from 'framer-motion'

export const StyledDropdownMenuContent = React.forwardRef<
  HTMLDivElement,
  { open: boolean; className?: string } & React.ComponentProps<typeof DropdownMenu.Content>
>(({ children, open, className, ...props }, ref) => {
  return (
    <AnimatePresence>
      {open && (
        <DropdownMenu.Content asChild forceMount ref={ref} {...props}>
          <motion.div
            initial={'inactive'}
            animate={'active'}
            exit={'inactive'}
            transition={{ duration: 0.15 }}
            variants={PopoverMotionVariants.scale}
            className={cx(
              css`
                background: ${ThemingVariables.colors.gray[5]};
                box-shadow: ${ThemingVariables.boxShadows[0]};
                border-radius: 8px;
                padding: 8px;
                width: 260px;
                overflow: hidden;
                outline: none;
                display: flex;
                flex-direction: column;
              `,
              className
            )}
          >
            {children}
          </motion.div>
        </DropdownMenu.Content>
      )}
    </AnimatePresence>
  )
})

StyledDropdownMenuContent.displayName = 'StyledDropdownMenuContent'

type SyltedMenuItemProps = {
  icon?: ReactNode
  title: ReactNode
  side?: ReactNode
  isActive?: boolean
  size?: 'small' | 'medium' | 'large'
  onClick?: React.MouseEventHandler<HTMLDivElement>
} & React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>

const StyledMenuItem = forwardRef<HTMLDivElement, SyltedMenuItemProps>((props, ref) => {
  const { size = 'medium', title, side, isActive, onClick, icon, children, ...rest } = props
  return (
    <div
      {...rest}
      ref={ref}
      className={cx(
        size === 'small' &&
          css`
            height: 24px;
          `,
        size === 'medium' &&
          css`
            height: 36px;
          `,
        size === 'large' &&
          css`
            height: 44px;
          `,
        css`
          border-radius: 8px;
          padding: 0px 8px;
          outline: none;
          border: none;
          width: 100%;
          background: transparent;
          box-sizing: border-box;
          cursor: pointer;
          transition: all 0.1s ease;
          display: block;
          color: ${ThemingVariables.colors.text[0]};
          font-size: 12px;
          line-height: 14px;
          text-decoration: none;
          white-space: nowrap;
          text-overflow: ellipsis;
          overflow: hidden;
          display: flex;
          align-items: center;
          &:hover {
            background: ${ThemingVariables.colors.primary[4]};
          }
          &:active {
            background: ${ThemingVariables.colors.primary[3]};
          }
        `,
        props.isActive &&
          css`
            background: ${ThemingVariables.colors.primary[3]};
          `
      )}
      onClick={props.onClick}
    >
      {props?.icon}
      <span
        className={css`
          margin-left: 8px;
        `}
      >
        {props.title}
      </span>
      {props.side && (
        <div
          className={css`
            margin-left: auto;
          `}
        >
          {props.side}
        </div>
      )}
    </div>
  )
})

StyledMenuItem.displayName = 'StyledMenuItem'

export const StyledDropDownItem = forwardRef<HTMLDivElement, SyltedMenuItemProps>((props, ref) => {
  return (
    <DropdownMenu.Item asChild>
      <StyledMenuItem {...props} ref={ref} />
    </DropdownMenu.Item>
  )
})
StyledDropDownItem.displayName = 'StyledDropDownItem'

export const StyledDropDownTriggerItem = forwardRef<HTMLDivElement, SyltedMenuItemProps>((props, ref) => {
  return (
    <DropdownMenu.TriggerItem asChild>
      <StyledMenuItem
        {...props}
        ref={ref}
        side={
          <IconCommonArrowDropDown
            className={css`
              transform: rotate(-90deg);
            `}
          />
        }
      />
    </DropdownMenu.TriggerItem>
  )
})
StyledDropDownTriggerItem.displayName = 'StyledDropDownTriggerItem'
