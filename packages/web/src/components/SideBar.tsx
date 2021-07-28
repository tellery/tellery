import {
  IconCommonAdd,
  IconCommonAllQuestion,
  IconCommonSearch,
  IconCommonSetting,
  IconCommonStar,
  IconCommonThoughts
} from '@app/assets/icons'
import { MainSideBarItem } from '@app/components/MainSideBarItem'
import { useWorkspace } from '@app/context/workspace'
import { useHover } from '@app/hooks'
import { useConnectorsListProfiles } from '@app/hooks/api'
import { useLoggedUser } from '@app/hooks/useAuth'
import { useBlockTranscations } from '@app/hooks/useBlockTranscation'
import { useSideBarConfig } from '@app/hooks/useSideBarConfig'
import { omniboxShowState } from '@app/store'
import { ThemingVariables } from '@app/styles'
import { DRAG_HANDLE_WIDTH } from '@app/utils'
import { css, cx } from '@emotion/css'
import { AnimatePresence, motion, useMotionValue, useTransform } from 'framer-motion'
import { useUpdateAtom } from 'jotai/utils'
import { nanoid } from 'nanoid'
import React, { ReactNode, useCallback, useEffect, useState } from 'react'
import { useHistory } from 'react-router-dom'
import { SideBarAllStoriesSection } from './SideBarAllStoriesSection'
import { SideBarPinnedStoriesSection } from './SideBarPinnedStoriesSection'
import { SideBarThoughtsSection } from './SideBarThoughtsSection'
import { UserModal } from './UserModal'
import { WorkspaceModal } from './WorkspaceModal'

const FOLDED_WIDTH = 68

const DragConstraints = {
  left: 200,
  right: 600
}

export const SideBar = () => {
  return (
    <motion.nav
      className={cx(
        css`
          user-select: none;
          margin: auto;
          bottom: 0;
          height: 100%;
          z-index: 9999;
          box-shadow: ${ThemingVariables.boxShadows[0]};
        `
      )}
    >
      <SideBarContent />
    </motion.nav>
  )
}

const SideBarContents = {
  PINNED: {
    icon: IconCommonStar,
    hoverTitle: 'Pinned Stories',
    content: <SideBarPinnedStoriesSection />
  },
  ALL_STORIES: {
    icon: IconCommonAllQuestion,
    hoverTitle: 'All Stories',
    content: <SideBarAllStoriesSection />
  },
  THOUGHTS: {
    icon: IconCommonThoughts,
    hoverTitle: 'My Thoughts',
    content: <SideBarThoughtsSection />
  }
  // METRICS: {
  //   icon: IconCommonMetrics,
  //   hoverTitle: 'Metrics',
  //   content: <SideBarMetricsSection />
  // }
}

const SideBarContent: React.FC = () => {
  const [modalContent, setModalContent] = useState<ReactNode>(null)
  const [activeSideBarTab, setActiveSideBarTab] = useState<keyof typeof SideBarContents | null>('PINNED')

  const [ref, isHovering] = useHover<HTMLDivElement>()

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
        position: relative;
      `}
      ref={ref}
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
        {/* <div
          className={css`
            cursor: pointer;
            margin: 18px auto 0 auto;
          `}
          onClick={toggleFoldStatus}
        >
          <IconCommonMenu color={ThemingVariables.colors.gray[0]} />
        </div> */}

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
          {Object.keys(SideBarContents).map((id) => {
            const key = id as keyof typeof SideBarContents
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { content: _content, ...rest } = SideBarContents[key]
            return (
              <MainSideBarItem
                key={id}
                {...rest}
                onClick={() => {
                  setActiveSideBarTab(key)
                }}
                active={activeSideBarTab === id}
              />
            )
          })}
        </div>

        <div
          className={css`
            padding: 0 16px;
            margin-top: auto;
          `}
        >
          <MainSideBarItem
            icon={IconCommonSearch}
            hoverTitle="Search"
            onClick={() => {
              setOmniboxShow(true)
            }}
          />
          <MainSideBarItem icon={IconCommonAdd} hoverTitle="Create a new story" onClick={handleCreateNewSotry} />
          <MainSideBarItem icon={IconCommonSetting} hoverTitle="Settings" onClick={showSettingsModal} />
        </div>
      </div>
      <FloatingSideBar show={isHovering}>
        {activeSideBarTab && SideBarContents[activeSideBarTab].content}
      </FloatingSideBar>

      <AnimatePresence>{modalContent}</AnimatePresence>
    </div>
  )
}

const FloatingSideBar: React.FC<{ show: boolean }> = ({ children, show }) => {
  const [resizeConfig, setResizeConfig] = useSideBarConfig()

  const x = useMotionValue(resizeConfig.x + 0.5 * DRAG_HANDLE_WIDTH)
  const width = useTransform(x, (x) => x)
  const [dragging, setDragging] = useState(false)

  const translateX = useTransform(x, (x) => (show || dragging || resizeConfig.folded === false ? 0 : -x))

  useEffect(() => {
    x.set(resizeConfig.x)
    const unsubscribe = x.onChange((x) => {
      if (!x) return
      setResizeConfig((config) => ({ ...config, x: x }))
    })
    return () => {
      unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resizeConfig.folded, setResizeConfig, x])

  return (
    <motion.div
      style={{
        width: width,
        x: translateX,
        position: resizeConfig.folded ? 'absolute' : 'relative',
        left: resizeConfig.folded ? `${FOLDED_WIDTH}px` : `0`,
        zIndex: resizeConfig.folded ? -1 : 0
      }}
      className={css`
        height: 100%;
        top: 0;
        background-color: ${ThemingVariables.colors.gray[3]};
        overflow: hidden;
        transition: transform 250ms;
      `}
    >
      {children}
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
          onDrag={() => {
            setDragging(true)
          }}
          onDragEnd={() => {
            setDragging(false)
          }}
          style={{ x }}
        />
      )}
    </motion.div>
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
