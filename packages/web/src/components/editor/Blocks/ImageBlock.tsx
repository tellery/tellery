import { css } from '@emotion/css'
import styled from '@emotion/styled'
import { motion } from 'framer-motion'
import React, { useEffect, useRef } from 'react'
import type { Editor } from 'types'
import { fileLoader } from 'utils'
import { BlockResizer } from '../BlockBase/BlockResizer'
import { useEditor } from '../hooks'
import { useBlockBehavior } from '../hooks/useBlockBehavior'
import type { BlockFormatInterface } from '../hooks/useBlockFormat'
import { UploadFilePlaceHolder } from '../BlockBase/UploadFilePlaceHolder'
import { useWorkspace } from '@app/context/workspace'

const Image = styled.img`
  width: 100%;
  height: 100%;
  object-fit: fill;
  position: absolute;
  left: 0;
  top: 0;
`

export const ImageBlock: React.FC<{
  block: Editor.ImageBlock
  blockFormat: BlockFormatInterface
  parentType: Editor.BlockType
}> = ({ block, blockFormat, parentType }) => {
  const editor = useEditor<Editor.ImageBlock>()
  const contentRef = useRef<HTMLDivElement | null>(null)
  const { readonly } = useBlockBehavior()
  const workspace = useWorkspace()

  useEffect(() => {
    if (!block.content) {
      editor?.setBlockValue?.(block.id, (block) => {
        block.content = {
          fileKey: ''
        }
      })
    }
    // TODO: COMPACT CODE, remove later
    if (!block.format?.aspectRatio && block.content.imageInfo) {
      editor?.setBlockValue?.(block.id, (block) => {
        block.format = {
          width: 1,
          aspectRatio: block.content.imageInfo!.width / block.content.imageInfo!.height
        }
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
            min-height: 100px;
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
