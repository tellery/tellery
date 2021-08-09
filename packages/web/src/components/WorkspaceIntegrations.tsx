import { IconCommonArrowLeft } from '@app/assets/icons'
import { useConnectorsList, useConnectorsListProfiles, useGenerateKeyPair } from '@app/hooks/api'
import { ThemingVariables } from '@app/styles'
import type { ProfileConfig } from '@app/types'
import { css } from '@emotion/css'
import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { FormButton } from './kit/FormButton'
import FormInput from './kit/FormInput'
import FormLabel from './kit/FormLabel'
import IconButton from './kit/IconButton'

enum Integration {
  DBT = 'DBT'
}

export function WorkspaceIntegrations(props: { onClose(): void }) {
  const [integration, setIntegration] = useState<Integration>()
  const { data: connectors } = useConnectorsList()
  const connector = connectors?.[0]

  return connector ? (
    <div
      className={css`
        flex: 1;
        height: 100%;
        padding: 30px 32px 16px;
        display: flex;
        flex-direction: column;
      `}
    >
      {integration ? null : (
        <div>
          <h2
            className={css`
              font-weight: 600;
              font-size: 16px;
              line-height: 20px;
              margin: 0;
              margin-bottom: 20px;
              color: ${ThemingVariables.colors.text[0]};
            `}
          >
            Integrations
          </h2>
          <h3
            className={css`
              margin: 0;
            `}
          >
            DBT
          </h3>
          <p>Use dbt and tellery to manage your data model</p>
          <FormButton
            variant="primary"
            onClick={() => {
              setIntegration(Integration.DBT)
            }}
          >
            Connect
          </FormButton>
        </div>
      )}
      {integration === Integration.DBT ? (
        <DBTIntegration connectorId={connector.id} onClose={() => setIntegration(undefined)} />
      ) : null}
    </div>
  ) : null
}

function DBTIntegration(props: { connectorId: string; onClose: () => void }) {
  const { data: profiles } = useConnectorsListProfiles(props.connectorId)
  const profile = profiles?.[0]
  const { register, watch } = useForm<ProfileConfig>({
    defaultValues: profile,
    mode: 'onBlur'
  })
  const handleGenerateKeyPair = useGenerateKeyPair(
    props.connectorId,
    watch('configs.Dbt Project Name') as string | undefined,
    watch('configs.Git Url') as string | undefined
  )

  return (
    <>
      <div
        className={css`
          display: flex;
          align-items: center;
          margin-bottom: 24px;
        `}
      >
        <IconButton
          icon={IconCommonArrowLeft}
          color={ThemingVariables.colors.gray[0]}
          className={css`
            cursor: pointer;
            margin-right: 10px;
          `}
          onClick={props.onClose}
        />
        <h2
          className={css`
            font-weight: 600;
            font-size: 16px;
            line-height: 20px;
            margin: 0;
            color: ${ThemingVariables.colors.text[0]};
          `}
        >
          DBT
        </h2>
      </div>
      <FormLabel>Name</FormLabel>
      <FormInput {...register('configs.Dbt Project Name')} />
      <FormLabel
        className={css`
          margin-top: 16px;
        `}
      >
        Git url
      </FormLabel>
      <FormInput {...register('configs.Git Url')} />
      <FormButton
        variant="primary"
        onClick={handleGenerateKeyPair.execute}
        disabled={handleGenerateKeyPair.status === 'pending'}
      >
        Compile
      </FormButton>
    </>
  )
}
