import UserAccount from '@app/components/UserAccount'
import { useOnClickOutside } from '@app/hooks'
import { useLoggedUser } from '@app/hooks/useAuth'
import { ThemingVariables } from '@app/styles'
import { PopoverMotionVariants } from '@app/styles/animations'
import { css, cx } from '@emotion/css'
import { motion } from 'framer-motion'
import { useRef, useState } from 'react'
import UserPassword from './UserPassword'

enum Tabs {
  Account = 'Account',
  Password = 'Password'
}

export function UserModal(props: { onClose(): void }) {
  const user = useLoggedUser()
  const [tab, setTab] = useState(Tabs.Account)
  const ref = useRef(null)
  useOnClickOutside(ref, props.onClose)

  return (
    <motion.div
      initial={'inactive'}
      animate={'active'}
      exit={'inactive'}
      transition={{ type: 'ease' }}
      variants={PopoverMotionVariants.fade}
      className={css`
        position: fixed;
        top: 0;
        bottom: 0;
        left: 0;
        right: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        background-color: rgba(0, 0, 0, 0.5);
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
              white-space: nowrap;
            `}
          >
            {user.email}
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
        {tab === Tabs.Account ? <UserAccount onClose={props.onClose} /> : null}
        {tab === Tabs.Password ? <UserPassword onClose={props.onClose} /> : null}
      </div>
    </motion.div>
  )
}
