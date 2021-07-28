import { IconCommonQuestion } from '@app/assets/icons'
import { useBlockSuspense } from '@app/hooks/api'
import { useStoryBlocksMap } from '@app/hooks/useStoryBlock'
import { ThemingVariables } from '@app/styles'
import { Editor } from '@app/types'
import { css } from '@emotion/css'
import React, { useMemo } from 'react'
import PerfectScrollbar from 'react-perfect-scrollbar'
import { useHistory, useRouteMatch } from 'react-router-dom'
import { useGetBlockTitleTextSnapshot } from './editor'

export const SideBarMetricsSection = () => {
  const matchStory = useRouteMatch<{ id: string }>('/story/:id')

  return (
    <div
      className={css`
        height: 100%;
        overflow: hidden;
        border-right: 1px solid #dedede;
      `}
    >
      {matchStory?.params.id && <CurrentStoryQuestions storyId={matchStory?.params.id} />}
    </div>
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
    <PerfectScrollbar
      className={css`
        flex: 1;
        overflow-y: auto;
        padding: 10px 16px 50px;
      `}
      options={{ suppressScrollX: true }}
    >
      <div>
        {questionBlocks.map((block) => {
          return <QuestionItem key={block.id} blockId={block.id} />
        })}
      </div>
    </PerfectScrollbar>
  )
}
