import { useLoggedUser } from '@app/hooks/useAuth'
import { css, cx } from '@emotion/css'
import {
  IconCommonAdd,
  IconCommonAllQuestion,
  IconCommonFold,
  IconCommonMenu,
  IconCommonSearch,
  IconCommonSetting,
  IconCommonThoughts
} from 'assets/icons'
import { useBlockTranscations } from '@app/hooks/useBlockTranscation'
import { useGetBlockTitleTextSnapshot } from 'components/editor'
import { MainSideBarItem, sideBarContainerStyle } from 'components/MainSideBarItem'
import { motion, useAnimation, useMotionValue, useTransform } from 'framer-motion'
import { useOpenStory } from 'hooks'
import { useBlockSuspense, useConnectorsListProfiles, useWorkspaceView } from 'hooks/api'
import { useLocalStorage } from 'hooks/useLocalStorage'
import { useUpdateAtom } from 'jotai/utils'
import { nanoid } from 'nanoid'
import React, { useCallback, useEffect, useState } from 'react'
import ContentLoader from 'react-content-loader'
import { useHistory, useLocation, useRouteMatch } from 'react-router-dom'
import { omniboxShowState } from 'store'
import { ThemingVariables } from 'styles'
import { DRAG_HANDLE_WIDTH } from 'utils'
import Icon from './kit/Icon'
import IconButton from './kit/IconButton'
import Workspace from './Workspace'
import User from './User'
import { useWorkspace } from '@app/context/workspace'

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
  const setOmniboxShow = useUpdateAtom(omniboxShowState)
  const location = useLocation()
  const history = useHistory()
  const blockTranscations = useBlockTranscations()
  const handleCreateNewSotry = useCallback(async () => {
    const id = nanoid()
    await blockTranscations.createNewStory({ id: id })
    history.push(`/story/${id}`)
  }, [blockTranscations, history])
  const [showUser, setShowUser] = useState(false)
  const [showSetting, setShowSetting] = useState(false)
  const workspace = useWorkspace()
  const { data: profiles } = useConnectorsListProfiles(workspace.preferences.connectorId)
  const hasNoProfile = profiles?.length === 0
  useEffect(() => {
    if (hasNoProfile) {
      setShowSetting(true)
    }
  }, [hasNoProfile])

  return (
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
      {showUser && (
        <User
          onClose={() => {
            setShowUser(false)
          }}
        />
      )}
      {showSetting && (
        <Workspace
          openForProfiles={hasNoProfile}
          onClose={() => {
            setShowSetting(false)
          }}
        />
      )}
      {folded === true && (
        <div
          className={css`
            cursor: pointer;
            margin: 18px auto 0 auto;
          `}
          onClick={toggleFoldStatus}
        >
          <Icon icon={IconCommonMenu} color={ThemingVariables.colors.gray[0]} />
        </div>
      )}
      <div
        className={css`
          display: flex;
          align-items: center;
        `}
      >
        <UserSection
          hideName={folded}
          onClick={() => {
            setShowUser(true)
          }}
        />
        {folded === false && (
          <div
            className={css`
              cursor: pointer;
              margin-left: auto;
              margin-right: 16px;
              line-height: 0;
            `}
            onClick={toggleFoldStatus}
          >
            <IconCommonFold />
          </div>
        )}
      </div>
      <div
        className={css`
          padding: 0 16px;
        `}
      >
        <MainSideBarItem
          icon={IconCommonSearch}
          folded={folded}
          title="Quick Find"
          onClick={() => {
            setOmniboxShow(true)
          }}
        />
        <MainSideBarItem
          icon={IconCommonAllQuestion}
          title="All Stories"
          onClick="/stories"
          active={location.pathname === '/stories'}
          folded={folded}
        />
        <MainSideBarItem
          icon={IconCommonThoughts}
          title="Thoughts"
          onClick="/thought"
          active={location.pathname === '/thought'}
          folded={folded}
        />
        <MainSideBarItem
          icon={IconCommonSetting}
          title="Settings"
          onClick={() => {
            setShowSetting(true)
          }}
          folded={folded}
        />
      </div>
      {folded ? (
        <div
          className={css`
            flex: 1;
          `}
        />
      ) : (
        <WorkspaceSection />
      )}
      {folded ? (
        <IconButton
          icon={IconCommonAdd}
          color={ThemingVariables.colors.gray[0]}
          className={css`
            margin-bottom: 16px;
          `}
          onClick={handleCreateNewSotry}
        />
      ) : (
        <div
          className={css`
            height: 50px;
            padding: 15px 16px;
            border-top: 1px solid ${ThemingVariables.colors.gray[1]};
            font-size: 14px;
            line-height: 16px;
            color: ${ThemingVariables.colors.text[1]};
            display: flex;
            align-items: center;
            cursor: pointer;
          `}
          onClick={handleCreateNewSotry}
        >
          <Icon
            icon={IconCommonAdd}
            color={ThemingVariables.colors.gray[0]}
            className={css`
              margin-right: 10px;
            `}
          />
          Create new story
        </div>
      )}
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
      folded={false}
    />
  )
}

const UserSection: React.FC<{ onClick(): void; hideName: boolean }> = ({ onClick, hideName = false }) => {
  const user = useLoggedUser()

  return (
    <div
      className={css`
        display: flex;
        align-items: center;
        text-decoration: none;
        padding: 10px;
        margin: 14px 6px;
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
          margin-right: 10px;
          background: ${ThemingVariables.colors.gray[0]};
        `}
      />
      {!hideName && (
        <div
          className={css`
            font-weight: 600;
            font-size: 14px;
            line-height: 17px;
            color: ${ThemingVariables.colors.text[0]};
          `}
        >
          {user.name}
        </div>
      )}
    </div>
  )
}

export const SideBar = _SideBar
