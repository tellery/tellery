import { useConnectorsList, useConnectorsListAvailableConfigs, useConnectorsListProfiles } from '@app/hooks/api'
import { ThemingVariables } from '@app/styles'
import type { ProfileConfig } from '@app/types'
import { css } from '@emotion/css'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'

export function WorkspaceDatabases() {
  const { data: connectors } = useConnectorsList()

  return (
    <div
      className={css`
        flex: 1;
        padding: 30px 32px 16px;
        height: 100%;
        overflow-y: scroll;
      `}
    >
      {connectors?.map((connector) => (
        <Connector key={connector.id} {...connector} />
      ))}
    </div>
  )
}

function Connector(props: { id: string; url: string; name: string }) {
  const { data: profileConfigs } = useConnectorsListProfiles(props.id)
  const { register, reset, getValues, setValue, handleSubmit } = useForm<ProfileConfig>({
    defaultValues: profileConfigs?.[0],
    mode: 'all'
  })
  useEffect(() => {
    reset(profileConfigs?.[0])
  }, [profileConfigs, reset])
  const { data: availableConfigs } = useConnectorsListAvailableConfigs(props.id)

  if (!availableConfigs) {
    return null
  }
  return (
    <div>
      <h2
        className={css`
          font-weight: 600;
          font-size: 16px;
          line-height: 19px;
          margin: 0;
          color: ${ThemingVariables.colors.text[0]};
        `}
      >
        {props.name}
      </h2>
      <form>
        <select {...register('type')}>
          {availableConfigs.map((availableConfig) => (
            <option key={availableConfig.type} value={availableConfig.type}>
              {availableConfig.type}
            </option>
          ))}
        </select>
        {availableConfigs.map((availableConfig) => (
          <fieldset key={availableConfig.type}>{JSON.stringify(availableConfig)}</fieldset>
        ))}
      </form>
    </div>
  )
}
