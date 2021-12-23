import { FormButton } from '@app/components/kit/FormButton'
import { useBlockTranscations } from '@app/hooks/useBlockTranscation'
import { ThemingVariables } from '@app/styles'
import { Editor } from '@app/types'
import { css } from '@emotion/css'
import React, { memo, useCallback, useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { BlockPlaceHolder } from '../BlockBase/BlockPlaceHolder'
import { EditorPopover } from '../EditorPopover'
import { useEditor } from '../hooks'
import { useBlockBehavior } from '../hooks/useBlockBehavior'
import { renderEquation } from './katex'
import { BlockComponent } from './utils'

interface EquationBlockInterface extends Editor.BaseBlock {
  content: {
    equation?: string
  } & Editor.BaseBlock['content']
}

const _EquationBlock: BlockComponent<
  React.FC<{
    block: EquationBlockInterface
    parentType: Editor.BlockType
  }>
> = ({ block, parentType }) => {
  const editor = useEditor<EquationBlockInterface>()
  const ref = useRef<HTMLDivElement | null>(null)
  const { readonly } = useBlockBehavior()
  const [showPopover, setShowPopover] = useState(false)
  const [equationHtml, setEquationHtml] = useState<string | null>(null)
  const blockTranscation = useBlockTranscations()

  const updateValue = useCallback(
    ({ value }: { value: string }) => {
      blockTranscation.updateBlockProps(block.storyId!, block.id, ['content', 'equation'], value)
    },
    [block.id, block.storyId, blockTranscation]
  )

  useEffect(() => {
    const render = async () => {
      const equation = block.content?.equation
      if (!equation || typeof equation !== 'string') {
        setEquationHtml(null)
        return
      }
      const html = await renderEquation(equation)
      setEquationHtml(html)
    }
    render()
  }, [block.content?.equation])

  return (
    <>
      <div
        className={css`
          display: flex;
          justify-content: center;
          cursor: pointer;
        `}
        onClick={() => {
          if (!readonly) {
            editor?.selectBlocks([block.id])
            setShowPopover(true)
          }
        }}
        ref={ref}
      >
        {block.content?.equation && (
          <div
            className={css`
              :hover {
                background-color: ${ThemingVariables.colors.primary[4]};
              }
              flex: 1;
              padding: 20px;
              text-align: center;
            `}
            dangerouslySetInnerHTML={{ __html: equationHtml ?? block.content?.equation }}
          ></div>
        )}
        {!block.content?.equation && (
          <BlockPlaceHolder
            onClick={() => {
              if (!readonly) {
                setShowPopover(true)
              }
            }}
            text="Click to input an equation"
            loading={false}
          />
        )}
      </div>
      <EmbedBlockPopover
        open={showPopover}
        setOpen={setShowPopover}
        referenceElement={ref.current}
        onSubmit={updateValue}
        initialValue={block.content?.equation}
      />
    </>
  )
}

const _EmbedBlockPopover: React.FC<{
  open: boolean
  setOpen: (value: boolean) => void
  referenceElement: HTMLElement | null
  onSubmit: (value: any) => void
  initialValue?: string
}> = ({ open, setOpen, referenceElement, onSubmit, initialValue }) => {
  const {
    register,
    handleSubmit,
    setFocus,
    watch,
    formState: { errors }
  } = useForm({ defaultValues: { value: initialValue } })

  const value = watch('value')

  useEffect(() => {
    if (initialValue !== value) {
      onSubmit({ value })
    }
  }, [initialValue, onSubmit, value])

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        setFocus('value')
      }, 0)
    }
  }, [open, setFocus])

  return (
    <EditorPopover
      open={open}
      setOpen={setOpen}
      placement="bottom"
      referenceElement={referenceElement}
      disableClickThrough
      lockBodyScroll
    >
      <div
        className={css`
          outline: none;
          box-shadow: ${ThemingVariables.boxShadows[0]};
          border-radius: 8px;
          background-color: ${ThemingVariables.colors.primary[5]};
          display: flex;
          flex-direction: column;
          align-items: stretch;
          max-height: 300px;
          width: 400px;
          overflow-x: hidden;
          overflow-y: auto;
          user-select: none;
          font-weight: normal;
          & * + * {
            margin-top: 2px;
          }
        `}
      >
        <form
          onSubmit={handleSubmit(onSubmit)}
          className={css`
            display: flex;
            flex-direction: column;
          `}
        >
          <textarea
            onKeyDown={(e) => {
              e.stopPropagation()
            }}
            {...register('value', { required: true })}
            className={css`
              outline: none;
              width: 100%;
              resize: none;
              border: none;
              padding: 20px 20px;
              font-size: 14px;
              background-color: ${ThemingVariables.colors.primary[5]};
              color: ${ThemingVariables.colors.text[0]};
            `}
            onPaste={(e) => e.stopPropagation()}
            placeholder="c = \\pm\\sqrt{a^2 + b^2}"
          />
          <FormButton
            variant="primary"
            className={css`
              margin-left: auto;
              display: inline-flex;
              align-items: center;
              margin-right: 10px;
              margin-bottom: 10px;
            `}
            onClick={(e) => {
              setOpen(false)
            }}
          >
            confirm
          </FormButton>
        </form>
      </div>
    </EditorPopover>
  )
}

const EmbedBlockPopover = memo(_EmbedBlockPopover)

_EquationBlock.meta = {
  isText: false,
  hasChildren: false,
  isResizeable: false
}

export const EquationBlock = _EquationBlock
