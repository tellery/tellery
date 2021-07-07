import { css, cx } from '@emotion/css'
import { useFetchStoryChunk } from 'hooks/api'
import React, { useEffect, useRef } from 'react'
import { Editor } from 'types'
import { useWaitForBlockAndScrollTo } from '../hooks/useWaitForBlockAndScrollTo'
import { BlockTitle } from './editor'
import { BlockingUI } from './BlockingUI'
import { ContentBlocks } from './editor/ContentBlock'

export function SmallStory(props: { storyId: string; blockId?: string; className?: string; color: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) {
      return
    }
    if (!props.blockId) {
      ref.current.children.item(0)?.scrollTo({ top: 0 })
    }
  }, [props.storyId, props.blockId])

  useWaitForBlockAndScrollTo(props.blockId, ref)

  return (
    <div
      className={cx(
        css`
          position: relative;
          overflow: hidden;
        `,
        props.className
      )}
      ref={ref}
      style={{
        backgroundColor: props.color
      }}
    >
      <div
        className={css`
          height: 100%;
          overflow-y: auto;
          &::-webkit-scrollbar {
            display: none;
          }
        `}
      >
        <React.Suspense fallback={<BlockingUI blocking />}>
          <StoryContent storyId={props.storyId} blockId={props.blockId} />
        </React.Suspense>
      </div>
      {props.blockId ? (
        <div
          className={css`
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: 15%;
          `}
          style={{ background: `linear-gradient(180deg, ${props.color}, transparent)` }}
        />
      ) : null}
      <div
        className={css`
          position: absolute;
          left: 0;
          bottom: 0;
          width: 100%;
          height: 15%;
        `}
        style={{ background: `linear-gradient(0deg, ${props.color}, transparent)` }}
      />
    </div>
  )
}

const StoryContent: React.FC<{ storyId: string; blockId?: string }> = ({ storyId, blockId }) => {
  const story = useFetchStoryChunk(storyId)

  return (
    <>
      <div
        className={css`
          padding-top: 10px;
          font-weight: 600;
        `}
      >
        {story ? <BlockTitle block={story} /> : ''}
      </div>
      {story?.children && (
        <ContentBlocks
          blockIds={story?.children}
          readonly
          parentType={Editor.BlockType.Story}
          small
          highlightedBlock={blockId}
        />
      )}
    </>
  )
}
