import {
  useConnectorsList,
  useConnectorsListAvailableConfigs,
  useConnectorsListProfiles,
  useConnectorsUpsertProfile
} from '@app/hooks/api'
import type { AvailableConfig, ProfileConfig } from '@app/types'
import { css } from '@emotion/css'
import { useMemo, useEffect } from 'react'
import { useForm, UseFormRegister } from 'react-hook-form'
import FormInput from './kit/FormInput'
import FormLabel from './kit/FormLabel'
import FormSelect from './kit/FormSelect'
import FormSwitch from './kit/FormSwitch'
import { FormButton } from './kit/FormButton'
import { ThemingVariables } from '@app/styles'

export function WorkspaceDatabases(props: { onClose(): void }) {
  const { data: connectors } = useConnectorsList()

  if (!connectors?.[0]) {
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
      <Connector key={connectors[0].id} {...connectors[0]} onClose={props.onClose} />
    </div>
  )
}

function Connector(props: { id: string; url: string; name: string; onClose(): void }) {
  const { data: profileConfigs } = useConnectorsListProfiles(props.id)
  const { register, reset, handleSubmit, watch } = useForm<ProfileConfig>({
    defaultValues: profileConfigs?.[0],
    mode: 'all'
  })
  const type = watch('type')
  useEffect(() => {
    reset(profileConfigs?.[0])
  }, [profileConfigs, reset])
  console.log(type, profileConfigs?.[0])
  const { data: availableConfigs } = useConnectorsListAvailableConfigs(props.id)
  const availableConfig = useMemo(() => availableConfigs?.find((ac) => ac.type === type), [availableConfigs, type])
  const handleUpsertProfile = useConnectorsUpsertProfile(props.id)
  const { onClose } = props
  useEffect(() => {
    if (handleUpsertProfile.status === 'success') {
      onClose()
    }
  }, [handleUpsertProfile.status, onClose])

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
          overflow-y: scroll;
        `}
      >
        <FormLabel required={true}>Type</FormLabel>
        <FormSelect
          className={css`
            width: 100%;
          `}
          value={type}
          {...register('type')}
        >
          {availableConfigs?.map((availableConfig) => (
            <option key={availableConfig.type} value={availableConfig.type}>
              {availableConfig.type}
            </option>
          ))}
        </FormSelect>
        <FormLabel
          required={true}
          className={css`
            margin-top: 20px;
          `}
        >
          Name
        </FormLabel>
        <FormInput {...register('name')} />
        {availableConfig?.configs
          .filter((config) => config.required)
          .map((config) => (
            <Config key={config.name} value={config} register={register} />
          ))}
        <FormLabel
          className={css`
            margin-top: 20px;
          `}
        >
          Username
        </FormLabel>
        <FormInput {...register('auth.username')} />
        <FormLabel
          className={css`
            margin-top: 20px;
          `}
        >
          Password
        </FormLabel>
        <FormInput {...register('auth.password')} type="password" />
        {availableConfig?.configs
          .filter((config) => !config.required)
          .map((config) => (
            <Config key={config.name} value={config} register={register} />
          ))}
      </form>
      <FormButton
        className={css`
          margin-top: 20px;
        `}
        variant="primary"
        onClick={handleSubmit(handleUpsertProfile.execute)}
        disabled={handleUpsertProfile.status === 'pending'}
      >
        Update
      </FormButton>
    </>
  )
}

function Config(props: { value: AvailableConfig; register: UseFormRegister<ProfileConfig> }) {
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
        <FormSwitch {...register(`configs.${config.name}`)} />
      ) : (
        <FormInput
          {...register(`configs.${config.name}`)}
          required={config.required}
          type={config.secret ? 'password' : config.type === 'NUMBER' ? 'number' : 'text'}
          placeholder={config.hint}
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
