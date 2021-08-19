import { BlockingUI } from '@app/components/BlockingUI'
import { SecondaryEditor, StoryEditor, useGetBlockTitleTextSnapshot } from '@app/components/editor'
import { NavigationHeader } from '@app/components/NavigationHeader'
import { SideBarMetricsSection } from '@app/components/SideBarMetricsSection'
import { StoryBackLinks } from '@app/components/StoryBackLinks'
import { StoryQuestionsEditor } from '@app/components/StoryQuestionsEditor'
import { useMediaQuery } from '@app/hooks'
import { useBlockSuspense, useFetchStoryChunk, useRecordStoryVisits, useStoryPinnedStatus } from '@app/hooks/api'
import { useLoggedUser } from '@app/hooks/useAuth'
import { useWorkspace } from '@app/hooks/useWorkspace'
import { ThemingVariables } from '@app/styles'
import { Editor, Story, Thought } from '@app/types'
import { DEFAULT_TITLE } from '@app/utils'
import { css } from '@emotion/css'
import styled from '@emotion/styled'
import React, { useEffect, useMemo } from 'react'
import { Helmet } from 'react-helmet'
import { useParams } from 'react-router-dom'

const _Page: React.FC = () => {
  const { id } = useParams<{ id: string }>()

  const recordVisits = useRecordStoryVisits()
  const user = useLoggedUser()
  const workspace = useWorkspace()
  const matches = useMediaQuery('only screen and (min-width: 700px)')

  useEffect(() => {
    if (id) {
      recordVisits.mutate({ workspaceId: workspace.id, storyId: id, userId: user.id })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, recordVisits.mutate, user.id])

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
              `}
            >
              <React.Suspense
                fallback={
                  <div
                    className={css`
                      background: ${ThemingVariables.colors.gray[5]};
                      box-shadow: 0px 1px 0px ${ThemingVariables.colors.gray[1]};
                    `}
                  ></div>
                }
              >
                <StoryHeader storyId={id} key={id} />
              </React.Suspense>
            </div>
            <Layout>
              {matches && (
                <div
                  className={css`
                    width: 240px;
                  `}
                >
                  <React.Suspense fallback={<div></div>}>
                    <SideBarMetricsSection />
                  </React.Suspense>
                </div>
              )}
              <StoryContainer>
                <React.Suspense fallback={<BlockingUI blocking size={50} />}>
                  <StoryContent storyId={id} />
                </React.Suspense>
              </StoryContainer>
            </Layout>
          </div>
          <SecondaryEditor />
        </div>
        <StoryQuestionsEditor />
      </VerticalLayout>
    </>
  )
}

const StoryContent: React.FC<{ storyId: string }> = ({ storyId }) => {
  const storyBlock = useFetchStoryChunk<Story | Thought>(storyId, false)

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
          bottom={<StoryBackLinks storyId={storyId} />}
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
  const storyBlock = useBlockSuspense(storyId)
  const getBlockTitle = useGetBlockTitleTextSnapshot()
  const pinned = useStoryPinnedStatus(storyId)
  const title = useMemo(() => storyBlock && getBlockTitle(storyBlock), [getBlockTitle, storyBlock])

  return (
    <>
      <Helmet>
        <title>{title ?? DEFAULT_TITLE} - Tellery</title>
      </Helmet>
      {storyBlock.type === Editor.BlockType.Story && (
        <NavigationHeader storyId={storyId} title={title} pinned={pinned} />
      )}
      {storyBlock.type === Editor.BlockType.Thought && (
        <div
          className={css`
            box-shadow: 0px 1px 0px #dedede;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 25px;
            width: 100%;
            z-index: 1000;
            flex-shrink: 0;
            height: 100%;
            background-color: #fff;
          `}
        >
          Thoughts
        </div>
      )}
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
  flex: 1;
  align-self: stretch;
  overflow: hidden;
`

export default _Page
