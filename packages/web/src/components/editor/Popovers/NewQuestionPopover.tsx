import { DEFAULT_TITLE } from '@app/utils'
import { css } from '@emotion/css'
import { IconCommonAdd, IconCommonSearch, IconCommonStoryBlock } from 'assets/icons'
import Icon from 'components/kit/Icon'
import { MenuItem } from 'components/MenuItem'
import { useQuestionEditor } from 'components/StoryQuestionsEditor'
import { useSearchBlocks } from 'hooks/api'
import invariant from 'invariant'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import scrollIntoView from 'scroll-into-view-if-needed'
import { ThemingVariables } from 'styles'
import { Editor } from 'types'
import { BlockTitle } from '..'
import { DEFAULT_QUESTION_BLOCK_ASPECT_RATIO, DEFAULT_QUESTION_BLOCK_WIDTH } from '../Blocks/QuestionBlock'
import { EditorPopover } from '../EditorPopover'
import { useEditor } from '../hooks'

export const QuestionSearchResultCell = (props: {
  block?: Editor.QuestionBlock
  onClick: () => void
  selected: boolean
  index: number
  keyword: string
  setIndex: (index: number) => void
}) => {
  const { block, selected, index, keyword } = props

  const ref = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (selected) {
      ref.current &&
        scrollIntoView(ref.current, {
          scrollMode: 'if-needed',
          block: 'nearest',
          inline: 'nearest'
        })
    }
  }, [selected])

  return (
    <div
      ref={ref}
      onClick={props.onClick}
      tabIndex={index}
      className={css`
        cursor: pointer;
        font-size: 14px;
        line-height: 17px;
        color: ${ThemingVariables.colors.text[0]};
        outline: none;
        overflow-y: auto;
      `}
    >
      {block ? (
        <MenuItem
          icon={
            <div
              className={css`
                height: 36px;
                width: 36px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 8px;
              `}
            >
              <IconCommonStoryBlock />
            </div>
          }
          isActive={selected}
          title={<BlockTitle block={block} /> ?? DEFAULT_TITLE}
          onClick={props.onClick}
          size="large"
        />
      ) : (
        <MenuItem
          isActive={selected}
          icon={
            <div
              className={css`
                height: 36px;
                width: 36px;
                background-color: ${ThemingVariables.colors.primary[5]};
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 8px;
              `}
            >
              <Icon icon={IconCommonAdd} color={ThemingVariables.colors.primary[1]} />
            </div>
          }
          title={keyword ? `Create "${keyword}"` : 'Create new question '}
          onClick={props.onClick}
          size="large"
        />
      )}
    </div>
  )
}

export const NewQuestionPopover: React.FC<{
  open: boolean
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
  referneceElement: HTMLElement
  block: Editor.QuestionBlock
}> = ({ open, setOpen, referneceElement, block }) => {
  const questionEditor = useQuestionEditor()
  const [keyword, setKeyword] = useState('')
  const { data } = useSearchBlocks(keyword, 100, Editor.BlockType.Question, {
    enabled: !!keyword
  })
  const questionsSearchResult = useMemo(() => (data ? data.searchResults.map((id) => data.blocks[id]) : []), [data])
  const [selectedQuestionResultIndex, setSelectedQuestionResultIndex] = useState(0)
  const editor = useEditor<Editor.QuestionBlock>()
  const searchInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    open && searchInputRef.current?.focus()
  }, [open])

  const questionSearchResultClickHandler = useCallback(
    async (index) => {
      if (!editor?.setBlockValue) return
      if (index <= 0) {
        editor?.setBlockValue?.(block.id, (draftBlock) => {
          if (!draftBlock.content) return
          // draftBlock.content.questionId = newQuestionId
          draftBlock.content.title = keyword.length ? [[keyword]] : []
          draftBlock.content.sql = ''
          draftBlock.format = {
            width: DEFAULT_QUESTION_BLOCK_WIDTH,
            aspectRatio: DEFAULT_QUESTION_BLOCK_ASPECT_RATIO
          }
        })
        setOpen(false)
        questionEditor.open({ mode: 'SQL', readonly: false, blockId: block.id, storyId: block.storyId! })
      } else {
        const questionIndex = index - 1
        setOpen(false)
        const questionBlock = questionsSearchResult?.[questionIndex]
        editor?.setBlockValue?.(block.id, (draftBlock) => {
          if (!draftBlock.content) return
          invariant(questionBlock, 'question block is undefined')
          draftBlock.content.title = questionBlock?.content!.title ?? [[DEFAULT_TITLE]]
          if (questionBlock?.content!.visualization) {
            draftBlock.content.visualization = questionBlock?.content!.visualization
          }
          draftBlock.format = {
            width: DEFAULT_QUESTION_BLOCK_WIDTH,
            aspectRatio: DEFAULT_QUESTION_BLOCK_ASPECT_RATIO
          }
        })
      }
    },
    [editor, block.id, block.storyId, setOpen, questionEditor, keyword, questionsSearchResult]
  )

  return (
    <EditorPopover open={open} setOpen={setOpen} placement="bottom-start" referenceElement={referneceElement}>
      <div
        className={css`
          background: ${ThemingVariables.colors.gray[5]};
          box-shadow: ${ThemingVariables.boxShadows[0]};
          border-radius: 8px;
          width: 300px;
          padding: 8px;
        `}
        onKeyDown={(e) => {
          e.stopPropagation()
          if (e.key === 'ArrowUp') {
            e.preventDefault()
            setSelectedQuestionResultIndex((index) => {
              return index <= 1 ? 0 : index - 1
            })
          } else if (e.key === 'ArrowDown') {
            e.preventDefault()
            setSelectedQuestionResultIndex((index) => {
              if (questionsSearchResult) {
                const length = questionsSearchResult.length
                return index >= length ? length : index + 1
              } else {
                return 0
              }
            })
          } else if (e.key === 'Enter') {
            e.preventDefault()
            e.stopPropagation()
            questionSearchResultClickHandler(selectedQuestionResultIndex)
          }
        }}
      >
        <div
          className={css`
            font-size: 14px;
            color: ${ThemingVariables.colors.gray[0]};
            background: ${ThemingVariables.colors.gray[5]};
            border: 1px solid ${ThemingVariables.colors.gray[1]};
            box-sizing: border-box;
            border-radius: 8px;
            font-size: 14px;
            line-height: 17px;
            color: ${ThemingVariables.colors.text[1]};
            margin: 4px;
          `}
        >
          <div
            className={css`
              height: 36px;
              display: flex;
              align-items: center;
              justify-content: flex-start;
            `}
          >
            <Icon
              icon={IconCommonSearch}
              className={css`
                margin-left: 8px;
              `}
              color={ThemingVariables.colors.text[0]}
            />
            <input
              className={css`
                outline: none;
                border: none;
                padding: 5px;
                width: 100%;
                &::placeholder {
                  color: ${ThemingVariables.colors.text[2]};
                }
              `}
              placeholder="Type question name"
              onInput={(e) => {
                setKeyword(e.currentTarget.value)
              }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowUp') {
                  e.preventDefault()
                } else if (e.key === 'ArrowDown') {
                  e.preventDefault()
                }
              }}
              ref={searchInputRef}
            />
          </div>
        </div>
        <div
          className={css`
            max-height: 300px;
            overflow: auto;
            > * + * {
              margin-top: 3px;
            }
          `}
        >
          <QuestionSearchResultCell
            index={0}
            keyword={keyword}
            onClick={() => {
              questionSearchResultClickHandler(0)
            }}
            selected={selectedQuestionResultIndex === 0}
            setIndex={setSelectedQuestionResultIndex}
          />
          {questionsSearchResult?.map((block, index) => {
            return (
              <QuestionSearchResultCell
                block={block}
                keyword={keyword}
                key={block.id}
                selected={selectedQuestionResultIndex === index + 1}
                index={index + 1}
                setIndex={setSelectedQuestionResultIndex}
                onClick={() => {
                  questionSearchResultClickHandler(index + 1)
                }}
              />
            )
          })}
        </div>
      </div>
    </EditorPopover>
  )
}
