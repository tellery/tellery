import {
  useConnectorsList,
  useConnectorsGetProfileConfigs,
  useConnectorsGetProfile,
  useConnectorsUpsertProfile,
  useWorkspaceDetail
} from '@app/hooks/api'
import { useLoggedUser } from '@app/hooks/useAuth'
import { ThemingVariables } from '@app/styles'
import type { AvailableConfig, ProfileConfig } from '@app/types'
import { css } from '@emotion/css'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useForm, UseFormRegister } from 'react-hook-form'
import { FormButton } from './kit/FormButton'
import FormFileButton from './kit/FormFileButton'
import FormInput from './kit/FormInput'
import FormLabel from './kit/FormLabel'
import FormSelect from './kit/FormSelect'
import FormSwitch from './kit/FormSwitch'

export function WorkspaceDatabases(props: { onClose(): void }) {
  const { onClose } = props
  const handleClose = useCallback(() => {
    onClose()
  }, [onClose])

  return (
    <div
      className={css`
        flex: 1;
        padding: 30px 0 16px;
        height: 100%;
        display: flex;
        flex-direction: column;
      `}
    >
      <h2
        className={css`
          font-weight: 600;
          font-size: 16px;
          line-height: 19px;
          margin: 0;
          padding: 0 32px;
          color: ${ThemingVariables.colors.text[0]};
        `}
      >
        Database Profile
      </h2>

      <Connector onClose={handleClose} />
    </div>
  )
}

function Connector({ onClose }: { onClose(): void }) {
  const { data: connectors } = useConnectorsList()
  const { data: workspace } = useWorkspaceDetail()
  const [currentConnectorId, setCurrentConnectorId] = useState(workspace?.preferences.connectorId)
  const connector = useMemo(
    () => connectors?.find((c) => c.id === currentConnectorId)!,
    [connectors, currentConnectorId]
  )
  const { data: profileConfig, refetch } = useConnectorsGetProfile(currentConnectorId)
  const { register, reset, handleSubmit, watch, setValue } = useForm<ProfileConfig>({
    defaultValues: profileConfig,
    mode: 'onBlur'
  })
  const type = watch('type')
  useEffect(() => {
    reset(profileConfig)
  }, [profileConfig, reset])
  const { data: availableConfigs } = useConnectorsGetProfileConfigs(connector.id)
  const availableConfig = useMemo(() => availableConfigs?.find((ac) => ac.type === type), [availableConfigs, type])
  const handleUpsertProfile = useConnectorsUpsertProfile(connector.id)
  useEffect(() => {
    if (handleUpsertProfile.status === 'success') {
      refetch()
      onClose()
    }
  }, [handleUpsertProfile.status, onClose, refetch])
  const user = useLoggedUser()
  const me = useMemo(() => workspace?.members.find(({ userId }) => userId === user.id), [user.id, workspace?.members])
  const disabled = me?.role !== 'admin'

  return (
    <>
      <div
        className={css`
          flex: 1;
          margin-top: 20px;
          padding: 0 32px;
          overflow-y: auto;
        `}
      >
        <form>
          <FormLabel>Connector</FormLabel>
          <FormSelect
            className={css`
              width: 100%;
              margin-bottom: 20px;
            `}
            onChange={(e) => {
              setCurrentConnectorId(e.target.value)
            }}
            value={currentConnectorId}
          >
            {connectors?.map((connector) => (
              <option key={connector.id} value={connector.id}>
                {connector.name}
              </option>
            ))}
          </FormSelect>
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
          {availableConfig?.configs
            // TODO: disable these keys temporarily
            .filter((config) => !['Dbt Project Name', 'Git Url', 'Public Key'].includes(config.name))
            .map((config) =>
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
      </div>
      <FormButton
        className={css`
          margin: 20px 32px 0;
        `}
        variant="primary"
        onClick={handleSubmit(handleUpsertProfile.execute)}
        disabled={disabled}
        loading={handleUpsertProfile.status === 'pending'}
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
          defaultValue={config.fillHint ? config.hint : undefined}
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
