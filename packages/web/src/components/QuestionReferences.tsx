import { useOnScreen } from '@app/hooks'
import { css, cx } from '@emotion/css'
import { useQuestionDownstreams } from 'hooks/api'
import React, { useEffect, useRef } from 'react'
import { ThemingVariables } from 'styles'
import { BlockTitle } from './editor'
import { useOpenQuestionBlockIdHandler } from './StoryQuestionsEditor'

export default function QuestionReferences(props: { blockId: string; className?: string }) {
  const ref = useRef(null)
  const isOnScreen = useOnScreen(ref)
  const { data: items, blocks, refetch } = useQuestionDownstreams(props.blockId)
  const handleOpen = useOpenQuestionBlockIdHandler()
  useEffect(() => {
    if (isOnScreen) {
      refetch()
    }
  }, [isOnScreen, refetch])

  return items.length ? (
    <ul
      ref={ref}
      className={cx(
        css`
          width: 300px;
          overflow-y: auto;
          list-style-type: none;
          padding-inline-start: 0;
          margin: 0;
          & > li {
            cursor: pointer;
          }
        `,
        props.className
      )}
    >
      {items.map(({ id, storyId }) => (
        <li
          key={id}
          className={css`
            background: ${ThemingVariables.colors.primary[5]};
            border-radius: 10px;
            margin: 10px;
            padding: 10px;
            cursor: pointer;
          `}
          onClick={() => {
            if (storyId) {
              handleOpen({ mode: 'SQL', blockId: id, storyId, readonly: false })
            }
          }}
        >
          {blocks?.[id] ? (
            <span
              className={css`
                font-weight: 500;
                font-size: 14px;
                line-height: 24px;
                color: ${ThemingVariables.colors.text[0]};
              `}
            >
              <BlockTitle block={blocks?.[id]}></BlockTitle>
            </span>
          ) : null}
          {storyId && blocks?.[storyId] ? (
            <span
              className={css`
                font-size: 14px;
                line-height: 16px;
                color: ${ThemingVariables.colors.text[1]};
              `}
            >
              <br />
              <BlockTitle block={blocks?.[storyId]}></BlockTitle>
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  ) : null
}
