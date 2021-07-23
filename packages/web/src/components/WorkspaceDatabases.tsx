import {
  useConnectorsList,
  useConnectorsListAvailableConfigs,
  useConnectorsListProfiles,
  useConnectorsUpsertProfile,
  useWorkspaceDetail
} from '@app/hooks/api'
import type { AvailableConfig, ProfileConfig } from '@app/types'
import { css } from '@emotion/css'
import { useMemo, useEffect, useCallback } from 'react'
import { useForm, UseFormRegister } from 'react-hook-form'
import FormInput from './kit/FormInput'
import FormLabel from './kit/FormLabel'
import FormSelect from './kit/FormSelect'
import FormSwitch from './kit/FormSwitch'
import { FormButton } from './kit/FormButton'
import { ThemingVariables } from '@app/styles'
import { useLoggedUser } from '@app/hooks/useAuth'
import FormFileButton from './kit/FormFileButton'

export function WorkspaceDatabases(props: { onClose(): void }) {
  const { data: connectors, refetch } = useConnectorsList()
  const connector = connectors?.[0]
  const { onClose } = props
  const handleClose = useCallback(() => {
    refetch()
    onClose()
  }, [onClose, refetch])

  if (!connector) {
    return null
  }
  return (
    <div
      className={css`
        flex: 1;
        padding: 30px 32px 16px;
        height: 100%;
        display: flex;
        flex-direction: column;
      `}
    >
      <Connector {...connector} onClose={handleClose} />
    </div>
  )
}

function Connector(props: { id: string; url: string; name: string; onClose(): void }) {
  const { data: profileConfigs, refetch } = useConnectorsListProfiles(props.id)
  const profileConfig = profileConfigs?.[0]
  const { register, reset, handleSubmit, watch, setValue } = useForm<ProfileConfig>({
    defaultValues: profileConfig,
    mode: 'onBlur'
  })
  const type = watch('type')
  useEffect(() => {
    reset(profileConfig)
  }, [profileConfig, reset])
  const { data: availableConfigs } = useConnectorsListAvailableConfigs(props.id)
  const availableConfig = useMemo(() => availableConfigs?.find((ac) => ac.type === type), [availableConfigs, type])
  const handleUpsertProfile = useConnectorsUpsertProfile(props.id)
  const { onClose } = props
  useEffect(() => {
    if (handleUpsertProfile.status === 'success') {
      refetch()
      onClose()
    }
  }, [handleUpsertProfile.status, onClose, refetch])
  const user = useLoggedUser()
  const { data: workspace } = useWorkspaceDetail()
  const me = useMemo(() => workspace?.members.find(({ userId }) => userId === user.id), [user.id, workspace?.members])
  const disabled = me?.role !== 'admin'

  return (
    <>
      <h2
        className={css`
          font-weight: 600;
          font-size: 16px;
          line-height: 19px;
          margin: 0;
          color: ${ThemingVariables.colors.text[0]};
        `}
      >
        Database Profile
      </h2>
      <form
        className={css`
          flex: 1;
          margin-top: 20px;
          overflow-y: auto;
        `}
      >
        <FormLabel required={true}>Type</FormLabel>
        <FormSelect
          className={css`
            width: 100%;
          `}
          value={type}
          {...(disabled ? {} : register('type'))}
          onChange={(e) => {
            reset({
              type: e.target.value,
              name: profileConfig?.name,
              ...(profileConfig?.type === e.target.value ? profileConfig : {})
            })
          }}
          disabled={disabled}
        >
          {availableConfigs?.map((availableConfig) => (
            <option key={availableConfig.type} value={availableConfig.type}>
              {availableConfig.type}
            </option>
          ))}
        </FormSelect>
        {/* <FormLabel
          required={true}
          className={css`
            margin-top: 20px;
          `}
        >
          Name
        </FormLabel>
        <FormInput {...register('name')} /> */}
        {availableConfig?.configs.map((config) =>
          config.type === 'FILE' ? (
            <FileConfig
              key={config.name}
              value={config}
              setValue={(value) => {
                setValue(`configs.${config.name}`, value)
              }}
              disabled={disabled}
            />
          ) : (
            <Config key={config.name} value={config} register={register} disabled={disabled} />
          )
        )}
      </form>
      <FormButton
        className={css`
          margin-top: 20px;
        `}
        variant="primary"
        onClick={handleSubmit(handleUpsertProfile.execute)}
        disabled={handleUpsertProfile.status === 'pending' || disabled}
      >
        Update
      </FormButton>
    </>
  )
}

function FileConfig(props: { value: AvailableConfig; setValue: (value: string) => void; disabled: boolean }) {
  const { value: config } = props

  return (
    <>
      <FormLabel
        required={config.required}
        className={css`
          margin-top: 20px;
        `}
      >
        {config.name}
      </FormLabel>
      <FormFileButton
        variant="secondary"
        onChange={async (file) => {
          if (file) {
            props.setValue(btoa(String.fromCharCode(...new Uint8Array(await file.arrayBuffer()))))
          }
        }}
        disabled={props.disabled}
        className={css`
          width: 100%;
        `}
      >
        {props.value.hint}
      </FormFileButton>
      <span
        className={css`
          font-size: 12px;
          line-height: 14px;
          color: ${ThemingVariables.colors.text[2]};
          margin-top: 5px;
          display: block;
        `}
      >
        {config.description}
      </span>
    </>
  )
}

function Config(props: { value: AvailableConfig; register: UseFormRegister<ProfileConfig>; disabled: boolean }) {
  const { value: config, register } = props

  return (
    <>
      <FormLabel
        required={config.required}
        className={css`
          margin-top: 20px;
        `}
      >
        {config.name}
      </FormLabel>
      {config.type === 'BOOLEAN' ? (
        <FormSwitch {...register(`configs.${config.name}`)} disabled={props.disabled} />
      ) : (
        <FormInput
          {...register(`configs.${config.name}`)}
          // @see https://developer.mozilla.org/en-US/docs/Web/Security/Securing_your_site/Turning_off_form_autocompletion#preventing_autofilling_with_autocompletenew-password
          autoComplete="new-password"
          required={config.required}
          type={config.secret ? 'password' : config.type === 'NUMBER' ? 'number' : 'text'}
          placeholder={config.hint}
          disabled={props.disabled}
        />
      )}
      <span
        className={css`
          font-size: 12px;
          line-height: 14px;
          color: ${ThemingVariables.colors.text[2]};
          margin-top: 5px;
          display: block;
        `}
      >
        {config.description}
      </span>
    </>
  )
}
