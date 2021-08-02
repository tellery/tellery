import { useBlockSuspense } from '@app/hooks/api'
import { ThemingVariables } from '@app/styles'
import { Editor } from '@app/types'
import { css, cx } from '@emotion/css'
import { AnimateSharedLayout, motion } from 'framer-motion'
import React, { memo, useEffect, useMemo, useRef } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { BlockOperations } from './BlockOperations'
import { OperatorsAvatar } from './BlockOperators'
import { BlockInner } from './Blocks'
import { TitleBlock } from './Blocks/TitleBlock'
import { isResizebleBlockType } from './Blocks/utils'
import { DroppingAreaIndicator } from './DroppingAreaIndicator'
import { DroppleableOverlay } from './DroppleableOverlay'
import { useBlockAdmin } from './hooks/useBlockAdminProvider'
import { BlockBehaviorConext, useBlockBehavior } from './hooks/useBlockBehavior'
import { useBlockFormat } from './hooks/useBlockFormat'
import { useBlockSelected } from './hooks/useBlockSelected'

function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div
      role="alert"
      className={css`
        background: ${ThemingVariables.colors.negative[1]};
        padding: 20px;
        border-radius: 10px;
      `}
    >
      <p>Failed to display this block:</p>
      <pre
        className={css`
          overflow: scroll;
        `}
      >
        {error.message}
      </pre>
      {/* <button onClick={resetErrorBoundary}>Try again</button> */}
    </div>
  )
}

// const BlockInner = _BlockInner

export const ContentBlocks: React.FC<{
  blockIds: string[]
  small?: boolean
  parentType: Editor.BlockType
  readonly?: boolean
  draggable?: boolean
  highlightedBlockId?: string
}> = (props) => {
  const { small = false, readonly = false, draggable = true, highlightedBlockId } = props

  const behavior = useMemo(() => {
    return {
      small,
      readonly,
      draggable,
      highlightedBlockId
    }
  }, [small, readonly, draggable, highlightedBlockId])

  return (
    <AnimateSharedLayout>
      <BlockBehaviorConext.Provider value={behavior}>
        {props.blockIds.map((blockId) => (
          <React.Suspense key={blockId} fallback={<div>loading...</div>}>
            <ContentBlockPure key={blockId} id={blockId} parentType={props.parentType} />
          </React.Suspense>
        ))}
      </BlockBehaviorConext.Provider>
    </AnimateSharedLayout>
  )
}

export const StandaloneContentBlock: React.FC<{
  block: Editor.BaseBlock
  small?: boolean
  parentType: Editor.BlockType
  readonly?: boolean
  draggable?: boolean
  highlightedBlockId?: string
}> = (props) => {
  const { small = false, readonly = false, draggable = true, highlightedBlockId } = props

  const behavior = useMemo(() => {
    return {
      small,
      readonly,
      draggable,
      highlightedBlockId
    }
  }, [small, readonly, draggable, highlightedBlockId])

  return (
    <BlockBehaviorConext.Provider value={behavior}>
      <ContentBlockInner block={props.block} parentType={props.parentType} />
    </BlockBehaviorConext.Provider>
  )
}

export const _ContentBlockPure: React.FC<{
  id: string
  parentType: Editor.BlockType
}> = (props) => {
  const block = useBlockSuspense(props.id)
  return <ContentBlockInner block={block} parentType={props.parentType} />
}

export const ContentBlockPure = memo(_ContentBlockPure)

// _BlockInner.whyDidYouRender = {
//   logOnDifferentValues: true,
//   customName: 'BlockInner'
// }

export const ContentBlockInner: React.FC<{
  block: Editor.Block
  parentType: Editor.BlockType
}> = ({ block, parentType = Editor.BlockType.Story }) => {
  const blockFormat = useBlockFormat(block)
  const blockRef = useRef(null)
  const { small, readonly, highlightedBlockId } = useBlockBehavior()
  const ref = useRef<HTMLDivElement | null>(null)
  const blockAdmin = useBlockAdmin()

  useEffect(() => {
    if (ref.current) {
      blockAdmin?.registerBlockInstance(block.id, {
        blockRef: blockRef,
        wrapperElement: ref.current
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [block.type])

  if (block.type === Editor.BlockType.Row) {
    return <BlockInner block={block} />
  }

  if (block.type === Editor.BlockType.Story) {
    return <TitleBlock block={block} />
  }

  return (
    <>
      <motion.div
        ref={ref}
        data-block-id={block.id}
        style={{
          ...(isResizebleBlockType(block.type) &&
            parentType !== Editor.BlockType.Column && { maxWidth: 'var(--max-width, 100%)' }),
          ...(isResizebleBlockType(block.type) && parentType !== Editor.BlockType.Column && !small
            ? { width: blockFormat.width }
            : { width: '100%' })
        }}
        className={cx(
          ...getBlockClassNames(
            block.type,
            parentType === Editor.BlockType.Story ||
              parentType === Editor.BlockType.Thought ||
              parentType === Editor.BlockType.Column
          ),
          css`
            border: var(--border, solid 1px transparent);
            min-width: 200px;
          `,
          small
            ? css`
                font-size: 12px;
              `
            : undefined
        )}
      >
        {!small && !readonly && (
          <>
            <BlockOperations dragRef={ref} storyId={block.storyId!} blockId={block.id} />
            <DroppleableOverlay blockId={block.id} storyId={block.storyId!} />
            <DroppingAreaIndicator blockId={block.id} />
          </>
        )}
        <BlockSelectedOverlay blockId={block.id} selected={highlightedBlockId === block.id} />
        <ErrorBoundary
          FallbackComponent={ErrorFallback}
          onReset={() => {
            // reset the state of your app so the error doesn't happen again
          }}
        >
          <BlockInner ref={blockRef} block={block} blockFormat={blockFormat} parentType={parentType}>
            {block.children && block.children.length > 0 && (
              <BlockChildren
                parentType={block.type}
                className={
                  small
                    ? undefined
                    : css`
                        margin-left: 2em;
                      `
                }
                childrenIds={block.children}
              />
            )}
          </BlockInner>
        </ErrorBoundary>
        {!small && <OperatorsAvatar blockId={block.id} />}
      </motion.div>
    </>
  )
}

export const BLOCK_WRAPPER_CLASS = new Map([
  [
    Editor.BlockType.Header,
    css`
      margin-top: 1.5em;
    `
  ],
  [
    Editor.BlockType.SubHeader,
    css`
      margin-top: 1em;
    `
  ],
  [
    Editor.BlockType.SubSubHeader,
    css`
      margin-top: 1em;
    `
  ]
])

const getBlockClassNames = (blockType: Editor.BlockType, isSelecteable: boolean) => {
  return [
    css`
      cursor: text;
      margin: 2.5px 0px;
      box-sizing: border-box;
      position: relative;
      width: 100%;
      white-space: pre-wrap;
      word-break: break-word;
      caret-color: ${ThemingVariables.colors.text[0]};
      text-align: left;
      color: ${ThemingVariables.colors.text[0]};
      --line-height: 1.5;
      --line-height-em: 1.5em;
      --text-color: ${ThemingVariables.colors.text[0]};
    `,
    isSelecteable && 'block-selectble',
    'tellery-block',
    'no-select',
    `tellery-${blockType}-block`,
    BLOCK_WRAPPER_CLASS.has(blockType) && BLOCK_WRAPPER_CLASS.get(blockType)
  ]
}

export const BlockSelectedOverlay: React.FC<{ blockId: string; selected?: boolean }> = ({
  blockId,
  selected = false
}) => {
  const blockSelected = useBlockSelected(blockId)
  return (
    <div
      style={{
        opacity: blockSelected || selected ? 1 : 0
      }}
      className={css`
        height: 100%;
        width: 100%;
        left: 0;
        top: 0;
        position: absolute;
        z-index: 1;
        background: rgba(46, 115, 252, 0.2);
        transition: opacity 250ms;
        pointer-events: none;
      `}
    ></div>
  )
}

export const BlockChildren: React.FC<{
  className?: string
  childrenIds: string[]
  parentType: Editor.BlockType
}> = ({ className, childrenIds, parentType }) => {
  const ref = useRef<HTMLDivElement | null>(null)
  return (
    <div
      className={cx(
        className,
        css`
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        `
      )}
      ref={ref}
    >
      {childrenIds.map((id) => (
        <ContentBlockPure key={id} id={id} parentType={parentType} />
      ))}
    </div>
  )
}
