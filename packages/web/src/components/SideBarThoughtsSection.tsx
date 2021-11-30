import { IconCommonAdd } from '@app/assets/icons'
import { useOpenStory } from '@app/hooks'
import { useAllThoughts } from '@app/hooks/api'
import { useBlockTranscations } from '@app/hooks/useBlockTranscation'
import { useStoryBlocksMap } from '@app/hooks/useStoryBlock'
import { ThemingVariables } from '@app/styles'
import { blockIdGenerator } from '@app/utils'
import { waitForTranscationApplied } from '@app/utils/oberveables'
import { css } from '@emotion/css'
import dayjs from 'dayjs'
import React, { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Calendar } from './Calendar'
import { BlockContentOverview } from './editor/BlockContentOverview'
import { FormButton } from './kit/FormButton'
// import IconButton from './kit/IconButton'
import { MenuItemDivider } from './MenuItemDivider'
import { SideBarContentLayout } from './SideBarContentLayout'

export const SideBarThoughtsSection: React.FC<{ close: Function }> = (props) => {
  const { data: thoughts, refetch: refetchThoughts } = useAllThoughts()
  const openStory = useOpenStory()
  const [date, setDate] = useState(new Date())
  const [activeStartDate, setActiveStartDate] = useState(new Date())
  const blockTranscations = useBlockTranscations()

  const createTodaysNotes = useCallback(async () => {
    const id = blockIdGenerator()
    const [transcationId] = blockTranscations.createNewThought({ id })
    await waitForTranscationApplied(transcationId)
    openStory(id, {})
    refetchThoughts()
  }, [blockTranscations, openStory, refetchThoughts])

  const showCreateTodaysNotes = useMemo(() => {
    if (thoughts === undefined) return false
    const today = dayjs().format('YYYY-MM-DD')
    if (thoughts.length >= 1 && thoughts[0].date === today) {
      return false
    }
    return true
  }, [thoughts])

  const { t } = useTranslation()
  const currentMonthThoughts = useMemo(() => {
    const currentMonthString = dayjs(activeStartDate).format('YYYY-MM')
    return thoughts?.filter((thought) => {
      return thought.date?.indexOf(currentMonthString) !== -1
    })
  }, [activeStartDate, thoughts])

  return (
    <SideBarContentLayout title={t`Thoughts`}>
      <div
        className={css`
          display: flex;
          flex-direction: column;
          height: 100%;
        `}
      >
        <Calendar
          value={date}
          onActiveStartDataChange={(view) => {
            setActiveStartDate(view.activeStartDate)
          }}
          onChange={(_date, id) => {
            setDate(_date)
            if (id) {
              openStory(id, {})
            }
          }}
        />
        <MenuItemDivider />
        <div
          className={css`
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 10px 8px 8px;
          `}
        >
          <div
            className={css`
              font-size: 16px;
              color: ${ThemingVariables.colors.text[0]};
              font-weight: 600;
            `}
          >
            {dayjs(activeStartDate).format('MMM YYYY')}
          </div>
          {/* <IconButton
            icon={IconCommonAdd}
            hoverContent={t`Capture today's thought`}
            disabled={showCreateTodaysNotes === false}
            onClick={createTodaysNotes}
          /> */}
        </div>
        {showCreateTodaysNotes && (
          <FormButton
            variant="secondary"
            className={css`
              background: transparent;
              width: calc(100% - 16px);
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 0 8px;
            `}
            disabled={!showCreateTodaysNotes}
            onClick={createTodaysNotes}
          >
            <IconCommonAdd
              color={showCreateTodaysNotes ? ThemingVariables.colors.primary[1] : ThemingVariables.colors.text[1]}
              className={css`
                margin-right: 4px;
              `}
            />
            <span>{t`Capture today's thought`}</span>
          </FormButton>
        )}
        <div
          className={css`
            flex: 1;
            margin-top: 8px;
            overflow-y: auto;
          `}
        >
          {currentMonthThoughts && <StoryCards thoughtIds={currentMonthThoughts} onClick={props.close} />}
        </div>
      </div>
    </SideBarContentLayout>
  )
}

const StoryCard: React.FC<{ thoughtId: string; date: string; onClick: Function }> = ({ thoughtId, date, onClick }) => {
  const blocksMap = useStoryBlocksMap(thoughtId)
  const thought = blocksMap?.[thoughtId]
  const openStory = useOpenStory()

  return (
    <div
      className={css`
        background: #ffffff;
        border-radius: 10px;
        cursor: pointer;
        padding: 10px;
        border-width: 2px;
        border-color: transparent;
        border-style: solid;
        border-radius: 10px;
        &:hover {
          border-color: ${ThemingVariables.colors.primary[3]};
        }
        &[data-active='true'] {
          border-color: ${ThemingVariables.colors.primary[2]};
        }
      `}
      onClick={() => {
        openStory(thoughtId)
        onClick()
      }}
    >
      <div
        className={css`
          display: flex;
          align-items: center;
          overflow: hidden;
        `}
      >
        <div
          className={css`
            margin-right: auto;
            font-size: 12px;
            line-height: 14px;
            color: ${ThemingVariables.colors.text[0]};
          `}
        >
          {dayjs(date).format('MMM DD, YYYY')}
        </div>
      </div>

      <div
        className={css`
          font-weight: 500;
          font-size: 14px;
          line-height: 17px;
          color: ${ThemingVariables.colors.text[0]};
          overflow: hidden;
          width: 100%;
          word-break: break-all;
          -webkit-line-clamp: 2;
          display: -webkit-box;
          -webkit-box-orient: vertical;
          text-overflow: ellipsis;
          min-height: 34px;
          margin-top: 5px;
          pointer-events: none;
        `}
      >
        {thought?.children?.slice(0, 2).map((blockId) => {
          if (!blocksMap?.[blockId]) return null
          return <BlockContentOverview key={blockId} block={blocksMap?.[blockId]} />
        })}
      </div>
    </div>
  )
}

const StoryCards: React.FC<{ thoughtIds: { id: string; date: string }[]; onClick: Function }> = ({
  thoughtIds,
  onClick
}) => {
  return (
    <div
      className={css`
        padding-top: 8px;
        padding: 0 8px 0px;
        > * + * {
          margin-top: 10px;
        }
      `}
    >
      <React.Suspense fallback={<></>}>
        {thoughtIds.map((thought) => {
          return <StoryCard thoughtId={thought.id} key={thought.id} date={thought.date} onClick={onClick} />
        })}
      </React.Suspense>
    </div>
  )
}
