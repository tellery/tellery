import {
  IconCommonAllQuestion,
  IconCommonHome,
  IconCommonSearch,
  IconCommonSetting,
  IconCommonStar,
  IconCommonThoughts
} from '@app/assets/icons'
import { MainSideBarItem } from '@app/components/MainSideBarItem'
import { useConnectorsListProfiles } from '@app/hooks/api'
import { useLoggedUser } from '@app/hooks/useAuth'
import { useSideBarConfig } from '@app/hooks/useSideBarConfig'
import { useWorkspace } from '@app/hooks/useWorkspace'
import { omniboxShowState } from '@app/store'
import { ThemingVariables } from '@app/styles'
import { css, cx } from '@emotion/css'
import { AnimatePresence, motion } from 'framer-motion'
import { useUpdateAtom } from 'jotai/utils'
import React, { ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useHistory } from 'react-router-dom'
import Avatar from './Avatar'
import { useClickAway } from 'react-use'
import { MainSideBarTabHeader } from './MainSideBarTabHeader'
import { SideBarAllStoriesSection } from './SideBarAllStoriesSection'
import { SideBarPinnedStoriesSection } from './SideBarPinnedStoriesSection'
import { SideBarThoughtsSection } from './SideBarThoughtsSection'
import { UserModal } from './UserModal'
import { WorkspaceModal } from './WorkspaceModal'
import { TippySingletonContextProvider } from './TippySingletonContextProvider'

const FOLDED_WIDTH = 68
const SIDEBAR_WIDTH = 274

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
          padding-left: env(safe-area-inset-left, 0px);
        `
      )}
    >
      <SideBarContent />
    </motion.nav>
  )
}

const SideBarContents = {
  ALL_STORIES: {
    icon: IconCommonAllQuestion,
    content: <SideBarAllStoriesSection />
  },
  PINNED: {
    icon: IconCommonStar,
    content: <SideBarPinnedStoriesSection />
  },
  THOUGHTS: {
    icon: IconCommonThoughts,
    content: <SideBarThoughtsSection />
  }
}

const SideBarContent: React.FC = () => {
  const [modalContent, setModalContent] = useState<ReactNode>(null)
  const [activeSideBarTab, setActiveSideBarTab] = useState<keyof typeof SideBarContents | null>(null)
  const ref = useRef(null)
  const history = useHistory()
  const workspace = useWorkspace()
  const { data: profiles } = useConnectorsListProfiles(workspace.preferences.connectorId)
  const setOmniboxShow = useUpdateAtom(omniboxShowState)
  const closeSideBar = useCallback(() => {
    !!activeSideBarTab && setActiveSideBarTab(null)
  }, [activeSideBarTab])

  useClickAway(ref, closeSideBar)

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
  const { t } = useTranslation()

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
              <MainSideBarTabHeader
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
          <TippySingletonContextProvider delay={500} placement="right" arrow={false}>
            <MainSideBarItem
              icon={IconCommonSearch}
              hoverTitle={t`Search`}
              onClick={() => {
                setOmniboxShow(true)
                closeSideBar()
              }}
            />
            <MainSideBarItem
              icon={IconCommonHome}
              hoverTitle={t`Home`}
              onClick={() => {
                history.push('/stories')
                closeSideBar()
              }}
            />
            {/* <MainSideBarItem icon={IconCommonAdd} hoverTitle="Create a new story" onClick={handleCreateNewSotry} /> */}
            <MainSideBarItem icon={IconCommonSetting} hoverTitle={t`Settings`} onClick={showSettingsModal} />
          </TippySingletonContextProvider>
        </div>
      </div>
      <FloatingSideBar show={!!activeSideBarTab}>
        {activeSideBarTab && SideBarContents[activeSideBarTab].content}
      </FloatingSideBar>

      <AnimatePresence>{modalContent}</AnimatePresence>
    </div>
  )
}

const FloatingSideBar: React.FC<{ show: boolean }> = ({ children, show }) => {
  const [resizeConfig, setResizeConfig] = useSideBarConfig()

  return (
    <motion.div
      style={{
        width: SIDEBAR_WIDTH,
        x: show || resizeConfig.folded === false ? 0 : -SIDEBAR_WIDTH,
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
        <Avatar
          src={user.avatar}
          email={user.email}
          size={36}
          className={css`
            background: ${ThemingVariables.colors.gray[0]};
          `}
        />
      </div>
    </>
  )
}
