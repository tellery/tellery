import { css } from '@emotion/css'
import { BlockTitle } from 'components/editor'
import { motion } from 'framer-motion'
import { useOpenStory } from 'hooks'
import { useBlockSuspense, useMgetBlocksSuspense } from 'hooks/api'
import React, { useMemo, useState } from 'react'
import { usePopper } from 'react-popper'
import { Link } from 'react-router-dom'
import { ThemingVariables } from 'styles'
import type { Ref, Story } from 'types'
import { CircularLoading } from './CircularLoading'
import { BlockContentOverview } from './editor/BlockContentOverview'
import { SmallStory } from './SmallStory'
import { ToggleControl } from './ToggleControl'

export const StoryBackwardsRefs = (props: { refs: Ref[]; storyId: string }) => {
  const refByStory = useMemo(() => {
    return props.refs
      .filter((ref) => ref.storyId !== props.storyId)
      .reduce((a, c) => {
        a[c.storyId] = [...(a[c.storyId] ?? []), c]
        return a
      }, {} as Record<string, Ref[]>)
  }, [props.refs, props.storyId])

  const stories = useMemo(() => Object.keys(refByStory), [refByStory])

  return (
    <div
      className={css`
        padding-bottom: 72px;
        display: flex;
        flex-direction: column;
        align-items: center;
        margin: 0;
      `}
    >
      <div
        className={css`
          width: 100%;
        `}
      >
        <div
          className={css`
            font-weight: 500;
            font-size: 20px;
            line-height: 24px;
            color: ${ThemingVariables.colors.text[0]};
            width: 100%;
            margin-bottom: 10px;
            border-top: solid 1px ${ThemingVariables.colors.gray[1]};
            padding-top: 30px;
          `}
        >
          Back Link
        </div>
        {/* TODO: use skelton */}
        <React.Suspense fallback={<CircularLoading size={30} color={ThemingVariables.colors.primary[0]} />}>
          <div
            className={css`
              display: flex;
              margin: 0 -5px;
              background: #f5f7fb;
              border-radius: 8px;
              position: relative;
            `}
          >
            <div
              className={css`
                width: 100%;
                margin: 0 5px;
                flex: 1 0;
                overflow: hidden;
              `}
            >
              {stories.map((storyId) => (
                <StoryRefs key={storyId} storyId={storyId} refs={refByStory[storyId]} />
              ))}
            </div>
          </div>
        </React.Suspense>
      </div>
    </div>
  )
}

export const StoryRefs = (props: { refs: Ref[]; storyId: string }) => {
  const { refs, storyId } = props
  const [hoverBlockId, setHoverBlockId] = useState<string | null>(null)
  const [modalRef, setModalRef] = useState<HTMLElement | null>(null)
  const [referenceElement, setReferenceElement] = useState<HTMLElement | null>(null)

  const story = useBlockSuspense<Story>(storyId)
  const relatedBlocks = useMemo(() => [...new Set(refs.map((ref) => ref.blockId))], [refs])
  const blocks = useMgetBlocksSuspense(relatedBlocks)
  const [toggleControl, setToggleControl] = useState(true)

  const pop = usePopper(referenceElement, modalRef, {
    placement: 'right',
    strategy: 'absolute',
    modifiers: [
      {
        name: 'offset',
        enabled: true,
        options: {
          offset: [0, -310]
        }
      }
    ]
  })
  const openStory = useOpenStory()

  return (
    <div key={storyId} ref={setReferenceElement}>
      <div>
        <div
          className={css`
            cursor: pointer;
            padding: 10px;
            overflow: hidden;
          `}
        >
          <div
            className={css`
              font-weight: 500;
              font-size: 16px;
              line-height: 20px;
              color: ${ThemingVariables.colors.text[0]};
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              width: 100%;
            `}
          >
            <div
              className={css`
                display: flex;
                align-items: center;
              `}
            >
              <ToggleControl value={toggleControl} onChange={setToggleControl} />
              <Link
                to={`/story/${storyId}`}
                className={css`
                  text-decoration: none;
                  font-size: 14px;
                  line-height: 17px;
                  color: ${ThemingVariables.colors.text[0]};
                  text-align: center;
                  max-width: 100%;
                  overflow: hidden;
                  text-overflow: ellipsis;
                  white-space: nowrap;
                `}
              >
                <div
                  className={css`
                    text-decoration: none;
                  `}
                >
                  {story ? <BlockTitle block={story} /> : null}
                </div>
              </Link>
            </div>
            {toggleControl && story && (
              <>
                {blocks && (
                  <div
                    className={css`
                      font-size: 12px;
                      margin-top: 5px;
                      padding-left: 20px;
                    `}
                  >
                    {blocks.map((block) => {
                      return (
                        <motion.div
                          key={block.id}
                          onMouseEnter={() => {
                            setHoverBlockId(block.id)
                          }}
                          onMouseLeave={() => {
                            setHoverBlockId(null)
                          }}
                          onClickCapture={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            openStory(block.storyId!, {
                              blockId: block.id,
                              isAltKeyPressed: e.altKey,
                              pageType: story.type
                            })
                          }}
                        >
                          <BlockContentOverview block={block} />
                        </motion.div>
                      )
                    })}
                  </div>
                )}
              </>
            )}
          </div>
          {hoverBlockId ? (
            <div
              ref={setModalRef}
              {...pop.attributes.popper}
              style={{ ...(pop.styles.popper as React.CSSProperties), zIndex: 1000 }}
            >
              <SmallStory
                className={css`
                  height: 360px;
                  width: 280px;
                  box-shadow: ${ThemingVariables.boxShadows[0]};
                  border-radius: 8px;
                  padding: 8px;
                  z-index: 1000;
                `}
                color={ThemingVariables.colors.gray[5]}
                storyId={storyId}
                blockId={hoverBlockId || undefined}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
