import { IconCommonArrowLeft } from '@app/assets/icons'
import { useConnectorsList, useConnectorsListProfiles, useGenerateKeyPair, useWorkspaceDetail } from '@app/hooks/api'
import { ThemingVariables } from '@app/styles'
import type { ProfileConfig } from '@app/types'
import { css } from '@emotion/css'
import React, { useState, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { FormButton } from './kit/FormButton'
import FormInput from './kit/FormInput'
import FormLabel from './kit/FormLabel'
import IconButton from './kit/IconButton'

enum Integration {
  DBT = 'DBT'
}

export function WorkspaceIntegrations(props: { onClose(): void }) {
  const { data: workspace } = useWorkspaceDetail()
  const [integration, setIntegration] = useState<Integration>()
  const { data: connectors } = useConnectorsList()
  const connector = useMemo(
    () => connectors?.find((c) => c.id === workspace?.preferences.connectorId),
    [connectors, workspace?.preferences.connectorId]
  )

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
  const { data: workspace } = useWorkspaceDetail()
  const { data: profiles, refetch } = useConnectorsListProfiles(props.connectorId)
  const profile = useMemo(
    () => profiles?.find((p) => p.name === workspace?.preferences.profile),
    [profiles, workspace?.preferences.profile]
  )
  const { register, watch } = useForm<ProfileConfig>({
    defaultValues: profile,
    mode: 'onBlur'
  })
  const handleGenerateKeyPair = useGenerateKeyPair(
    props.connectorId,
    watch('configs.Dbt Project Name') as string | undefined,
    watch('configs.Git Url') as string | undefined
  )
  useEffect(() => {
    if (handleGenerateKeyPair.status === 'success') {
      refetch()
    }
  }, [handleGenerateKeyPair.status, refetch])

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
      <FormLabel>Project name</FormLabel>
      <FormInput {...register('configs.Dbt Project Name')} disabled={!!profile?.configs['Dbt Project Name']} />
      <FormLabel
        className={css`
          margin-top: 16px;
        `}
      >
        Git url
      </FormLabel>
      <FormInput {...register('configs.Git Url')} disabled={!!profile?.configs['Git Url']} />
      {profile?.configs['Public Key'] ? (
        <>
          <FormLabel
            className={css`
              margin-top: 16px;
            `}
          >
            Public Key
          </FormLabel>
          <FormInput {...register('configs.Public Key')} disabled={!!profile?.configs['Public Key']} />
        </>
      ) : (
        <FormButton
          variant="primary"
          onClick={handleGenerateKeyPair.execute}
          disabled={handleGenerateKeyPair.status === 'pending'}
          className={css`
            margin-top: 16px;
          `}
        >
          Compile
        </FormButton>
      )}
    </>
  )
}
