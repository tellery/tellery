import { useConnectorsList, useConnectorsListAvailableConfigs, useConnectorsListProfiles } from '@app/hooks/api'
import { ThemingVariables } from '@app/styles'
import { css } from '@emotion/css'

export function WorkspaceDatabases() {
  const { data: connectors } = useConnectorsList()
  const { data } = useConnectorsListAvailableConfigs(connectors?.[0].id)
  console.log(data)

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
  const { data } = useConnectorsListProfiles(props.id)

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
      {data?.map((item) => (
        <pre
          key={item.name}
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
          {JSON.stringify(item, null, 2)}
        </pre>
      ))}
    </div>
  )
}
