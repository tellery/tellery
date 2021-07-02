import { css } from '@emotion/css'
import React, { useEffect, useRef, useState } from 'react'
import type { Editor } from 'types'
import { fileLoader } from 'utils'
import { BlockPlaceHolder } from '../BlockBase/BlockPlaceHolder'
import { useEditor } from '../hooks'
import { BlockResizer } from '../BlockBase/BlockResizer'
import { useBlockBehavior } from '../ContentBlock'
import type { BlockFormatInterface } from '../hooks/useBlockFormat'
import { motion } from 'framer-motion'
import styled from '@emotion/styled'
import { uploadFilesAndUpdateBlocks } from '../DataFileType'
import { useWorkspace } from '@app/context/workspace'
import { useCommit } from '@app/hooks/useCommit'

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
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [uploading, setUploading] = useState(false)
  const contentRef = useRef<HTMLDivElement | null>(null)
  const { readonly } = useBlockBehavior()

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

  const commit = useCommit()
  const workspace = useWorkspace()

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
            <Image src={fileLoader({ src: block.content.fileKey })}></Image>
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
      <input
        type="file"
        className={css`
          display: none;
        `}
        accept="image/*"
        ref={fileInputRef}
        onChange={(e) => {
          const files = e.target.files
          if (!files) return
          setUploading(true)
          uploadFilesAndUpdateBlocks(files, [block], workspace).then((transcations) => {
            transcations.forEach((transcation) => {
              commit({ transcation, storyId: block.storyId! })
            })
            setUploading(false)
          })
        }}
      ></input>
      {!block.content?.fileKey && (
        <BlockPlaceHolder
          text="Upload Image"
          loading={uploading}
          onClick={() => {
            console.log(fileInputRef.current)
            fileInputRef.current?.click()
          }}
        />
      )}
    </div>
  )
}
