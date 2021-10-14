import { sqlRequest, translateSmartQuery } from '@app/api'
import { IconCommonClose, IconCommonRefresh } from '@app/assets/icons'
import { BlockTitle, useGetBlockTitleTextSnapshot } from '@app/components/editor'
import { SmartQueryConfig } from '@app/components/SideBarSmartQuery'
import { VisualizationConfig } from '@app/components/SideBarVisualization'
import { charts, useChart } from '@app/components/v11n/charts'
import { Config, Data, Type } from '@app/components/v11n/types'
import { createEmptyBlock } from '@app/helpers/blockFactory'
import { useBlock, useBlockSuspense, useSearchMetrics } from '@app/hooks/api'
import { useDimensions } from '@app/hooks/useDimensions'
import { useWorkspace } from '@app/hooks/useWorkspace'
import { ThemingVariables } from '@app/styles'
import { Dimension, Editor } from '@app/types'
import { css, cx, keyframes } from '@emotion/css'
import produce from 'immer'
import { WritableDraft } from 'immer/dist/internal'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from 'react-query'

const AllMetricsSection: React.FC<{ setQueryBuilderId: React.Dispatch<React.SetStateAction<string | null>> }> = ({
  setQueryBuilderId
}) => {
  const metricBlocksQuery = useSearchMetrics('', 1000)

  const dataAssetBlocks = useMemo(() => {
    const metricsBlocks = Object.values(metricBlocksQuery.data?.blocks ?? {}).filter(
      (block) => block.type === Editor.BlockType.QueryBuilder
    )
    return metricsBlocks
  }, [metricBlocksQuery.data?.blocks])

  return (
    <>
      {dataAssetBlocks.map((block) => {
        return (
          <React.Suspense key={block.id} fallback={<></>}>
            <DataAssetItem
              block={block}
              onClick={() => {
                setQueryBuilderId(block.id)
              }}
            />
          </React.Suspense>
        )
      })}
    </>
  )
}

export const DataAssetItem: React.FC<{ block: Editor.BaseBlock; onClick: React.MouseEventHandler<HTMLDivElement> }> = ({
  block,
  onClick
}) => {
  const getBlockTitle = useGetBlockTitleTextSnapshot()

  return (
    <div
      className={css`
        display: flex;
        :hover {
          .button {
            opacity: 1;
          }
        }
      `}
      onClick={onClick}
    >
      <div
        className={css`
          display: flex;
          align-items: center;
          cursor: pointer;
          padding: 6px;
          margin: 0 10px 5px 10px;
          user-select: none;
          height: 32px;
          position: relative;
          border-radius: 4px;
          flex: 1;
          :hover {
            background: ${ThemingVariables.colors.gray[5]};
            box-shadow: 0px 0px 4px rgba(0, 0, 0, 0.12);
          }
          :hover {
            > svg {
              opacity: 1;
            }
          }
        `}
      >
        <span
          className={css`
            font-size: 12px;
            line-height: 14px;
            color: ${ThemingVariables.colors.text[0]};
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          `}
        >
          {getBlockTitle(block)}
        </span>
      </div>
    </div>
  )
}

const Diagram: React.FC<{
  className?: string
  data: Data | null
  config: Config<Type> | null
  queryDimensions: Dimension[]
}> = (props) => {
  // const diagram = useMemo(() => {
  //   return chart && props.data ? (

  //   ) : null
  // }, [chart, props.data, chartDimensions, props.config, handleConfigChange])
  const chart = useChart(props.config?.type ?? Type.TABLE)
  const ref = useRef(null)
  const dimensions = useDimensions(ref, 0)

  const handleConfigChange = useCallback(
    (
      key1: keyof Config<Type>,
      value1: Config<Type>[keyof Config<Type>],
      key2: keyof Config<Type>,
      value2: Config<Type>[keyof Config<Type>],
      key3: keyof Config<Type>,
      value3: Config<Type>[keyof Config<Type>]
    ) => {},
    []
  )
  const defaultConfig = useMemo(() => {
    // ensure snapshot data is valid
    return (
      props.config ?? charts[Type.TABLE].initializeConfig(props.data!, { cache: {}, dimensions: props.queryDimensions })
    )
  }, [props.config, props.data, props.queryDimensions])

  return (
    <div
      ref={ref}
      className={css`
        width: 100%;
        overflow: hidden;
        height: 100%;
      `}
    >
      <chart.Diagram
        dimensions={dimensions}
        data={props.data!}
        config={defaultConfig as never}
        onConfigChange={handleConfigChange as any}
      />
    </div>
  )
}

const QueryTab: React.FC<{
  queryBuilderId: string
  metricIds?: string[]
  dimensions?: Dimension[]
  back: React.MouseEventHandler<SVGElement>
  onChange: (update: (block: WritableDraft<Editor.SmartQueryBlock>) => void) => void
}> = ({ queryBuilderId, dimensions, metricIds, back, onChange }) => {
  const queryBuilderBlock = useBlockSuspense<Editor.QueryBuilder>(queryBuilderId)

  return (
    <>
      <div
        className={css`
          display: flex;
          align-items: center;
          padding: 10px;
        `}
      >
        <IconCommonClose
          onClick={back}
          className={css`
            cursor: pointer;
          `}
        />
        <BlockTitle block={queryBuilderBlock} />
      </div>
      <SmartQueryConfig
        onChange={onChange}
        metricIds={metricIds ?? []}
        dimensions={dimensions ?? []}
        queryBuilderBlock={queryBuilderBlock}
      />
    </>
  )
}

const rotateAnimation = keyframes`
  0% {
    transform: rotate(0);
  }
  100% {
    transform: rotate(360deg);
  }
`
const Page = () => {
  const workspace = useWorkspace()
  const [queryBuilderId, setQueryBuilderId] = useState<string | null>(null)
  const [metricIds, setMetricIds] = useState<string[]>()
  const [dimensions, setDiemensions] = useState<Dimension[]>()
  const [visConfig, setVisConfig] = useState<Config<Type> | null>(null)
  const [data, setData] = useState<Data | null>(null)
  const [sql, setSql] = useState<string | null>(null)
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!queryBuilderId) return
    translateSmartQuery(workspace, queryBuilderId, metricIds, dimensions).then((response) => {
      setSql(response.data.sql)
    })
  }, [dimensions, metricIds, queryBuilderId, workspace])

  const mutation = useMutation(sqlRequest, {
    mutationKey: 'explore'
  })

  const cancelMutation = useCallback(() => {
    const mutations = queryClient
      .getMutationCache()
      .getAll()
      .filter(
        (mutation) =>
          (mutation.options.mutationKey as string)?.endsWith('explore') && mutation.state.status === 'loading'
      )
    mutations.forEach((mutation) => {
      mutation.cancel()
    })
  }, [queryClient])

  useEffect(() => {
    setData(null)
    if (!queryBuilderId) {
      cancelMutation()
      setDiemensions(undefined)
      setMetricIds(undefined)
    }
  }, [cancelMutation, queryBuilderId, queryClient])

  useEffect(() => {
    if (!sql) {
      return
    }
    cancelMutation()

    mutation.mutate(
      {
        workspaceId: workspace.id,
        sql,
        connectorId: workspace.preferences.connectorId!,
        profile: workspace.preferences.profile!
      },
      {
        onSuccess: (data) => {
          setData(data)
        }
      }
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sql, workspace.id, workspace.preferences.connectorId, workspace.preferences.profile])

  const setSmartQueryBlock = useCallback(
    (update: (block: WritableDraft<Editor.SmartQueryBlock>) => void) => {
      const oldBlock = createEmptyBlock<Editor.SmartQueryBlock>({
        content: {
          dimensions: dimensions,
          metricIds: metricIds,
          queryBuilderId: queryBuilderId ?? '',
          title: []
        } as any
      })
      const newBlock = produce(oldBlock, update)
      setDiemensions(newBlock.content.dimensions)
      setMetricIds(newBlock.content.metricIds)
    },
    [dimensions, metricIds, queryBuilderId]
  )

  const setVisConfigBlock = useCallback(
    (update: (block: WritableDraft<Editor.VisualizationBlock>) => void) => {
      const oldBlock = createEmptyBlock<Editor.VisualizationBlock>({
        content: {
          visualization: visConfig ?? undefined
        }
      })
      const newBlock = produce(oldBlock, update)
      setVisConfig(newBlock.content?.visualization ?? null)
    },
    [visConfig]
  )

  return (
    <>
      <div
        className={css`
          display: flex;
          height: 100vh;
          overflow: hidden;
          width: 100%;
        `}
      >
        <div
          className={css`
            height: 100%;
            width: 240px;
            flex-shrink: 0;
            border-right: solid 1px ${ThemingVariables.colors.gray[1]};
            overflow-y: auto;
          `}
        >
          <React.Suspense fallback={<></>}>
            {!queryBuilderId && <AllMetricsSection setQueryBuilderId={setQueryBuilderId} />}
            {queryBuilderId && (
              <QueryTab
                metricIds={metricIds}
                dimensions={dimensions}
                queryBuilderId={queryBuilderId}
                onChange={setSmartQueryBlock}
                back={() => {
                  setQueryBuilderId(null)
                }}
              />
            )}
          </React.Suspense>
        </div>
        <div
          className={css`
            background-color: ${ThemingVariables.colors.primary[5]};
            border-radius: 20px;
            margin: 10vh 20px;
            padding: 20px;
            height: 50vh;
            flex: 1;
            overflow: hidden;
          `}
        >
          {mutation.isLoading && (
            <>
              <IconCommonRefresh
                width="22px"
                height="22px"
                fill={ThemingVariables.colors.warning[0]}
                className={css`
                  animation: ${rotateAnimation} 1.2s linear infinite;
                `}
              />
            </>
          )}
          <div
            className={css`
              width: 100%;
              overflow: hidden;
              height: 100%;
            `}
          >
            {data && <Diagram config={visConfig} data={data} queryDimensions={dimensions ?? []} />}
          </div>
        </div>
        <div
          className={css`
            width: 240px;
            flex-shrink: 0;
            border-left: solid 1px ${ThemingVariables.colors.gray[1]};
          `}
        >
          {data && (
            <VisualizationConfig
              config={visConfig}
              data={data}
              metricIds={metricIds}
              dimensions={dimensions}
              onChange={setVisConfigBlock}
            />
          )}
        </div>
      </div>
    </>
  )
}

export default Page
