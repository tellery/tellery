import { useWorkspace } from '@app/context/workspace'
import { useLoggedUser } from '@app/hooks/useAuth'
import { DEFAULT_TITLE } from '@app/utils'
import { css } from '@emotion/css'
import styled from '@emotion/styled'
import { SecondaryEditor, StoryEditor, useGetBlockTitleTextSnapshot } from 'components/editor'
import { NavigationHeader } from 'components/NavigationHeader'
import { StoryBackLinks } from 'components/StoryBackLinks'
import { StoryQuestionsEditor } from 'components/StoryQuestionsEditor'
import { useFetchStoryChunk, useRecordStoryVisits, useStoryPinnedStatus } from 'hooks/api'
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
  const story = useFetchStoryChunk(id)
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

  const title = useMemo(() => getBlockTitle(story), [getBlockTitle, story])
  const storyBottom = useMemo(() => id && <StoryBackLinks storyId={id} />, [id])

  return (
    <>
      <Helmet>
        <title>{title ?? DEFAULT_TITLE} - Tellery</title>
      </Helmet>
      <VerticalLayout>
        <Layout>
          <StoryContainer>
            <StoryEditor
              key={id}
              storyId={id}
              top={
                <NavigationHeader
                  storyId={id}
                  story={story}
                  title={title}
                  pinned={pinned}
                  locked={story.format?.locked}
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
