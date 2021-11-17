import { BlockingUI } from '@app/components/BlockingUI'
import { blockTitleToText, StoryEditor, tokensToText } from '@app/components/editor'
import { NavigationHeader } from '@app/components/NavigationHeader'
import { SideBarRight } from '@app/components/SideBarRight'
import { StoryBackLinks } from '@app/components/StoryBackLinks'
import { StoryQuestionsEditor } from '@app/components/StoryQuestionsEditor'
import { useMediaQuery } from '@app/hooks'
import {
  useBlock,
  useBlockSuspense,
  useFetchStoryChunk,
  useRecordStoryVisits,
  useStoryPinnedStatus
} from '@app/hooks/api'
import { useLoggedUser } from '@app/hooks/useAuth'
import { useRightSideBarUIConfig } from '@app/hooks/useRightSideBarConfig'
import { useWorkspace } from '@app/hooks/useWorkspace'
import { BlockFormatAtom, BlockTitleAtom, BlockTypeAtom } from '@app/store/block'
import { ThemingVariables } from '@app/styles'
import { Editor, Story, Thought } from '@app/types'
import { DEFAULT_TITLE } from '@app/utils'
import { css } from '@emotion/css'
import styled from '@emotion/styled'
import React, { useEffect, useMemo } from 'react'
import { Helmet } from 'react-helmet'
import { useParams } from 'react-router-dom'
import { useRecoilValue } from 'recoil'

const _Page: React.FC = () => {
  const { id } = useParams()
  const recordVisits = useRecordStoryVisits()
  const user = useLoggedUser()
  const workspace = useWorkspace()
  const [rightSideBarState] = useRightSideBarUIConfig()

  useEffect(() => {
    if (id) {
      recordVisits.mutate({ workspaceId: workspace.id, storyId: id, userId: user.id })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, recordVisits.mutate, user.id])
  if (!id) return null

  return (
    <>
      <VerticalLayout>
        <div
          className={css`
            display: flex;
            flex: 1;
            align-items: stretch;
            overflow: hidden;
          `}
        >
          <div
            className={css`
              flex: 1;
              display: flex;
              flex-direction: column;
              justify-content: stretch;
              overflow: hidden;
            `}
          >
            <div
              className={css`
                height: 44px;
                flex-shrink: 0;
                position: relative;
                background: ${ThemingVariables.colors.gray[5]};
                border-bottom: solid 1px ${ThemingVariables.colors.gray[1]};
                width: 100%;
                align-items: center;
                display: flex;
              `}
            >
              <React.Suspense fallback={<div></div>}>
                <StoryHeader storyId={id} key={id} />
              </React.Suspense>
            </div>
            <Layout>
              <StoryContainer
                style={{
                  width: rightSideBarState.folded ? 'calc(100% - 0px)' : `calc(100% - ${rightSideBarState.width}px)`
                }}
              >
                <React.Suspense fallback={<BlockingUI blocking size={50} />}>
                  <StoryContent storyId={id} />
                  <StoryQuestionsEditor key={id} storyId={id} />
                </React.Suspense>
              </StoryContainer>
              <RightSideBar storyId={id} />
            </Layout>
          </div>
        </div>
      </VerticalLayout>
    </>
  )
}

const RightSideBar: React.FC<{ storyId: string }> = ({ storyId }) => {
  const [rightSideBarState] = useRightSideBarUIConfig()
  const matches = useMediaQuery('only screen and (min-width: 700px)')

  const rightSideBarOpen = matches && !rightSideBarState.folded

  return (
    <div
      className={css`
        position: absolute;
        right: 0;
        top: 0;
        transition: transform 250ms ease;
        height: 100%;
        border-left: 1px solid ${ThemingVariables.colors.gray[1]};
      `}
      style={{
        width: rightSideBarState.width,
        transform: `translateX(${rightSideBarOpen ? '0' : '100%'})`
      }}
    >
      <React.Suspense fallback={<div></div>}>
        <SideBarRight storyId={storyId} />
      </React.Suspense>
    </div>
  )
}

const StoryContent: React.FC<{ storyId: string }> = ({ storyId }) => {
  useFetchStoryChunk(storyId, false)
  const storyBlock = useBlockSuspense<Story | Thought>(storyId)
  const storyBotom = useMemo(() => <StoryBackLinks storyId={storyId} />, [storyId])

  return (
    <>
      {storyBlock.type === Editor.BlockType.Story && (
        <StoryEditor
          key={storyId}
          storyId={storyId}
          className={css`
            @media (max-width: 700px) {
              padding: 20px 20px 0 20px;
            }
            padding: 100px 100px 0 100px;
          `}
          bottom={storyBotom}
        ></StoryEditor>
      )}
      {storyBlock.type === Editor.BlockType.Thought && (
        <>
          <StoryEditor
            key={storyId}
            storyId={storyId}
            fullWidth
            className={css`
              padding: 0 120px;
            `}
          />
        </>
      )}
    </>
  )
}

const StoryHeader: React.FC<{ storyId: string }> = ({ storyId }) => {
  const storyType = useRecoilValue(BlockTypeAtom(storyId))
  const story = useBlockSuspense(storyId)
  const storyForamt = useRecoilValue(BlockFormatAtom(storyId))
  const pinned = useStoryPinnedStatus(storyId)
  const title = useMemo(() => blockTitleToText(story), [story])

  return (
    <>
      <Helmet>
        <title>{title} - Tellery</title>
      </Helmet>
      <div
        className={css`
          display: flex;
          flex: 1;
          align-items: center;
          padding: 0 25px;
          z-index: 1000;
          flex-shrink: 0;
          background-color: #fff;
        `}
      >
        <NavigationHeader format={storyForamt} storyId={storyId} title={title} pinned={pinned} type={storyType} />
      </div>
    </>
  )
}

const VerticalLayout = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  justify-content: flex-start;
  position: relative;
  overflow: hidden;
`
const Layout = styled.div`
  display: flex;
  justify-content: flex-start;
  position: relative;
  overflow: hidden;
  flex: 1;
`

const StoryContainer = styled.div`
  display: flex;
  position: relative;
  flex-direction: column;
  /* flex: 1; */
  align-self: stretch;
  overflow: hidden;
  transition: width 250ms ease;
`

export default _Page
