import { useWorkspace } from '@app/context/workspace'
import { useCommit } from '@app/hooks/useCommit'
import { css } from '@emotion/css'
import React, { useEffect, useRef, useState } from 'react'
import type { Editor } from 'types'
import { BlockPlaceHolder } from '../BlockBase/BlockPlaceHolder'
import { uploadFilesAndUpdateBlocks } from '../DataFileType'
import { useEditor } from '../hooks'
import { useBlockBehavior } from '../hooks/useBlockBehavior'
import type { BlockFormatInterface } from '../hooks/useBlockFormat'

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
          text="Upload CSV/Excel"
          loading={uploading}
          onClick={() => {
            if (readonly) return
            fileInputRef.current?.click()
          }}
        />
      )}
    </div>
  )
}
