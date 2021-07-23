import { IconCommonArrowDropDown, IconCommonArrowLeft } from '@app/assets/icons'
import {
  useMgetUsers,
  User,
  useWorkspaceDetail,
  useWorkspaceInviteMembers,
  useWorkspaceKickout,
  useWorkspaceLeave,
  useWorkspaceUpdateRole
} from '@app/hooks/api'
import { useLoggedUser } from '@app/hooks/useAuth'
import { ThemingVariables } from '@app/styles'
import type { Workspace } from '@app/types'
import { css, cx } from '@emotion/css'
import Tippy from '@tippyjs/react'
import copy from 'copy-to-clipboard'
import { compact, map } from 'lodash'
import React, { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import { FormButton } from './kit/FormButton'
import FormInput from './kit/FormInput'
import FormLabel from './kit/FormLabel'
import Icon from './kit/Icon'
import IconButton from './kit/IconButton'
import { MenuItem } from './MenuItem'
import { MenuItemDivider } from './MenuItemDivider'

type Role = Workspace['members'][0]['role']

export function WorkspaceMembers(props: { onClose(): void }) {
  const user = useLoggedUser()
  const { data: workspace, refetch } = useWorkspaceDetail()
  const { data: users } = useMgetUsers(workspace?.members.map(({ userId }) => userId))
  const [invite, setInvite] = useState(false)
  const [visible, setVisible] = useState(false)
  const [role, setRole] = useState<Role>('member')
  const [email, setEmail] = useState('')
  const members = useMemo(() => compact(email.split(',')).map((email) => ({ email, role })), [email, role])
  const handleInviteMembers = useWorkspaceInviteMembers(members)
  const me = useMemo(() => workspace?.members.find(({ userId }) => userId === user.id), [user.id, workspace?.members])
  const { onClose } = props
  useEffect(() => {
    if (handleInviteMembers.status === 'success') {
      onClose()
      toast.success(workspace?.preferences.emailConfig ? 'Invitation links sent' : 'Invitation links copied')
    }
  }, [handleInviteMembers.status, onClose, workspace?.preferences.emailConfig])
  useEffect(() => {
    if (handleInviteMembers.value && !workspace?.preferences.emailConfig) {
      const str = map(handleInviteMembers.value?.linkPairs, (link, email) => `${email} ${link}`).join('\n')
      if (str) {
        copy(str)
      }
    }
  }, [handleInviteMembers.value, workspace?.preferences.emailConfig])
  const disabled = me?.role !== 'admin'

  if (invite) {
    return (
      <div
        className={css`
          flex: 1;
          padding: 30px 32px 16px;
        `}
      >
        <div
          className={css`
            display: flex;
            align-items: center;
            margin-bottom: 24px;
          `}
        >
          <IconButton
            icon={IconCommonArrowLeft}
            color={ThemingVariables.colors.gray[0]}
            className={css`
              cursor: pointer;
              margin-right: 10px;
            `}
            onClick={() => {
              setInvite(false)
            }}
          />
          <h2
            className={css`
              font-weight: 600;
              font-size: 16px;
              line-height: 19px;
              margin: 0;
              color: ${ThemingVariables.colors.text[0]};
            `}
          >
            Invite team member
          </h2>
        </div>
        <FormLabel>Emails</FormLabel>
        <FormInput placeholder="split by comma" value={email} onChange={(e) => setEmail(e.target.value)} />
        <FormLabel
          className={css`
            margin-top: 20px;
          `}
        >
          Permission
        </FormLabel>
        <div
          className={css`
            display: flex;
          `}
        >
          <Tippy
            visible={visible}
            content={
              <div
                className={cx(
                  css`
                    background: ${ThemingVariables.colors.gray[5]};
                    box-shadow: ${ThemingVariables.boxShadows[0]};
                    border-radius: 8px;
                    padding: 8px;
                    width: 200px;
                    display: block;
                  `
                )}
              >
                <MenuItem
                  title="admin"
                  onClick={() => {
                    setRole('admin')
                    setVisible(false)
                  }}
                />
                <MenuItem
                  title="member"
                  onClick={() => {
                    setRole('member')
                    setVisible(false)
                  }}
                />
              </div>
            }
            onClickOutside={() => {
              setVisible(false)
            }}
            theme="tellery"
            animation="fade"
            duration={150}
            arrow={false}
            interactive={true}
            placement="bottom-end"
            popperOptions={{
              modifiers: [
                {
                  name: 'offset',
                  enabled: true,
                  options: {
                    offset: [8, 5]
                  }
                }
              ]
            }}
          >
            <button
              className={css`
                margin-right: 20px;
                flex: 1;
                height: 36px;
                border: 1px solid ${ThemingVariables.colors.gray[1]};
                background: ${ThemingVariables.colors.gray[5]};
                box-sizing: border-box;
                border-radius: 8px;
                padding: 0 8px 0 15px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                font-size: 12px;
                line-height: 14px;
                color: ${ThemingVariables.colors.text[0]};
                cursor: pointer;
              `}
              onClick={() => {
                setVisible(true)
              }}
            >
              {role}
              <Icon icon={IconCommonArrowDropDown} color={ThemingVariables.colors.gray[0]} />
            </button>
          </Tippy>
          <FormButton
            variant="primary"
            className={css`
              flex-shrink: 0;
            `}
            disabled={members.length === 0 || handleInviteMembers.status === 'pending'}
            onClick={handleInviteMembers.execute}
          >
            {workspace?.preferences.emailConfig ? 'Send invitations' : 'Copy invitation links'}
          </FormButton>
        </div>
      </div>
    )
  }
  return (
    <div
      className={css`
        flex: 1;
        height: 100%;
        padding: 30px 32px 16px;
        display: flex;
        flex-direction: column;
      `}
    >
      <div>
        {me?.role === 'admin' ? (
          <span
            className={css`
              float: right;
              font-weight: 600;
              font-size: 14px;
              line-height: 16px;
              color: ${ThemingVariables.colors.primary[1]};
              cursor: pointer;
            `}
            onClick={() => {
              setInvite(true)
            }}
          >
            Invite
          </span>
        ) : null}
        <h2
          className={css`
            font-weight: 600;
            font-size: 16px;
            line-height: 19px;
            margin: 0;
            color: ${ThemingVariables.colors.text[0]};
          `}
        >
          Members & Permissions
        </h2>
      </div>
      <ul
        className={css`
          list-style-type: none;
          padding-inline-start: 0;
          margin: 5px 0 0 0;
          flex: 1;
          height: 0;
          overflow-y: auto;
        `}
      >
        {workspace?.members.map(({ userId, role }) =>
          users?.[userId] ? (
            <WorkspaceMember
              key={userId}
              userId={userId}
              role={role}
              user={users?.[userId]}
              disabled={disabled}
              isMe={me?.userId === userId}
              onClick={refetch}
            />
          ) : null
        )}
      </ul>
    </div>
  )
}

function WorkspaceMember(props: {
  userId: string
  role: Role
  user: User
  disabled: boolean
  isMe: boolean
  onClick(): void
}) {
  const { userId, role, user, onClick } = props
  const [visible, setVisible] = useState(false)
  const handleUpdateRole = useWorkspaceUpdateRole()
  useEffect(() => {
    if (handleUpdateRole.status === 'success') {
      onClick()
    }
  }, [handleUpdateRole.status, onClick])
  const handleKickout = useWorkspaceKickout()
  useEffect(() => {
    if (handleKickout.status === 'success') {
      onClick()
    }
  }, [handleKickout.status, onClick])
  const handleLeave = useWorkspaceLeave()
  useEffect(() => {
    if (handleLeave.status === 'success') {
      onClick()
    }
  }, [handleLeave.status, onClick])

  return (
    <li
      key={userId}
      className={css`
        height: 36px;
        margin: 16px 0;
        display: flex;
        align-items: center;
      `}
    >
      <img
        src={user.avatar}
        width={36}
        height={36}
        className={css`
          border-radius: 100%;
          background-color: ${ThemingVariables.colors.gray[0]};
        `}
      />
      <div
        className={css`
          line-height: 16px;
          margin-left: 10px;
        `}
      >
        <span
          className={css`
            font-size: 14px;
            line-height: 16px;
            color: ${ThemingVariables.colors.text[0]};
          `}
        >
          {user.name}
        </span>
        <br />
        <span
          className={css`
            font-size: 12px;
            line-height: 14px;
            color: ${ThemingVariables.colors.text[1]};
          `}
        >
          {user.email}
        </span>
      </div>
      <div
        className={css`
          flex: 1;
        `}
      />
      <Tippy
        visible={visible}
        content={
          <div
            className={cx(
              css`
                background: ${ThemingVariables.colors.gray[5]};
                box-shadow: ${ThemingVariables.boxShadows[0]};
                border-radius: 8px;
                padding: 8px;
                width: 200px;
                display: block;
              `
            )}
          >
            <MenuItem
              title="admin"
              onClick={() => {
                handleUpdateRole.execute(userId, 'admin')
                setVisible(false)
              }}
            />
            <MenuItem
              title="member"
              onClick={() => {
                handleUpdateRole.execute(userId, 'member')
                setVisible(false)
              }}
            />
            <MenuItemDivider />
            <MenuItem
              title={
                <span
                  className={css`
                    color: ${ThemingVariables.colors.negative[0]};
                  `}
                >
                  {props.isMe ? 'Leave' : 'Remove'}
                </span>
              }
              onClick={() => {
                if (confirm(props.isMe ? 'Leave workspace?' : 'Remove user?')) {
                  if (props.isMe) {
                    handleLeave.execute()
                  } else {
                    handleKickout.execute([userId])
                  }
                  setVisible(false)
                }
              }}
            />
          </div>
        }
        onClickOutside={() => {
          setVisible(false)
        }}
        theme="tellery"
        animation="fade"
        duration={150}
        arrow={false}
        interactive={true}
        placement="bottom-end"
        popperOptions={{
          modifiers: [
            {
              name: 'offset',
              enabled: true,
              options: {
                offset: [10, 5]
              }
            }
          ]
        }}
      >
        <button
          className={css`
            width: 120px;
            height: 28px;
            border: 1px solid ${ThemingVariables.colors.gray[1]};
            background: ${ThemingVariables.colors.gray[5]};
            box-sizing: border-box;
            border-radius: 8px;
            padding: 0 8px 0 15px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 12px;
            line-height: 14px;
            color: ${ThemingVariables.colors.text[0]};
            cursor: pointer;
            &:disabled {
              cursor: not-allowed;
              color: ${ThemingVariables.colors.text[1]};
              background-color: ${ThemingVariables.colors.gray[3]};
              border: 1px solid ${ThemingVariables.colors.gray[1]};
            }
          `}
          disabled={props.disabled}
          onClick={() => {
            setVisible(true)
          }}
        >
          {role}
          <Icon icon={IconCommonArrowDropDown} color={ThemingVariables.colors.gray[0]} />
        </button>
      </Tippy>
    </li>
  )
}
