import { useConnectorsList, useConnectorsListAvailableConfigs, useConnectorsListProfiles } from '@app/hooks/api'
import { ThemingVariables } from '@app/styles'
import { css } from '@emotion/css'

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
  const profile = profileConfigs?.[0]
  const { data: availableConfigs } = useConnectorsListAvailableConfigs(props.id)

  if (!profile) {
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
        {availableConfigs?.map((availableConfig) => (
          <fieldset key={availableConfig.type}>{JSON.stringify(availableConfig)}</fieldset>
        ))}
      </form>
    </div>
  )
}
