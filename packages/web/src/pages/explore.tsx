import { sqlRequest, translateSmartQuery } from '@app/api'
import { IconCommonCopy, IconCommonRefresh, IconCommonSave, IconMiscDragToExplore } from '@app/assets/icons'
import { FormButton } from '@app/components/kit/FormButton'
import { Icon } from '@app/components/kit/Icon'
import { ExploreSaveMenu } from '@app/components/menus/ExploreSaveMenu'
import { AllMetricsSection, DataAssestCardLoader, DataAssetItem } from '@app/components/SideBarDataAssets'
import { SmartQueryConfig } from '@app/components/SideBarSmartQuery'
import { VisualizationConfig } from '@app/components/SideBarVisualization'
import { charts, useChart } from '@app/components/v11n/charts'
import { SideBarTabHeader } from '@app/components/v11n/components/Tab'
import { Config, Data, Type } from '@app/components/v11n/types'
import { MouseSensorOptions } from '@app/context/blockDnd'
import { createEmptyBlock } from '@app/helpers/blockFactory'
import { useBlockSuspense } from '@app/hooks/api'
import { useDimensions } from '@app/hooks/useDimensions'
import { useSideBarRightState } from '@app/hooks/useSideBarQuestionEditor'
import { useWorkspace } from '@app/hooks/useWorkspace'
import { ThemingVariables } from '@app/styles'
import { Dimension, Editor } from '@app/types'
import { blockIdGenerator, TELLERY_MIME_TYPES } from '@app/utils'
import { DndBlocksFragment } from '@app/utils/dnd'
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  getBoundingClientRect,
  MeasuringConfiguration,
  MeasuringFrequency,
  MeasuringStrategy,
  MouseSensor,
  useDroppable,
  useSensor,
  useSensors
} from '@dnd-kit/core'
import { css } from '@emotion/css'
import styled from '@emotion/styled'
import copy from 'copy-to-clipboard'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import PerfectScrollbar from 'react-perfect-scrollbar'
import { useMutation, useQueryClient } from 'react-query'
import { toast } from 'react-toastify'
import { Tab, TabList, TabPanel, useTabState } from 'reakit'
import { Updater, useImmer } from 'use-immer'

const Diagram: React.FC<{
  className?: string
  data: Data | null
  config: Config<Type> | null
  queryDimensions: Dimension[]
  setVisBlock: Updater<Editor.VisualizationBlock | null>
}> = (props) => {
  const chart = useChart(props.config?.type ?? Type.TABLE)
  const ref = useRef(null)
  const dimensions = useDimensions(ref, 0)
  const defaultConfig = useMemo(() => {
    // ensure snapshot data is valid
    return (
      props.config ?? charts[Type.TABLE].initializeConfig(props.data!, { cache: {}, dimensions: props.queryDimensions })
    )
  }, [props.config, props.data, props.queryDimensions])
  const handleConfigChange = useCallback(
    (
      key1: keyof Config<Type>,
      value1: Config<Type>[keyof Config<Type>],
      key2: keyof Config<Type>,
      value2: Config<Type>[keyof Config<Type>],
      key3: keyof Config<Type>,
      value3: Config<Type>[keyof Config<Type>]
    ) => {
      props.setVisBlock((draft) => {
        if (!draft) return
        if (draft.content?.visualization) {
          if (key1) {
            draft.content.visualization[key1] = value1
          }
          if (key2) {
            draft.content.visualization[key2] = value2
          }
          if (key3) {
            draft.content.visualization[key3] = value3
          }
        }
      })
    },
    [props]
  )
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

const DEFAULT_LAYOUT_MEASURING: MeasuringConfiguration = {
  droppable: {
    measure: getBoundingClientRect,
    strategy: MeasuringStrategy.BeforeDragging,
    frequency: MeasuringFrequency.Optimized
  }
}

const CustomDndContext: React.FC<{ setQueryBuilderId: React.Dispatch<React.SetStateAction<string | null>> }> = ({
  children,
  setQueryBuilderId
}) => {
  const [activeId, setActiveId] = useState<string | null>(null)
  const mouseSensor = useSensor(MouseSensor, MouseSensorOptions)
  const sensors = useSensors(mouseSensor)

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const item = event.active.data.current as DndBlocksFragment
      setActiveId(null)
      if (event.over) {
        console.log(item)
        setQueryBuilderId(item.originalBlockId!)
      }
    },
    [setQueryBuilderId]
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const item = event.active.data.current as DndBlocksFragment
    setActiveId(item.originalBlockId)
  }, [])

  const handleDragCancel = useCallback(() => {
    setActiveId(null)
  }, [])

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      onDragStart={handleDragStart}
      onDragCancel={handleDragCancel}
      sensors={sensors}
      measuring={DEFAULT_LAYOUT_MEASURING}
    >
      <DragOverlay dropAnimation={null}>
        {activeId ? (
          <React.Suspense key={activeId} fallback={<DataAssestCardLoader />}>
            <DataAssetItem blockId={activeId} isExpanded={false} />
          </React.Suspense>
        ) : null}
      </DragOverlay>
      {children}
    </DndContext>
  )
}

const Droppable: React.FC<{ className: string; style: React.CSSProperties }> = (props) => {
  const { isOver, setNodeRef } = useDroppable({
    id: 'explore'
  })

  return (
    <div
      ref={setNodeRef}
      style={{
        ...props.style,
        backgroundColor: isOver ? ThemingVariables.colors.gray[3] : props.style.backgroundColor
      }}
      className={props.className}
    >
      {props.children}
    </div>
  )
}

const ButtonsGroup = styled.div`
  display: flex;
  padding: 0 32px;
  margin: auto;
  justify-content: space-around;
  > * + * {
    margin-left: 11px;
  }
`

const PageButton = styled(FormButton)`
  display: flex;
  align-items: center;
  justify-content: center;
  max-width: 230px;
  > svg {
    margin-right: 5px;
  }
`

const Page = () => {
  const workspace = useWorkspace()
  const [queryBuilderId, setQueryBuilderId] = useState<string | null>(null)
  const [queryBlock, setQueryBlock] = useImmer<Editor.SmartQueryBlock | null>(null)
  const [visBlock, setVisBlock] = useImmer<Editor.VisualizationBlock | null>(null)
  const [data, setData] = useState<Data | null>(null)
  const [sql, setSql] = useState<string | null>(null)
  const queryClient = useQueryClient()
  const [autoRefresh, setAutoRefresh] = useState(false)

  useEffect(() => {
    if (!queryBuilderId) return
    translateSmartQuery(
      workspace.id,
      workspace.preferences?.connectorId!,
      queryBuilderId,
      queryBlock?.content.metricIds,
      queryBlock?.content.dimensions,
      queryBlock?.content.filters
    )
      .then((response) => {
        setSql(response.data.sql)
      })
      .catch(console.error)
  }, [queryBlock, queryBuilderId, workspace])

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
    if (queryBuilderId) {
      setAutoRefresh(false)
      cancelMutation()
      const visBlockId = blockIdGenerator()
      const newQueryBlock = createEmptyBlock<Editor.SmartQueryBlock>({
        type: Editor.BlockType.SmartQuery,
        content: {
          queryBuilderId: queryBuilderId!,
          metricIds: [],
          dimensions: [],
          title: []
        },
        parentId: visBlockId
      })
      setQueryBlock(newQueryBlock)
      setVisBlock(
        createEmptyBlock<Editor.VisualizationBlock>({
          type: Editor.BlockType.Visualization,
          content: { queryId: newQueryBlock.id, title: [['smart query from metrics exploration']] },
          children: [newQueryBlock.id]
        })
      )
    }
  }, [cancelMutation, queryBuilderId, queryClient, setQueryBlock, setVisBlock])

  const refresh = useCallback(() => {
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

  useEffect(() => {
    if (autoRefresh) {
      refresh()
    }
    // only refresh when sql changed and auto refresh is true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sql])

  const execute = useCallback(() => {
    setAutoRefresh(true)
    refresh()
  }, [refresh])

  const blockFragment = useMemo(() => {
    if (!visBlock || !queryBlock) return null

    return {
      children: [visBlock.id],
      data: {
        [visBlock.id]: visBlock,
        [queryBlock.id]: queryBlock
      }
    }
  }, [queryBlock, visBlock])

  const handleCopy = useCallback(() => {
    if (!blockFragment) return
    copy('tellery', {
      debug: true,
      onCopy: (clipboardData) => {
        const fragment = {
          type: TELLERY_MIME_TYPES.BLOCKS,
          value: blockFragment
        }
        ;(clipboardData as DataTransfer).setData(fragment.type, JSON.stringify(fragment.value))
      }
    })
    toast.success('Success copied')
  }, [blockFragment])

  const handleSave = useCallback(() => {}, [])

  return (
    <CustomDndContext setQueryBuilderId={setQueryBuilderId}>
      <div
        className={css`
          display: flex;
          flex-direction: column;
          height: 100vh;
          width: 100%;
        `}
      >
        <div
          className={css`
            background: #ffffff;
            box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.08);
            font-family: Helvetica Neue;
            font-style: normal;
            font-weight: bold;
            font-size: 24px;
            line-height: 29px;
            padding: 23px;
            color: #333333;
            z-index: 10;
          `}
        >
          Metric explore
        </div>
        <div
          className={css`
            display: flex;
            overflow: hidden;
          `}
        >
          <AllMetricsSection
            className={css`
              width: 304px;
              flex-shrink: 0;
              border-right: solid 1px ${ThemingVariables.colors.gray[1]};
            `}
          />
          <div
            className={css`
              flex: 1;
              overflow: hidden;
            `}
          >
            <Droppable
              className={css`
                border-radius: 20px;
                margin: 32px;
                height: 50vh;
                padding: 15px;
                overflow: hidden;
                border-radius: 20px;
                position: relative;
              `}
              style={{
                border: queryBuilderId ? '4px solid #dedede' : '4px dashed #dedede',
                backgroundColor: queryBuilderId ? ThemingVariables.colors.gray[4] : 'none'
              }}
            >
              <div
                className={css`
                  width: 100%;
                  overflow: hidden;
                  height: 100%;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  flex-direction: column;
                `}
              >
                {(!(queryBuilderId && data) || (mutation.isLoading && !data)) && (
                  <>
                    <IconMiscDragToExplore />
                    <div
                      className={css`
                        font-family: Helvetica Neue;
                        font-style: normal;
                        font-weight: 500;
                        font-size: 14px;
                        line-height: 17px;
                        color: #999999;
                        margin-top: 15px;
                      `}
                    >
                      {queryBuilderId
                        ? 'Select Measures and Dimensions, click query to see your results'
                        : 'Drag here to explore'}
                    </div>
                  </>
                )}
                {data && (
                  <Diagram
                    config={visBlock?.content?.visualization ?? null}
                    data={data}
                    queryDimensions={queryBlock?.content.dimensions ?? []}
                    setVisBlock={setVisBlock}
                  />
                )}
              </div>
            </Droppable>
            <ButtonsGroup>
              <PageButton
                variant={'secondary'}
                className={css`
                  flex: 1;
                `}
                onClick={mutation.isLoading ? cancelMutation : execute}
              >
                <Icon
                  spin={mutation.isLoading}
                  icon={IconCommonRefresh}
                  className={css`
                    margin-right: 5px;
                  `}
                />
                {mutation.isLoading ? 'Cancel' : 'Query'}
              </PageButton>
              <PageButton
                variant={'secondary'}
                className={css`
                  flex: 1;
                `}
                onClick={handleCopy}
              >
                <IconCommonCopy />
                Copy
              </PageButton>
              <ExploreSaveMenu
                blockFragment={blockFragment}
                button={
                  <PageButton
                    variant={'secondary'}
                    className={css`
                      flex: 1;
                    `}
                    onClick={handleSave}
                  >
                    <IconCommonSave />
                    Save
                  </PageButton>
                }
              ></ExploreSaveMenu>
            </ButtonsGroup>
          </div>
          <div
            className={css`
              width: 304px;
              flex-shrink: 0;
              border-left: solid 1px ${ThemingVariables.colors.gray[1]};
            `}
          >
            {queryBlock && visBlock && (
              <ExploreSideBarRight
                queryBlock={queryBlock}
                data={data}
                visBlock={visBlock}
                setQueryBlock={setQueryBlock}
                setVisBlock={setVisBlock}
              />
            )}
          </div>
        </div>
      </div>
    </CustomDndContext>
  )
}

const ExploreSideBarRight: React.FC<{
  queryBlock: Editor.SmartQueryBlock
  visBlock: Editor.VisualizationBlock
  setQueryBlock: Updater<Editor.SmartQueryBlock | null>
  data: Data | null
  setVisBlock: Updater<Editor.VisualizationBlock | null>
}> = ({ queryBlock, visBlock, setQueryBlock, setVisBlock, data }) => {
  const tab = useTabState()
  const { t } = useTranslation()
  const [sideBarEditorState, setSideBarEditorState] = useSideBarRightState('explore')
  const queryBuilderBlock = useBlockSuspense(queryBlock.content.queryBuilderId)
  useEffect(() => {
    if (sideBarEditorState?.data?.activeTab) {
      tab.setSelectedId(sideBarEditorState.data?.activeTab)
    }
  }, [sideBarEditorState, tab])

  const changeTab = useCallback(
    (tab: 'Visualization' | 'Query') => {
      setSideBarEditorState((value) => {
        if (value) {
          return { ...value, activeTab: tab }
        }
        return value
      })
    },
    [setSideBarEditorState]
  )

  return (
    <div
      className={css`
        height: 100%;
        border-left: 1px solid #dedede;
        display: flex;
        background-color: #fff;
        flex-direction: column;
      `}
    >
      <TabList
        {...tab}
        className={css`
          border-bottom: solid 1px ${ThemingVariables.colors.gray[1]};
          overflow-x: auto;
          white-space: nowrap;
          padding-right: 16px;
        `}
      >
        {queryBlock.type === Editor.BlockType.SmartQuery ? (
          <Tab
            as={SideBarTabHeader}
            {...tab}
            id="Query"
            selected={tab.selectedId === 'Query'}
            onClick={() => {
              changeTab('Query')
            }}
          >
            {t`Query`}
          </Tab>
        ) : null}
        <Tab
          as={SideBarTabHeader}
          {...tab}
          id="Visualization"
          selected={tab.selectedId === 'Visualization'}
          onClick={() => {
            changeTab('Visualization')
          }}
        >
          {t`Visualization`}
        </Tab>
      </TabList>
      <PerfectScrollbar
        options={{ suppressScrollX: true }}
        className={css`
          flex: 1;
        `}
      >
        <TabPanel {...tab}>
          <SmartQueryConfig
            queryBuilderBlock={queryBuilderBlock}
            metricIds={queryBlock.content.metricIds}
            dimensions={queryBlock.content.dimensions}
            filters={queryBlock.content.filters}
            onChange={setQueryBlock as any}
          />
        </TabPanel>
        <TabPanel {...tab}>
          <VisualizationConfig
            config={visBlock.content?.visualization}
            data={data}
            metricIds={queryBlock.content.metricIds}
            dimensions={queryBlock.content.dimensions}
            onChange={setVisBlock as any}
          />
        </TabPanel>
      </PerfectScrollbar>
    </div>
  )
}

export default Page
