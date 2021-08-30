import { useOnScreen } from '@app/hooks'
import { ThemingVariables } from '@app/styles'
import type { Ref } from '@app/types'
import { css, cx } from '@emotion/css'
import { useQuestionDownstreams } from '@app/hooks/api'
import { groupBy, map } from 'lodash'
import React, { useEffect, useRef, useMemo } from 'react'
import { StoryRefs } from './StoryBackwardsRefs'

export default function QuestionDownstreams(props: { blockId: string; className?: string; storyId: string }) {
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
      <h3
        className={css`
          margin: 0;
          padding: 10px 20px;
          color: ${ThemingVariables.colors.text[0]};
        `}
      >
        Downstream{items.length > 1 ? 's' : ''} ({items.length})
      </h3>
      {map(data, (blocks, storyId) => (
        <StoryRefs
          key={storyId}
          currentStoryId={props.storyId}
          storyId={storyId}
          refs={blocks.filter(({ storyId }) => !!storyId).map(({ id, storyId }) => ({ blockId: id, storyId })) as Ref[]}
          isSQLEditor={true}
        />
      ))}
    </div>
  )
}
