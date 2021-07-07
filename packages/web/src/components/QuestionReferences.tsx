import { useOnScreen } from '@app/hooks'
import type { Ref } from '@app/types'
import { css, cx } from '@emotion/css'
import { useQuestionDownstreams } from 'hooks/api'
import { groupBy, map } from 'lodash'
import React, { useEffect, useRef, useMemo } from 'react'
import { StoryRefs } from './StoryBackwardsRefs'

export default function QuestionReferences(props: { blockId: string; className?: string }) {
  const ref = useRef(null)
  const isOnScreen = useOnScreen(ref)
  const { data: items, refetch } = useQuestionDownstreams(props.blockId)
  useEffect(() => {
    if (isOnScreen) {
      refetch()
    }
  }, [isOnScreen, refetch])
  const data = useMemo(() => groupBy(items, 'storyId'), [items])

  return (
    <div
      className={cx(
        css`
          padding: 5px;
          overflow-y: scroll;
        `,
        props.className
      )}
    >
      {map(data, (blocks, storyId) => (
        <StoryRefs
          key={storyId}
          storyId={storyId}
          refs={blocks.filter(({ storyId }) => !!storyId).map(({ id, storyId }) => ({ blockId: id, storyId })) as Ref[]}
        />
      ))}
    </div>
  )
}
