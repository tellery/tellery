import { WorkspaceDatabases } from '@app/components/WorkspaceDatabases'
import { WorkspaceMembers } from '@app/components/WorkspaceMembers'
import { WorkspacePreferences } from '@app/components/WorkspacePreferences'
import { useOnClickOutside } from '@app/hooks'
import { ThemingVariables } from '@app/styles'
import { css, cx } from '@emotion/css'
import { motion } from 'framer-motion'
import React, { useRef, useState } from 'react'

enum Tabs {
  Preferences = 'Preferences',
  Members = 'Members',
  Databases = 'Databases'
}

interface ModalProps {
  openForProfiles?: boolean
  onClose(): void
}

export function WorkspaceModal(props: ModalProps) {
  const [tab, setTab] = useState(props.openForProfiles ? Tabs.Databases : Tabs.Preferences)
  const ref = useRef(null)
  useOnClickOutside(ref, props.onClose)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      exit={{ opacity: 0 }}
      className={css`
        position: fixed;
        top: 0;
        bottom: 0;
        left: 0;
        right: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        background-color: rgba(16, 22, 26, 0.2);
        z-index: 9999999999;
      `}
    >
      <div
        ref={ref}
        className={css`
          width: 716px;
          height: 556px;
          background: ${ThemingVariables.colors.gray[5]};
          border-radius: 20px;
          display: flex;
          box-shadow: ${ThemingVariables.boxShadows[0]};
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 99999;
        `}
      >
        <div
          className={css`
            width: 232px;
            padding: 32px 16px;
            border-right: 1px solid ${ThemingVariables.colors.gray[1]};
          `}
        >
          <h1
            className={css`
              font-size: 14px;
              line-height: 16px;
              font-style: normal;
              font-weight: normal;
              margin: 0;
              color: ${ThemingVariables.colors.text[1]};
              overflow: hidden;
              text-overflow: ellipsis;
            `}
          >
            Tellery
          </h1>
          <ul
            className={css`
              list-style-type: none;
              padding-inline-start: 0;
              margin: 20px 0 0 0;
            `}
          >
            {Object.values(Tabs).map((t) => (
              <li
                key={t}
                className={cx(
                  css`
                    width: 200px;
                    height: 36px;
                    padding: 10px;
                    margin-top: 10px;
                    font-size: 14px;
                    line-height: 16px;
                    border-radius: 8px;
                    cursor: pointer;
                  `,
                  t === tab
                    ? css`
                        color: ${ThemingVariables.colors.gray[5]};
                        background: ${ThemingVariables.colors.primary[1]};
                      `
                    : css`
                        color: ${ThemingVariables.colors.text[0]};
                      `
                )}
                onClick={() => {
                  setTab(t)
                }}
              >
                {t}
              </li>
            ))}
          </ul>
        </div>
        {tab === Tabs.Preferences ? <WorkspacePreferences onClose={props.onClose} /> : null}
        {tab === Tabs.Members ? <WorkspaceMembers onClose={props.onClose} /> : null}
        {tab === Tabs.Databases ? <WorkspaceDatabases onClose={props.onClose} /> : null}
      </div>
    </motion.div>
  )
}
