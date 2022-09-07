import {
  useConnectorsList,
  useWorkspaceDetail,
  useWorkspacePreferencesUpdate,
  useWorkspaceUpdate
} from '@app/hooks/api'
import { useLoggedUser } from '@app/hooks/useAuth'
import { ThemingVariables } from '@app/styles'
import type { Workspace } from '@app/types'
import { fileLoader } from '@app/utils'
import { uploadFile } from '@app/utils/upload'
import { css } from '@emotion/css'
import { pick } from 'lodash'
import { useCallback, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { FormButton } from './kit/FormButton'
import FormError from './kit/FormError'
import FormFileButton from './kit/FormFileButton'
import FormInput from './kit/FormInput'
import FormLabel from './kit/FormLabel'
import FormSelect from './kit/FormSelect'

export function WorkspacePreferences(props: { onClose(): void }) {
  const { data: workspace, refetch } = useWorkspaceDetail()
  const { register, reset, watch, setValue, handleSubmit } = useForm<
    Pick<Workspace, 'avatar' | 'name' | 'preferences'>
  >({
    defaultValues: pick(workspace, ['avatar', 'name', 'preferences']),
    mode: 'onBlur'
  })
  const { data: connectors } = useConnectorsList()

  useEffect(() => {
    if (workspace) {
      reset(pick(workspace, ['avatar', 'name', 'preferences']))
    }
  }, [workspace, reset])
  const handleWorkspaceUpdate = useWorkspaceUpdate()
  const handleWorkspacePreferencesUpdate = useWorkspacePreferencesUpdate()
  const submit = useCallback(
    (args) => {
      handleWorkspaceUpdate.execute(args)
      handleWorkspacePreferencesUpdate.execute(args.preferences)
    },
    [handleWorkspacePreferencesUpdate, handleWorkspaceUpdate]
  )
  const { onClose } = props
  useEffect(() => {
    if (handleWorkspaceUpdate.status === 'success') {
      onClose()
      refetch()
    }
  }, [handleWorkspaceUpdate.status, onClose, refetch])
  const user = useLoggedUser()
  const me = useMemo(() => workspace?.members.find(({ userId }) => userId === user.id), [user.id, workspace?.members])
  const avatar = watch('avatar')
  const disabled = me?.role !== 'admin'

  return (
    <form
      className={css`
        flex: 1;
        height: 100%;
        padding: 30px 32px 16px;
        display: flex;
        flex-direction: column;
      `}
      onSubmit={handleSubmit(submit)}
    >
      <h2
        className={css`
          font-weight: 600;
          font-size: 16px;
          line-height: 19px;
          margin: 0;
          color: ${ThemingVariables.colors.text[0]};
        `}
      >
        Workspace Preferences
      </h2>
      <div
        className={css`
          padding: 24px 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid ${ThemingVariables.colors.gray[1]};
          margin-bottom: 20px;
        `}
      >
        <img
          src={avatar}
          className={css`
            width: 70px;
            height: 70px;
            background: ${ThemingVariables.colors.gray[1]};
            border-radius: 16px;
          `}
        />
        <FormFileButton
          accept="image/*"
          variant="secondary"
          onChange={async (file) => {
            if (!file || !workspace) {
              return
            }
            const { key } = await uploadFile(file, workspace.id)
            setValue('avatar', fileLoader({ src: key, workspaceId: workspace.id }))
          }}
          disabled={disabled}
        >
          Upload Photo
        </FormFileButton>
      </div>
      <FormLabel>Name</FormLabel>
      <FormInput
        {...register('name')}
        disabled={disabled}
        className={css`
          margin-bottom: 20px;
        `}
      />
      <FormLabel>Default Connector</FormLabel>
      <FormSelect
        className={css`
          width: 100%;
          margin-bottom: 20px;
        `}
        {...register('preferences.connectorId')}
      >
        {connectors?.map((connector) => (
          <option key={connector.id} value={connector.id}>
            {connector.name}
          </option>
        ))}
      </FormSelect>
      <FormLabel>DB imports to</FormLabel>
      <FormInput {...register('preferences.dbImportsTo')} />
      <div
        className={css`
          flex: 1;
        `}
      />
      <FormError message={(handleWorkspaceUpdate.error?.response?.data as any)?.errMsg} />
      <FormError message={(handleWorkspacePreferencesUpdate.error?.response?.data as any)?.errMsg} />

      <FormButton
        type="submit"
        variant="primary"
        className={css`
          width: 100%;
          margin-top: 5px;
        `}
        disabled={disabled}
        loading={handleWorkspaceUpdate.status === 'pending' || handleWorkspacePreferencesUpdate.status === 'pending'}
      >
        Update
      </FormButton>
    </form>
  )
}
