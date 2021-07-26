import {
  IconCommonAdd,
  IconCommonAllQuestion,
  IconCommonMenu,
  IconCommonSearch,
  IconCommonSetting,
  IconCommonStar,
  IconCommonThoughts
} from '@app/assets/icons'
import { useGetBlockTitleTextSnapshot } from '@app/components/editor'
import { MainSideBarItem, sideBarContainerStyle } from '@app/components/MainSideBarItem'
import { useWorkspace } from '@app/context/workspace'
import { useOpenStory } from '@app/hooks'
import { useBlockSuspense, useConnectorsListProfiles, useWorkspaceView } from '@app/hooks/api'
import { useLoggedUser } from '@app/hooks/useAuth'
import { useBlockTranscations } from '@app/hooks/useBlockTranscation'
import { useLocalStorage } from '@app/hooks/useLocalStorage'
import { omniboxShowState } from '@app/store'
import { ThemingVariables } from '@app/styles'
import { DRAG_HANDLE_WIDTH } from '@app/utils'
import { css, cx } from '@emotion/css'
import { AnimatePresence, motion, useAnimation, useMotionValue, useTransform } from 'framer-motion'
import { useUpdateAtom } from 'jotai/utils'
import { nanoid } from 'nanoid'
import React, { ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import ContentLoader from 'react-content-loader'
import { useHistory, useLocation, useRouteMatch } from 'react-router-dom'
import Icon from './kit/Icon'
import { UserModal } from './UserModal'
import { WorkspaceModal } from './WorkspaceModal'

const SideBarLoader: React.FC = () => {
  return (
    <ContentLoader
      viewBox="0 0 210 36"
      style={{ width: '100%', height: '36px', padding: '0 8px' }}
      className={sideBarContainerStyle}
    >
      <rect x="0" y="0" rx="5" ry="5" width="210" height="36" />
    </ContentLoader>
  )
}

const DragConstraints = {
  left: 200,
  right: 600
}

const _SideBar = () => {
  const [resizeConfig, setResizeConfig] = useLocalStorage('Tellery:SidebarConfig:1', {
    x: 240,
    folded: false
  })

  const x = useMotionValue(resizeConfig.folded ? 68 : resizeConfig.x + 0.5 * DRAG_HANDLE_WIDTH)

  const width = useTransform(x, (x) => x)

  useEffect(() => {
    if (resizeConfig.folded) {
      x.set(68)
      return
    } else {
      x.set(resizeConfig.x)
    }
    const unsubscribe = x.onChange((x) => {
      if (!x) return
      setResizeConfig((config) => ({ ...config, x: x }))
    })
    return () => {
      unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resizeConfig.folded, setResizeConfig, x])

  const controls = useAnimation()

  const toggleFoldStatus = useCallback(() => {
    setResizeConfig((config) => {
      return { ...config, folded: !resizeConfig.folded }
    })
  }, [resizeConfig.folded, setResizeConfig])

  useEffect(() => {
    if (resizeConfig.folded) {
      controls.start({
        width: 68,
        transition: { duration: 0.15 }
      })
    } else {
      controls.start({
        width: x.get(),
        transition: { duration: 0.15 }
      })
    }
  }, [controls, resizeConfig.folded, x])

  return (
    <motion.nav
      // transition={{ type: 'just' }}
      style={
        resizeConfig.folded === false
          ? {
              width: width
            }
          : undefined
      }
      animate={controls}
      // animate={{
      //   width: resizeConfig.folded ? 68 : width.get()
      // }}
      // layout
      className={cx(
        css`
          user-select: none;
          margin: auto;
          bottom: 0;
          height: 100%;
          /* transition: width 200ms ease; */
        `
      )}
    >
      <SideBarContent folded={resizeConfig.folded} toggleFoldStatus={toggleFoldStatus} />
      {!resizeConfig.folded && (
        <motion.div
          title="drag to resize"
          whileDrag={{ backgroundColor: ThemingVariables.colors.gray[1] }}
          drag={'x'}
          dragConstraints={DragConstraints}
          className={css`
            position: absolute;
            cursor: col-resize;
            left: -${DRAG_HANDLE_WIDTH / 2}px;
            top: 0;
            height: 100%;
            z-index: 10;
            width: ${DRAG_HANDLE_WIDTH}px;
          `}
          dragElastic={false}
          dragMomentum={false}
          onDoubleClick={toggleFoldStatus}
          style={{ x }}
        />
      )}
    </motion.nav>
  )
}

const SideBarContent: React.FC<{ folded: boolean; toggleFoldStatus: () => void }> = ({ folded, toggleFoldStatus }) => {
  const sideBarContentRef = useRef<HTMLDivElement>(null)
  const [sideBarContent, setSideBarContent] = useState<ReactNode>(null)
  const [modalContent, setModalContent] = useState<ReactNode>(null)

  const location = useLocation()
  const history = useHistory()
  const workspace = useWorkspace()
  const { data: profiles } = useConnectorsListProfiles(workspace.preferences.connectorId)
  const blockTranscations = useBlockTranscations()
  const setOmniboxShow = useUpdateAtom(omniboxShowState)

  const hasNoProfile = profiles?.length === 0

  const showSettingsModal = useCallback(() => {
    setModalContent(
      <WorkspaceModal
        onClose={() => {
          setModalContent(null)
        }}
      />
    )
  }, [])

  useEffect(() => {
    if (hasNoProfile) {
      showSettingsModal()
    }
  }, [hasNoProfile, showSettingsModal])

  const handleCreateNewSotry = useCallback(async () => {
    const id = nanoid()
    await blockTranscations.createNewStory({ id: id })
    history.push(`/story/${id}`)
  }, [blockTranscations, history])

  return (
    <div
      className={css`
        display: flex;
        height: 100%;
        overflow: hidden;
      `}
    >
      <div
        className={css`
          display: flex;
          flex-direction: column;
          background: ${ThemingVariables.colors.gray[2]};
          height: 100%;
          transition: all 250ms ease-in-out;
          position: relative;
        `}
      >
        <div
          className={css`
            cursor: pointer;
            margin: 18px auto 0 auto;
          `}
          onClick={toggleFoldStatus}
        >
          <Icon icon={IconCommonMenu} color={ThemingVariables.colors.gray[0]} />
        </div>

        <UserSection
          onClick={() => {
            setModalContent(
              <UserModal
                onClose={() => {
                  setModalContent(null)
                }}
              />
            )
          }}
        />

        <div
          className={css`
            padding: 0 16px;
          `}
        >
          <MainSideBarItem
            icon={IconCommonSearch}
            hoverTitle="Search"
            onClick={() => {
              setOmniboxShow(true)
            }}
          />
          <MainSideBarItem
            icon={IconCommonStar}
            hoverTitle="Pinned Stories"
            onClick={() => {
              console.log('on click')
              setSideBarContent(<WorkspaceSection />)
            }}
            active={location.pathname === '/thoughts'}
          />
          <MainSideBarItem
            icon={IconCommonAllQuestion}
            hoverTitle="All Stories"
            onClick={() => {
              setSideBarContent(<WorkspaceSection />)
            }}
            active={location.pathname === '/stories'}
          />
          <MainSideBarItem
            icon={IconCommonThoughts}
            hoverTitle="My Thoughts"
            // onClick="/thoughts"
            onClick={() => {
              console.log('on click')
              setSideBarContent(<WorkspaceSection />)
            }}
            active={location.pathname === '/thoughts'}
          />
        </div>

        <div
          className={css`
            padding: 0 16px;
            margin-top: auto;
          `}
        >
          <MainSideBarItem icon={IconCommonAdd} hoverTitle="Create a new story" onClick={handleCreateNewSotry} />
          <MainSideBarItem icon={IconCommonSetting} hoverTitle="Settings" onClick={showSettingsModal} />
        </div>
      </div>
      <div
        ref={sideBarContentRef}
        style={{
          display: folded ? 'none' : 'initial'
        }}
        className={css`
          flex-grow: 1;
          flex-shrink: 0;
          background-color: ${ThemingVariables.colors.gray[3]};
        `}
      >
        {sideBarContent}
      </div>

      <AnimatePresence>{modalContent}</AnimatePresence>
    </div>
  )
}

const WorkspaceSection = () => {
  const { data: workspaceView } = useWorkspaceView()

  return (
    <div
      className={css`
        padding: 0 16px;
        width: 100%;
        overflow: auto;
        flex: 1 1;
        box-sizing: border-box;
      `}
    >
      <div
        className={css`
          font-size: 12px;
          line-height: 14px;
          color: ${ThemingVariables.colors.text[1]};
          margin-top: 14px;
          margin-bottom: 7px;
          box-sizing: border-box;
        `}
      >
        PINNED
      </div>

      {workspaceView?.pinnedList && <WorkspaceItems storyIds={workspaceView?.pinnedList} />}
    </div>
  )
}

const WorkspaceItems: React.FC<{ storyIds: string[] }> = ({ storyIds }) => {
  return (
    <>
      {storyIds.map((storyId) => (
        <React.Suspense key={storyId} fallback={<SideBarLoader />}>
          <WorkspaceStoryItem blockId={storyId} />
        </React.Suspense>
      ))}
    </>
  )
}

const WorkspaceStoryItem: React.FC<{ blockId: string }> = ({ blockId }) => {
  const block = useBlockSuspense(blockId)
  const matchStory = useRouteMatch<{ id: string }>('/story/:id')
  const openStory = useOpenStory()
  const getBlockTitle = useGetBlockTitleTextSnapshot()

  return (
    <MainSideBarItem
      title={getBlockTitle(block)}
      onClick={(e) => {
        openStory(block.id, { isAltKeyPressed: e.altKey })
      }}
      active={matchStory?.params.id === block.id}
    />
  )
}

const UserSection: React.FC<{ onClick(): void }> = ({ onClick }) => {
  const user = useLoggedUser()

  return (
    <>
      <div
        className={css`
          display: flex;
          justify-content: center;
          text-decoration: none;
          padding: 10px;
          margin: 14px 0px;
          cursor: pointer;
        `}
        onClick={onClick}
      >
        <img
          src={user.avatar}
          className={css`
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background: ${ThemingVariables.colors.gray[0]};
          `}
        />
      </div>
    </>
  )
}

export const SideBar = _SideBar
