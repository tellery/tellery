import { useLoggedUser } from '@app/hooks/useAuth'
import { useBlockTranscations } from '@app/hooks/useBlockTranscation'
import { useCommit } from '@app/hooks/useCommit'
import { css, cx } from '@emotion/css'
import { IconCommonCopy, IconCommonLock, IconMenuDelete, IconMenuDuplicate, IconMenuShow } from 'assets/icons'
import FormSwitch from 'components/kit/FormSwitch'
import { MenuItem } from 'components/MenuItem'
import { MenuItemDivider } from 'components/MenuItemDivider'
import { createTranscation } from 'context/editorTranscations'
import copy from 'copy-to-clipboard'
import dayjs from 'dayjs'
import { useOpenStory } from 'hooks'
import { useUser } from 'hooks/api'
import { nanoid } from 'nanoid'
import React, { useCallback } from 'react'
import { useHistory } from 'react-router-dom'
import { toast } from 'react-toastify'
import { ThemingVariables } from 'styles'
import type { Permission, PermissionEntityRole, Story } from 'types'
import Icon from './kit/Icon'

const upsertPermission = (permissions: Permission[], permission: Permission): Permission[] => {
  const filteredPermission = permissions.filter(
    (oldPermission) => (oldPermission.type === permission.type && oldPermission.id === permission.id) === false
  )

  return [...filteredPermission, permission]
}

export const StoryConfigPopOver: React.FC<{
  story: Story
}> = (props) => {
  const commit = useCommit()
  const blockTranscation = useBlockTranscations()
  const { story } = props
  const { data: createdBy } = useUser(story?.createdById ?? null)
  const { data: lastEditedBy } = useUser(story?.lastEditedById ?? null)
  const user = useLoggedUser()
  const history = useHistory()
  const setWorkspacePermission = useCallback(
    async (role: PermissionEntityRole) => {
      if (!user) return
      const permissions = upsertPermission(
        upsertPermission(story?.permissions ?? [], {
          role,
          type: 'workspace'
        } as Permission),
        {
          role: 'manager',
          id: user.id,
          type: 'user'
        } as Permission
      )

      await blockTranscation.updateBlockPermissions(story.id, permissions)
    },
    [blockTranscation, story.id, story?.permissions, user]
  )
  const openStory = useOpenStory()

  const setStoryFormat = useCallback(
    async (key: string, value: boolean | string) => {
      const newFormat = {
        ...story?.format,
        [key]: value
      }
      await commit({
        storyId: story.id,
        transcation: createTranscation({
          operations: [{ cmd: 'update', path: ['format'], args: newFormat, table: 'block', id: story.id }]
        })
      })
    },
    [story, commit]
  )

  const duplicateStoryHandler = useCallback(
    async (e) => {
      const newStoryId = nanoid()
      await blockTranscation.duplicateStory(story.id, newStoryId)
      openStory(newStoryId, { isAltKeyPressed: e.altKey })
      toast.success('Story Copied')
    },
    [blockTranscation, openStory, story.id]
  )

  const readOnlyStatus = !!story?.permissions?.some((permission) => {
    return permission.type === 'workspace' && permission.role === 'commentator'
  })

  return (
    <div
      className={cx(
        css`
          background: ${ThemingVariables.colors.gray[5]};
          box-shadow: ${ThemingVariables.boxShadows[0]};
          border-radius: 8px;
          padding: 8px;
          width: 260px;
          display: block;
          cursor: pointer;
        `
      )}
    >
      <MenuItem
        icon={<Icon icon={IconCommonLock} color={ThemingVariables.colors.text[0]} />}
        title="Lock"
        onClick={(e) => {
          e.preventDefault()
          setStoryFormat('locked', !story?.format?.locked)
        }}
        side={<FormSwitch checked={!!story?.format?.locked} />}
      />
      <MenuItem
        icon={<Icon icon={IconCommonCopy} color={ThemingVariables.colors.text[0]} />}
        title="Copy link"
        onClick={() => {
          copy(window.location.href)
          toast.success('Link Copied')
          // setOpen(false)
        }}
      />
      <MenuItem
        icon={<Icon icon={IconMenuDuplicate} color={ThemingVariables.colors.text[0]} />}
        title="Duplicate"
        onClick={duplicateStoryHandler}
      />
      <MenuItem
        icon={<Icon icon={IconMenuShow} color={ThemingVariables.colors.text[0]} />}
        title="Readonly"
        onClick={(e) => {
          e.preventDefault()
          setWorkspacePermission(readOnlyStatus ? 'manager' : 'commentator')
        }}
        side={<FormSwitch checked={readOnlyStatus} />}
      />
      {import.meta.env.DEV && (
        <MenuItem
          icon={<Icon icon={IconMenuShow} color={ThemingVariables.colors.text[0]} />}
          title="Show border"
          onClick={(e) => {
            e.preventDefault()
            setStoryFormat('showBorder', !story?.format?.showBorder)
          }}
          side={<FormSwitch checked={!!story?.format?.showBorder} />}
        />
      )}
      <MenuItemDivider />
      <MenuItem
        icon={<Icon icon={IconMenuDelete} color={ThemingVariables.colors.negative[0]} />}
        title={
          <span
            className={css`
              color: ${ThemingVariables.colors.negative[0]};
            `}
          >
            Delete
          </span>
        }
        onClick={async () => {
          if (confirm(`Delete story?`)) {
            await blockTranscation.deleteStory(props.story.id)
            history.push('/stories')
          }
        }}
      />
      <MenuItemDivider />
      {story?.lastEditedById && (
        <div
          className={css`
            color: ${ThemingVariables.colors.text[1]};
            font-size: 12px;
            padding: 5px 10px 0 10px;
          `}
        >
          Last edited by {lastEditedBy?.name}
          <br />
          {dayjs(story.updatedAt).format('YYYY-MM-DD')}
          <br />
          Created by {createdBy?.name}
          <br />
          {dayjs(story.createdAt).format('YYYY-MM-DD')}
        </div>
      )}
    </div>
  )
}
