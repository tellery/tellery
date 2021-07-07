import { css } from '@emotion/css'
import React, { useRef } from 'react'
import { BlockPlaceHolder } from './BlockPlaceHolder'
import { useSetUploadResource, useUploadResource } from '../hooks/useUploadResource'

export const UploadFilePlaceHolder: React.FC<{ blockId: string; text: string; accept: string }> = ({
  blockId,
  text,
  accept
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const uploading = useUploadResource(blockId)
  const setUploadResource = useSetUploadResource()

  return (
    <>
      <input
        type="file"
        className={css`
          display: none;
        `}
        accept={accept}
        ref={fileInputRef}
        onChange={(e) => {
          const files = e.target.files
          if (!files) return
          setUploadResource({ file: files[0], blockId: blockId })
        }}
      ></input>
      <BlockPlaceHolder
        text={text}
        loading={uploading}
        onClick={() => {
          console.log(fileInputRef.current)
          fileInputRef.current?.click()
        }}
      />
    </>
  )
}
