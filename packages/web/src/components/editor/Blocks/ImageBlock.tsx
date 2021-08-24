import { useBlockTranscations } from '@app/hooks/useBlockTranscation'
import { useWorkspace } from '@app/hooks/useWorkspace'
import { Editor } from '@app/types'
import { fileLoader } from '@app/utils'
import { css } from '@emotion/css'
import styled from '@emotion/styled'
import { motion } from 'framer-motion'
import React, { useEffect, useRef } from 'react'
import { BlockResizer } from '../BlockBase/BlockResizer'
import { UploadFilePlaceHolder } from '../BlockBase/UploadFilePlaceHolder'
import { useBlockBehavior } from '../hooks/useBlockBehavior'
import type { BlockFormatInterface } from '../hooks/useBlockFormat'
import { BlockComponent, registerBlock } from './utils'

const Image = styled.img`
  width: 100%;
  height: 100%;
  object-fit: fill;
  position: absolute;
  left: 0;
  top: 0;
`

const ImageBlock: BlockComponent<
  React.FC<{
    block: Editor.ImageBlock
    blockFormat: BlockFormatInterface
    parentType: Editor.BlockType
  }>
> = ({ block, blockFormat, parentType }) => {
  const contentRef = useRef<HTMLDivElement | null>(null)
  const { readonly } = useBlockBehavior()
  const workspace = useWorkspace()
  const blockTranscation = useBlockTranscations()

  useEffect(() => {
    if (!block.content) {
      blockTranscation.updateBlockProps(block.storyId!, block.id, ['content'], { fileKey: '' })
    }
    // TODO: COMPACT CODE, remove later
    if (!block.format?.aspectRatio && block.content?.imageInfo) {
      blockTranscation.updateBlockProps(block.storyId!, block.id, ['format'], {
        width: 1,
        aspectRatio: block.content!.imageInfo!.width / block.content!.imageInfo!.height
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      className={css`
        display: flex;
        justify-content: center;
      `}
    >
      {block.content?.fileKey && block.content.imageInfo && (
        <motion.div
          style={{
            paddingTop: `${100 / (block.format?.aspectRatio ?? 1)}%`
          }}
          transition={{ duration: 0 }}
          className={css`
            position: relative;
            display: inline-block;
            width: 100%;
            min-width: 100px;
          `}
          ref={contentRef}
        >
          {block.content?.fileKey && block.content.imageInfo && (
            <Image src={fileLoader({ src: block.content.fileKey, workspaceId: workspace.id })}></Image>
          )}
          {readonly === false && (
            <BlockResizer
              blockFormat={blockFormat}
              contentRef={contentRef}
              parentType={parentType}
              blockId={block.id}
              disableY
              keepAspectRatio
            />
          )}
        </motion.div>
      )}
      {!block.content?.fileKey && <UploadFilePlaceHolder blockId={block.id} text="Upload Image" accept="image/*" />}
    </div>
  )
}

ImageBlock.meta = {
  isText: false,
  hasChildren: false,
  isResizeable: true
}

registerBlock(Editor.BlockType.Image, ImageBlock)
