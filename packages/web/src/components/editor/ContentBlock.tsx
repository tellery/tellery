import { css, cx } from '@emotion/css'
import { TelleryBlockSelectedAtom } from 'components/editor/store/selection'
import { motion } from 'framer-motion'
import { useBlockSuspense } from 'hooks/api'
import React, { memo, ReactNode, useMemo, useRef } from 'react'
import { useRecoilValue } from 'recoil'
import { ThemingVariables } from 'styles'
import { Editor } from 'types'
import { BlockOperations } from './BlockOperations'
import { OperatorsAvatar } from './BlockOperators'
import { BulletListBlock } from './Blocks/BulletListBlock'
import { CodeBlock } from './Blocks/CodeBlock'
import { DeletedBlock } from './Blocks/DeletedBlock'
import { DividerBlock } from './Blocks/DividerBlock'
import { FileBlock } from './Blocks/FileBlock'
import { GridBlock } from './Blocks/GridBlock'
import { ImageBlock } from './Blocks/ImageBlock'
import { EmbedBlock } from './Blocks/EmbedBlock'
import { NoPermissionBlock } from './Blocks/NoPermisionBlock'
import { NumberedListBlock } from './Blocks/NumberedListBlock'
import { QuestionBlock } from './Blocks/QuestionBlock'
import { QuoteBlock } from './Blocks/QuoteBlock'
import { TextBlock } from './Blocks/TextBlock'
import { TitleBlock } from './Blocks/TitleBlock'
import { TodoBlock } from './Blocks/TodoBlock'
import { ToggleListBlock } from './Blocks/ToggleListBlock'
import { DroppingAreaIndicator } from './DroppingAreaIndicator'
import { DroppleableOverlay } from './DroppleableOverlay'
import { BlockFormatInterface, useBlockFormat } from './hooks/useBlockFormat'
import { ErrorBoundary } from 'react-error-boundary'
import { BlockBehaviorConext, useBlockBehavior } from './hooks/useBlockBehavior'

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

const _BlockInner: React.FC<{
  block: Editor.Block
  children: ReactNode
  blockFormat: BlockFormatInterface
  parentType: Editor.BlockType
}> = ({ block, children, blockFormat, parentType }) => {
  if (block.alive === false) {
    return <DeletedBlock block={block}></DeletedBlock>
  }
  if (block.permissions.length === 0) {
    return <NoPermissionBlock block={block} />
  }
  switch (block.type) {
    case Editor.BlockType.Text:
      return <TextBlock block={block}>{children}</TextBlock>
    case Editor.BlockType.Todo:
      return <TodoBlock block={block}>{children}</TodoBlock>
    case Editor.BlockType.Toggle:
      return <ToggleListBlock block={block}>{children}</ToggleListBlock>
    case Editor.BlockType.Code:
      return <CodeBlock block={block}>{children}</CodeBlock>
    case Editor.BlockType.Quote:
      return <QuoteBlock block={block}>{children}</QuoteBlock>
    case Editor.BlockType.Divider:
      return <DividerBlock block={block}>{children}</DividerBlock>
    case Editor.BlockType.Image:
      return (
        <ImageBlock block={block as Editor.ImageBlock} blockFormat={blockFormat} parentType={parentType}>
          {children}
        </ImageBlock>
      )
    case Editor.BlockType.File:
      return <FileBlock block={block as Editor.ImageBlock}>{children}</FileBlock>
    case Editor.BlockType.Embed:
      return <EmbedBlock block={block as Editor.ImageBlock}>{children}</EmbedBlock>
    case Editor.BlockType.BulletList:
      return <BulletListBlock block={block}>{children}</BulletListBlock>
    case Editor.BlockType.NumberedList:
      return <NumberedListBlock block={block}>{children}</NumberedListBlock>
    case Editor.BlockType.Story:
      return <TitleBlock block={block}></TitleBlock>
    case Editor.BlockType.Question:
      return (
        <QuestionBlock block={block} blockFormat={blockFormat} parentType={parentType}>
          {children}
        </QuestionBlock>
      )
    default:
      return <TextBlock block={block}>{children}</TextBlock>
  }
}

const BlockInner = memo(_BlockInner, (prev, next) => {
  return (
    prev.block.version === next.block.version &&
    prev.blockFormat === next.blockFormat &&
    prev.parentType === next.parentType
  )
})

// const BlockInner = _BlockInner

export const ContentBlocks: React.FC<{
  blockIds: string[]
  small?: boolean
  parentType: Editor.BlockType
  readonly?: boolean
  draggable?: boolean
  highlightedBlock?: string
}> = (props) => {
  const { small = false, readonly = false, draggable = true, highlightedBlock = undefined } = props

  const behavior = useMemo(() => {
    return {
      small,
      readonly,
      highlightedBlock,
      draggable
    }
  }, [small, readonly, draggable, highlightedBlock])

  return (
    <BlockBehaviorConext.Provider value={behavior}>
      {props.blockIds.map((blockId) => (
        <React.Suspense key={blockId} fallback={<div>loading...</div>}>
          <ContentBlockPure key={blockId} id={blockId} parentType={props.parentType} />
        </React.Suspense>
      ))}
    </BlockBehaviorConext.Provider>
  )
}

export const ContentBlockPure: React.FC<{
  id: string
  parentType: Editor.BlockType
}> = (props) => {
  const block = useBlockSuspense(props.id)
  return <ContentBlockInner block={block} parentType={props.parentType} />
}

const isResizebleBlockType = (blockType: Editor.BlockType) => {
  return blockType === Editor.BlockType.Question || blockType === Editor.BlockType.Image
}

// _BlockInner.whyDidYouRender = {
//   logOnDifferentValues: true,
//   customName: 'BlockInner'
// }

export const ContentBlockInner: React.FC<{
  block: Editor.Block
  parentType: Editor.BlockType
}> = ({ block, parentType = Editor.BlockType.Story }) => {
  const blockFormat = useBlockFormat(block)
  const { small, readonly, highlightedBlock } = useBlockBehavior()
  const isHighlighted = highlightedBlock === block.id
  const ref = useRef<HTMLDivElement | null>(null)

  if (block.type === Editor.BlockType.Row) {
    return <GridBlock block={block} />
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
          ...(isResizebleBlockType(block.type) && parentType !== Editor.BlockType.Column
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
        <BlockSelectedOverlay blockId={block.id} selected={isHighlighted} />
        <ErrorBoundary
          FallbackComponent={ErrorFallback}
          onReset={() => {
            // reset the state of your app so the error doesn't happen again
          }}
        >
          <BlockInner block={block} blockFormat={blockFormat} parentType={parentType}>
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
      align-self: center;
      color: ${ThemingVariables.colors.text[0]};
      --line-height: 1.5;
      --line-height-em: 1.5em;
      --text-color: ${ThemingVariables.colors.text[0]};
    `,
    isSelecteable && 'block-selectble',
    'tellery-block',
    'no-select',
    `tellery-${blockType}-block`
  ]
}

export const BlockSelectedOverlay: React.FC<{ blockId: string; selected?: boolean }> = ({
  blockId,
  selected = false
}) => {
  const blockSelected = useRecoilValue(TelleryBlockSelectedAtom(blockId))
  return blockSelected || selected ? (
    <div
      className={css`
        height: 100%;
        width: 100%;
        left: 0;
        top: 0;
        position: absolute;
        z-index: 999;
        background: rgba(46, 115, 252, 0.2);
        pointer-events: none;
      `}
    ></div>
  ) : null
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
