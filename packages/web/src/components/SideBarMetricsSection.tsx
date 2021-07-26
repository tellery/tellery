import { IconCommonQuestion } from '@app/assets/icons'
import { useBlockSuspense } from '@app/hooks/api'
import { useStoryBlocksMap } from '@app/hooks/useStoryBlock'
import { ThemingVariables } from '@app/styles'
import { Editor } from '@app/types'
import { css } from '@emotion/css'
import React, { useMemo } from 'react'
import { useHistory, useRouteMatch } from 'react-router-dom'
import { useGetBlockTitleTextSnapshot } from './editor'
import { SideBarContentLayout } from './SideBarContentLayout'

export const SideBarMetricsSection = () => {
  const matchStory = useRouteMatch<{ id: string }>('/story/:id')

  return (
    <SideBarContentLayout title={'Metrics'}>
      {matchStory?.params.id && <CurrentStoryQuestions storyId={matchStory?.params.id} />}
    </SideBarContentLayout>
  )
}

const QuestionItem: React.FC<{ blockId: string }> = ({ blockId }) => {
  const block = useBlockSuspense(blockId)
  const getBlockTitle = useGetBlockTitleTextSnapshot()
  const history = useHistory()

  return (
    <div
      className={css`
        display: flex;
        margin: 5px 0;
        align-items: center;
        cursor: pointer;
      `}
      onClick={() => {
        history.push(`#${block.id}`)
      }}
    >
      <IconCommonQuestion
        color={ThemingVariables.colors.gray[0]}
        className={css`
          flex-shrink: 0;
          margin-right: 8px;
        `}
      />
      <span
        className={css`
          font-size: 12px;
          line-height: 14px;
          color: ${ThemingVariables.colors.text[0]};
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        `}
      >
        {getBlockTitle(block)}
      </span>
    </div>
  )
}

const CurrentStoryQuestions: React.FC<{ storyId: string }> = ({ storyId }) => {
  const storyBlocksMap = useStoryBlocksMap(storyId)

  const questionBlocks = useMemo(() => {
    if (!storyBlocksMap) return []
    return Object.values(storyBlocksMap).filter((block) => block.type === Editor.BlockType.Question)
  }, [storyBlocksMap])
  return (
    <div
      className={css`
        padding: 0px 16px;
      `}
    >
      {questionBlocks.map((block) => {
        return <QuestionItem key={block.id} blockId={block.id} />
      })}
    </div>
  )
}
