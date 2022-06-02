import { IconCommonCheck, IconCommonMenu } from '@app/assets/icons'
import { StyledDropDownItem, StyledDropdownMenuContent } from '@app/components/kit/DropDownMenu'
import { css, cx } from '@emotion/css'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import React, { useRef, useState } from 'react'
import IconButton from './kit/IconButton'

export const ListBox: ReactFCWithChildren<{
  options: { name: string; value: string }[]
  onChange: (value: string) => void
  value: { name: string; value: string } | null
  className?: string
}> = ({ className, onChange, value, options }) => {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  return (
    <DropdownMenu.Root
      open={open}
      onOpenChange={(open) => {
        setOpen(open)
      }}
    >
      <DropdownMenu.Trigger
        className={cx(
          css`
            outline: none;
            text-align: left;
            overflow: hidden;
            flex-shrink: 0;
            text-overflow: ellipsis;
            white-space: nowrap;
            background: transparent;
            border: none;
            box-sizing: border-box;
            border-radius: 8px;
            display: flex;
            justify-content: center;
            align-items: center;
            cursor: pointer;
            font-size: 14px;
          `,
          className
        )}
      >
        <IconButton
          icon={IconCommonMenu}
          className={css`
            margin-right: 6px;
          `}
        />
      </DropdownMenu.Trigger>
      <StyledDropdownMenuContent
        open={open}
        className={css`
          padding: 0;
        `}
        width={180}
      >
        <div
          className={css`
            overflow-y: auto;
            max-height: 300px;
            padding: 10px 10px;
          `}
          ref={ref}
        >
          {options?.map((option) => {
            return (
              <StyledDropDownItem
                key={option.value}
                title={option.name}
                icon={value.value === option.value ? <IconCommonCheck /> : null}
                onClick={async () => {
                  onChange(option)
                }}
              />
            )
          })}
        </div>
      </StyledDropdownMenuContent>
    </DropdownMenu.Root>
  )
}
