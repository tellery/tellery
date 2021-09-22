import {
  IconCommonCopy,
  IconCommonLock,
  IconCommonRefresh,
  IconMenuDelete,
  IconMenuDuplicate,
  IconMenuShow
} from '@app/assets/icons'
import FormSwitch from '@app/components/kit/FormSwitch'
import { MenuItem } from '@app/components/MenuItem'
import { MenuItemDivider } from '@app/components/MenuItemDivider'
import { createTranscation } from '@app/context/editorTranscations'
import { env } from '@app/env'
import { useOpenStory } from '@app/hooks'
import { useBlockSuspense, useUser } from '@app/hooks/api'
import { useLoggedUser } from '@app/hooks/useAuth'
import { useBlockTranscations } from '@app/hooks/useBlockTranscation'
import { useCommit } from '@app/hooks/useCommit'
import { useStoryPermissions } from '@app/hooks/useStoryPermissions'
import { ThemingVariables } from '@app/styles'
import type { Permission, PermissionEntityRole, Story } from '@app/types'
import { blockIdGenerator } from '@app/utils'
import { css, cx } from '@emotion/css'
import Tippy from '@tippyjs/react'
import copy from 'copy-to-clipboard'
import dayjs from 'dayjs'
import { AnimationControls, motion, MotionStyle } from 'framer-motion'
import React, { useCallback } from 'react'
import { useHistory } from 'react-router-dom'
import { toast } from 'react-toastify'

const upsertPermission = (permissions: Permission[], permission: Permission): Permission[] => {
  const filteredPermission = permissions.filter(
    (oldPermission) => (oldPermission.type === permission.type && oldPermission.id === permission.id) === false
  )

  return [...filteredPermission, permission]
}

const removePermission = (permissions: Permission[], permission: Permission): Permission[] => {
  const filteredPermission = permissions.filter(
    (oldPermission) => (oldPermission.type === permission.type && oldPermission.id === permission.id) === false
  )

  return filteredPermission
}

export const StoryConfigPopOver: React.FC<{
  storyId: string
  style?: MotionStyle
  animate?: AnimationControls
}> = (props) => {
  const commit = useCommit()
  const blockTranscation = useBlockTranscations()
  const story = useBlockSuspense<Story>(props.storyId)
  const { data: createdBy } = useUser(story?.createdById ?? null)
  const { data: lastEditedBy } = useUser(story?.lastEditedById ?? null)
  const user = useLoggedUser()
  const history = useHistory()
  const permissions = useStoryPermissions(story.id)

  const setWorkspacePermission = useCallback(
    async (role: PermissionEntityRole | null) => {
      if (!permissions.canWrite) {
        return
      }
      if (!user) return
      if (role) {
        const newPermissions = upsertPermission(
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
        await blockTranscation.updateBlockPermissions(story.id, newPermissions)
      } else {
        const newPermissions = upsertPermission(
          removePermission(story?.permissions ?? [], {
            type: 'workspace'
          } as Permission),
          {
            role: 'manager',
            id: user.id,
            type: 'user'
          } as Permission
        )
        await blockTranscation.updateBlockPermissions(story.id, newPermissions)
      }
    },
    [blockTranscation, story.id, story?.permissions, user, permissions]
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

  const duplicateStoryHandler = useCallback(async () => {
    const newStoryId = blockIdGenerator()
    await blockTranscation.duplicateStory(story.id, newStoryId)
    openStory(newStoryId)
    toast.success('Story copied')
  }, [blockTranscation, openStory, story.id])

  const readOnlyStatus = !!story?.permissions?.some((permission) => {
    return permission.type === 'workspace' && permission.role === 'commentator'
  })

  const privateStatus =
    !!story?.permissions?.some((permission) => {
      return permission.type === 'workspace'
    }) === false

  return (
    <motion.div
      style={props.style}
      animate={props.animate}
      transition={{ duration: 0.15 }}
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
      {permissions.canWrite && (
        <>
          <MenuItem
            icon={<IconCommonRefresh color={ThemingVariables.colors.text[0]} />}
            title="Refresh on open"
            onClick={(e) => {
              e.preventDefault()
              setStoryFormat('refreshOnOpen', !story?.format?.refreshOnOpen)
            }}
            side={<FormSwitch checked={!!story?.format?.refreshOnOpen} readOnly />}
          />
          <MenuItem
            icon={<IconCommonLock color={ThemingVariables.colors.text[0]} />}
            title="Lock"
            onClick={(e) => {
              e.preventDefault()
              setStoryFormat('locked', !story?.format?.locked)
            }}
            side={<FormSwitch checked={!!story?.format?.locked} readOnly />}
          />
        </>
      )}

      <MenuItem
        icon={<IconCommonCopy color={ThemingVariables.colors.text[0]} />}
        title="Copy link"
        onClick={() => {
          copy(window.location.href)
          toast.success('Link copied')
          // setOpen(false)
        }}
      />
      <MenuItem
        icon={<IconMenuDuplicate color={ThemingVariables.colors.text[0]} />}
        title="Duplicate"
        onClick={duplicateStoryHandler}
      />
      {permissions.canWrite && (
        <MenuItem
          icon={<IconMenuShow color={ThemingVariables.colors.text[0]} />}
          title="Workspace readonly"
          onClick={(e) => {
            e.preventDefault()
            setWorkspacePermission(readOnlyStatus ? 'manager' : 'commentator')
          }}
          side={<FormSwitch checked={readOnlyStatus} readOnly disabled={!permissions.canWrite} />}
        />
      )}
      {permissions.canWrite && story.createdById === user.id && (
        <Tippy content="Only you can view or edit this story" placement="left" delay={500} arrow={false}>
          <MenuItem
            icon={<IconMenuShow color={ThemingVariables.colors.text[0]} />}
            title="Private"
            onClick={(e) => {
              e.preventDefault()
              setWorkspacePermission(privateStatus ? 'manager' : null)
            }}
            side={<FormSwitch checked={privateStatus} readOnly disabled={!permissions.canWrite} />}
          />
        </Tippy>
      )}

      {env.DEV && (
        <MenuItem
          icon={<IconMenuShow color={ThemingVariables.colors.text[0]} />}
          title="Show border (DEV)"
          onClick={(e) => {
            e.preventDefault()
            setStoryFormat('showBorder', !story?.format?.showBorder)
          }}
          side={<FormSwitch checked={!!story?.format?.showBorder} readOnly />}
        />
      )}
      {permissions.canWrite && (
        <>
          <MenuItemDivider />
          <MenuItem
            icon={<IconMenuDelete color={ThemingVariables.colors.negative[0]} />}
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
                await blockTranscation.deleteStory(props.storyId)
                history.push('/stories')
              }
            }}
          />
        </>
      )}
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
    </motion.div>
  )
}
