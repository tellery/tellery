import { BlockingUI } from '@app/components/BlockingUI'
import { SecondaryEditor, StoryEditor, useGetBlockTitleTextSnapshot } from '@app/components/editor'
import { NavigationHeader } from '@app/components/NavigationHeader'
import { StoryBackLinks } from '@app/components/StoryBackLinks'
import { StoryQuestionsEditor } from '@app/components/StoryQuestionsEditor'
import { ThoughtsCalendar } from '@app/components/ThoughtsCalendar'
import { useWorkspace } from '@app/context/workspace'
import { useFetchStoryChunk, useRecordStoryVisits, useStoryPinnedStatus } from '@app/hooks/api'
import { useLoggedUser } from '@app/hooks/useAuth'
import { Editor, Story, Thought } from '@app/types'
import { DEFAULT_TITLE } from '@app/utils'
import { css } from '@emotion/css'
import styled from '@emotion/styled'
import React, { useEffect, useMemo, useState } from 'react'
import { Helmet } from 'react-helmet'
import { useLocation, useParams } from 'react-router-dom'

const _Page: React.FC = () => {
  const location = useLocation()
  const { id } = useParams<{ id: string }>()
  const pinned = useStoryPinnedStatus(id)
  const recordVisits = useRecordStoryVisits()

  const user = useLoggedUser()
  const [scrollToBlockId, setScrollToBlockId] = useState<string | null>(null)
  const storyBlock = useFetchStoryChunk<Story | Thought>(id, false)
  // const { data: storyBlock } = useBlock<Story>(id)
  const workspace = useWorkspace()
  useEffect(() => {
    if (id) {
      recordVisits.mutate({ workspaceId: workspace.id, storyId: id, userId: user.id })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, recordVisits.mutate, user.id])

  useEffect(() => {
    const blockId = location.hash.slice(1)
    setScrollToBlockId(blockId)
  }, [location])

  const getBlockTitle = useGetBlockTitleTextSnapshot()

  const title = useMemo(() => storyBlock && getBlockTitle(storyBlock), [getBlockTitle, storyBlock])
  const storyBottom = useMemo(() => id && <StoryBackLinks storyId={id} />, [id])

  return (
    <>
      <Helmet>
        <title>{title ?? DEFAULT_TITLE} - Tellery</title>
      </Helmet>
      <VerticalLayout>
        <Layout>
          <StoryContainer>
            <React.Suspense fallback={<BlockingUI blocking size={50} />}>
              {storyBlock.type === Editor.BlockType.Story && (
                <StoryEditor
                  key={id}
                  storyId={id}
                  top={
                    <NavigationHeader
                      storyId={id}
                      story={storyBlock}
                      title={title}
                      pinned={pinned}
                      locked={storyBlock.format?.locked}
                    />
                  }
                  className={css`
                    @media (max-width: 700px) {
                      padding: 20px 20px 0 20px;
                    }
                    padding: 100px 100px 0 100px;
                  `}
                  scrollToBlockId={scrollToBlockId}
                  bottom={storyBottom}
                ></StoryEditor>
              )}
              {storyBlock.type === Editor.BlockType.Thought && (
                <>
                  <StoryEditor
                    storyId={id}
                    top={
                      <>
                        <div
                          className={css`
                            box-shadow: 0px 1px 0px #dedede;
                            display: flex;
                            align-items: center;
                            justify-content: space-between;
                            padding: 0 25px;
                            width: 100%;
                            z-index: 1000;
                            height: 44px;
                            background-color: #fff;
                          `}
                        >
                          Thoughts
                          <ThoughtsCalendar />
                        </div>
                      </>
                    }
                    fullWidth
                    className={css`
                      padding: 0 120px;
                    `}
                  />
                </>
              )}
            </React.Suspense>
          </StoryContainer>
          <SecondaryEditor />
        </Layout>
        <StoryQuestionsEditor />
      </VerticalLayout>
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
  height: 100%;
  justify-content: flex-start;
  position: relative;
  overflow: hidden;
`

const StoryContainer = styled.div`
  display: flex;
  position: relative;
  flex-direction: column;
  flex: 1;
  align-self: stretch;
  overflow: hidden;
  height: 100%;
`

export default _Page
