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
  const { data: profiles } = useConnectorsListProfiles(props.id)
  const profile = profiles?.[0]
  const { data } = useConnectorsListAvailableConfigs(props.id)
  console.log(data)

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
      <pre
        key={profile.name}
        className={css`
          font-size: 13px;
          line-height: 16px;
          white-space: pre-wrap;
          word-break: break-all;
          background-color: ${ThemingVariables.colors.gray[3]};
          margin: 20px 0 0 0;
          padding: 10px;
          border-radius: 10px;
        `}
      >
        {JSON.stringify(profile, null, 2)}
      </pre>
    </div>
  )
}
