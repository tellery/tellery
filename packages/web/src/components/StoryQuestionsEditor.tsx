import {
  IconCommonArrowDropDown,
  IconCommonArrowUpDown,
  IconCommonClose,
  IconCommonError,
  IconCommonRun,
  IconCommonSave
} from '@app/assets/icons'
import { SQLEditor } from '@app/components/SQLEditor'
import { useBindHovering } from '@app/hooks'
import { useBlockSuspense, useConnectorsGetProfile, useExecuteSQL, useTranslateSmartQuery } from '@app/hooks/api'
import { useCommit } from '@app/hooks/useCommit'
import { useLocalStorage } from '@app/hooks/useLocalStorage'
import {
  EditorDraft,
  useDraftBlockMutating,
  useQuestionEditorActiveIdState,
  useQuestionEditorBlockMapState,
  useQuestionEditorOpenState
} from '@app/hooks/useQuestionEditor'
import { useSideBarQuestionEditor } from '@app/hooks/useSideBarQuestionEditor'
import { useSqlEditor } from '@app/hooks/useSqlEditor'
import { useStoryPermissions } from '@app/hooks/useStoryPermissions'
import { useWorkspace } from '@app/hooks/useWorkspace'
import { useCreateSnapshot } from '@app/store/block'
import { ThemingVariables } from '@app/styles'
import { Editor } from '@app/types'
import { blockIdGenerator, DRAG_HANDLE_WIDTH, queryClient } from '@app/utils'
import { css, cx } from '@emotion/css'
import MonacoEditor from '@monaco-editor/react'
import Tippy from '@tippyjs/react'
import { dequal } from 'dequal'
import { animate, motion, MotionValue, useMotionValue, useTransform } from 'framer-motion'
import { produce } from 'immer'
import isHotkey from 'is-hotkey'
import { omit } from 'lodash'
import React, { SetStateAction, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'react-toastify'
import { Tab, TabList, TabPanel, TabStateReturn, useTabState } from 'reakit/Tab'
import invariant from 'tiny-invariant'
import YAML from 'yaml'
import { setBlockTranscation } from '../context/editorTranscations'
import { BlockingUI } from './BlockingUI'
import { CircularLoading } from './CircularLoading'
import { BlockTitle, useGetBlockTitleTextSnapshot } from './editor'
import { isExecuteableBlockType } from './editor/Blocks/utils'
import type { SetBlock } from './editor/types'
import IconButton from './kit/IconButton'
import { TippySingletonContextProvider } from './TippySingletonContextProvider'

const DragConstraints = {
  top: -700,
  bottom: -300
}

const updateOldDraft = (
  oldDraft?: EditorDraft,
  block?: Editor.QueryBlock | Editor.VisualizationBlock | Editor.QueryBuilder | Editor.SmartQueryBlock
) => {
  if (!oldDraft) return undefined

  const updatedDraft = emitFalsyObject({
    ...oldDraft,
    title: dequal(oldDraft.title, block?.content?.title) === false ? oldDraft.title : undefined,
    sql: oldDraft.sql !== (block as Editor.SQLBlock)?.content?.sql ? oldDraft.sql : undefined,
    visConfig:
      dequal(oldDraft.visConfig, (block as Editor.VisualizationBlock)?.content?.visualization) === false
        ? oldDraft.visConfig
        : undefined,
    snapshotId:
      oldDraft.snapshotId !== (block as Editor.QueryBlock)?.content?.snapshotId ? oldDraft.snapshotId : undefined
  })

  return updatedDraft
}

const QueryEditorResizer: React.FC<{ y: MotionValue<number> }> = ({ y }) => {
  const [resizeConfig, setResizeConfig] = useLocalStorage('MainSQLEditorConfig_v2', {
    y: -300
  })

  useEffect(() => {
    const unsubscribe = y.onChange((y) => {
      if (!y) return
      setResizeConfig((config) => ({ ...config, y: y }))
    })
    return () => {
      unsubscribe()
    }
  }, [setResizeConfig, y])

  return (
    <motion.div
      title="drag to resize"
      whileDrag={{ backgroundColor: ThemingVariables.colors.gray[1] }}
      drag={'y'}
      dragConstraints={DragConstraints}
      className={css`
        position: absolute;
        cursor: ns-resize;
        left: -${DRAG_HANDLE_WIDTH / 2}px;
        bottom: 0;
        height: ${DRAG_HANDLE_WIDTH}px;
        z-index: 10;
        width: 100%;
      `}
      whileHover={{
        backgroundColor: ThemingVariables.colors.gray[1]
      }}
      dragElastic={false}
      dragMomentum={false}
      style={{ y }}
    />
  )
}

export const StoryQuestionsEditor: React.FC<{ storyId: string }> = ({ storyId }) => {
  const [open, setOpen] = useQuestionEditorOpenState(storyId)

  const [resizeConfig] = useLocalStorage('MainSQLEditorConfig_v2', {
    y: -300
  })
  const y = useMotionValue(resizeConfig.y)
  const height = useTransform(y, (y) => Math.abs(y - 0.5 * DRAG_HANDLE_WIDTH))
  const placeholderHeight = useTransform(height, (height) => (open ? height : 0))
  const translateY = useMotionValue(height.get())

  const workspace = useWorkspace()
  const { data: profile } = useConnectorsGetProfile(workspace.preferences.connectorId)
  useSqlEditor(profile?.type)

  const [questionBlocksMap] = useQuestionEditorBlockMapState(storyId)
  const [activeId, setActiveId] = useQuestionEditorActiveIdState(storyId)
  const tab = useTabState()

  const opendQuestionBlockIds = useMemo(() => {
    return Object.keys(questionBlocksMap)
  }, [questionBlocksMap])

  useEffect(() => {
    tab.setSelectedId(activeId)
  }, [activeId, tab])

  useEffect(() => {
    if (opendQuestionBlockIds.length === 0) {
      setActiveId(null)
      setOpen(false)
    }
  }, [opendQuestionBlockIds, setActiveId, setOpen])

  useEffect(() => {
    const controls = animate(translateY, open ? 0 : height.get() - (opendQuestionBlockIds.length ? 44 : 0), {
      type: 'tween',
      ease: 'easeInOut',
      duration: 0.25
    })

    return controls.stop
  }, [height, open, opendQuestionBlockIds.length, translateY])

  return (
    <>
      <motion.div
        style={{
          height: placeholderHeight,
          flexShrink: 0
        }}
      ></motion.div>

      <motion.div
        style={{
          height: height,
          y: translateY
        }}
        className={css`
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          width: 100%;
          user-select: none;
          z-index: 1000;
          display: flex;
          flex-direction: column;
          background-color: ${ThemingVariables.colors.gray[5]};
        `}
      >
        <QueryEditorResizer y={y} />
        <TabList
          {...tab}
          aria-label="Question Editor Tabs"
          style={{
            backgroundColor: ThemingVariables.colors.gray[4]
          }}
          className={css`
            border-top: solid 1px ${ThemingVariables.colors.gray[1]};
            border-bottom: solid 1px ${ThemingVariables.colors.gray[1]};
            transition: all 250ms;
            display: flex;
            position: relative;
            flex: 0 0 44px;
            overflow: hidden;
          `}
        >
          <div
            className={css`
              flex: 1;
              height: 100%;
              display: flex;
              flex-wrap: nowrap;
              overflow-x: auto;
              overflow-y: hidden;
              padding: 0 8px;
              ::-webkit-scrollbar {
                display: none;
              }
              > * + * {
                margin-left: 8px;
              }
            `}
          >
            {opendQuestionBlockIds?.map((id) => {
              return (
                <React.Suspense key={id} fallback={null}>
                  <QuestionTab
                    id={id}
                    isActive={id === activeId}
                    tab={tab}
                    isOpen={open}
                    onClick={() => {
                      setActiveId(id)
                      setOpen(true)
                    }}
                    storyId={storyId}
                  />
                </React.Suspense>
              )
            })}
            <div
              className={css`
                display: flex;
                align-items: center;
                position: absolute;
                top: 0;
                bottom: 0;
                right: 0;
                padding: 0 12px;
                height: 100%;
                background-color: ${ThemingVariables.colors.gray[2]};
              `}
            >
              <Tippy
                content={open ? 'Click to close query editor' : 'Click to open query editor'}
                hideOnClick
                arrow={false}
                delay={[500, 0]}
                duration={[500, 0]}
              >
                <IconButton
                  icon={IconCommonArrowDropDown}
                  onClick={() => {
                    setOpen(!open)
                  }}
                  style={{
                    transform: `rotate(${open ? '0' : '180deg'})`
                  }}
                  className={css`
                    margin-left: auto;
                    transition: transform 250ms;
                  `}
                />
              </Tippy>
            </div>
          </div>
        </TabList>
        {opendQuestionBlockIds.map((id) => (
          <React.Suspense key={id} fallback={<BlockingUI blocking={true} />}>
            <StoryQuestionEditor tab={tab} id={id} setActiveId={setActiveId} storyId={storyId} isOpen={open} />
          </React.Suspense>
        ))}
        {/* <div
            className={css`
              box-shadow: 0px -1px 0px ${ThemingVariables.colors.gray[1]};
              padding: 0 8px;
              display: flex;
              height: 44px;
              background-color: ${ThemingVariables.colors.gray[5]};
              position: relative;
              flex-shrink: 0;
              flex: 1;
              overflow: hidden;
              z-index: 1001;
            `}
          >
            {open === false && (
              <div
                className={css`
                  display: flex;
                  align-items: center;
                  position: absolute;
                  top: 0;
                  bottom: 0;
                  right: 0;
                  padding: 0 16px;
                  height: 100%;
                `}
              >
                <IconButton
                  hoverContent="Click to open query editor"
                  icon={IconCommonArrowUpDown}
                  onClick={() => {
                    setOpen(true)
                  }}
                  className={css`
                    margin-left: auto;
                  `}
                />
              </div>
            )}
          </div> */}
        {/* <EditorContent storyId={storyId} /> */}
      </motion.div>
    </>
  )
}

const TabHeader: React.FC<{ blockId: string; hovering: boolean; storyId: string }> = ({
  blockId,
  hovering,
  storyId
}) => {
  const [questionBlocksMap, setQuestionBlocksMap] = useQuestionEditorBlockMapState(storyId)
  const [activeId, setActiveId] = useQuestionEditorActiveIdState(storyId)
  const opendQuestionBlockIds = useMemo(() => {
    return Object.keys(questionBlocksMap)
  }, [questionBlocksMap])
  const closeTabById = useCallback(
    (tabId: string) => {
      const isTabDirty = !!questionBlocksMap[tabId].draft
      if (isTabDirty) {
        if (confirm("Close this tab without saving? Your changes will be lost if you don't save them.") === false) {
          return
        }
      }
      const currentIndex = opendQuestionBlockIds.findIndex((id) => id === tabId)
      if (tabId === activeId) {
        if (opendQuestionBlockIds[currentIndex - 1]) {
          setActiveId(opendQuestionBlockIds[currentIndex - 1])
        } else if (opendQuestionBlockIds[currentIndex + 1]) {
          setActiveId(opendQuestionBlockIds[currentIndex + 1])
        } else {
          setActiveId(null)
        }
      }
      setQuestionBlocksMap((map) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [tabId]: omit, ...rest } = map
        return rest
      })
    },
    [activeId, opendQuestionBlockIds, questionBlocksMap, setActiveId, setQuestionBlocksMap]
  )

  const block = useBlockSuspense<Editor.QueryBlock | Editor.VisualizationBlock>(blockId)

  const queryBlock = useBlockSuspense<Editor.QueryBlock>(
    (block as Editor.VisualizationBlock)?.content?.queryId ?? blockId
  )

  const mutatingCount = useDraftBlockMutating(blockId)

  const getBlockTitle = useGetBlockTitleTextSnapshot()

  return (
    <>
      <div
        className={css`
          flex: 1;
          max-width: 200px;
          display: flex;
          align-items: center;
          box-sizing: border-box;
        `}
        // ref={ref}
        title={getBlockTitle(queryBlock)}
      >
        {mutatingCount !== 0 && <CircularLoading size={20} color={ThemingVariables.colors.primary[1]} />}
        <div
          className={css`
            flex: 1 1;
            text-overflow: ellipsis;
            overflow: hidden;
            white-space: nowrap;
          `}
        >
          <BlockTitle block={queryBlock} />
        </div>
      </div>
      <DraftStatus
        isDraft={!!questionBlocksMap[block.id].draft}
        showClose={hovering}
        onCloseClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          closeTabById(block.id)
        }}
      />
    </>
  )
}

const QuestionTab: React.FC<{
  id: string
  tab: TabStateReturn
  isActive: boolean
  isOpen: boolean
  onClick: () => void
  storyId: string
}> = ({ id, tab, isActive, isOpen, onClick, storyId }) => {
  const [bindHoveringEvents, isHovering] = useBindHovering()

  return (
    <Tab
      key={id}
      {...tab}
      {...bindHoveringEvents()}
      onClick={onClick}
      className={cx(
        css`
          margin-top: 8px;
          margin-bottom: 8px;
          font-size: 12px;
          border-radius: 8px;
          line-height: 14px;
          display: inline-flex;
          align-items: center;
          padding: 8px 15px;
          cursor: pointer;
          outline: none;
          border: none;
          color: ${ThemingVariables.colors.text[0]};
        `,
        isActive
          ? css`
              background: ${ThemingVariables.colors.gray[1]};
            `
          : css`
              background: ${ThemingVariables.colors.gray[2]};
            `
      )}
    >
      <TabHeader blockId={id} hovering={isHovering} storyId={storyId} />
    </Tab>
  )
}

export const StoryQuestionEditor: React.FC<{
  id: string
  setActiveId: (update: SetStateAction<string | null>) => void | Promise<void>
  tab: TabStateReturn
  storyId: string
  isOpen: boolean
  // block: Editor.QuestionBlock
  // originalBlock: Editor.QuestionBlock
}> = ({ id, tab, storyId, isOpen }) => {
  const block = useBlockSuspense<Editor.VisualizationBlock | Editor.QueryBlock>(id)
  const visualizationBlock: Editor.VisualizationBlock | null =
    block.type === Editor.BlockType.Visualization ? block : null
  const queryBlock = useBlockSuspense<Editor.QueryBlock>(visualizationBlock?.content?.queryId ?? id)
  const [questionBlocksMap, setQuestionBlocksMap] = useQuestionEditorBlockMapState(storyId)
  const [sqlSidePanel, setSqlSidePanel] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const questionBlockState = useMemo(() => {
    if (id && questionBlocksMap && questionBlocksMap[id]) {
      return questionBlocksMap[id]
    }
    return null
  }, [id, questionBlocksMap])

  const commit = useCommit()

  const setSqlBlock = useCallback<SetBlock<Editor.QueryBlock>>(
    (id, update) => {
      const oldBlock = queryBlock
      const newBlock = produce(oldBlock, update)

      commit({
        transcation: setBlockTranscation({ oldBlock, newBlock }),
        storyId: queryBlock.storyId!
      })
    },
    [commit, queryBlock]
  )

  const permissions = useStoryPermissions(visualizationBlock?.storyId ?? block.id)

  const readonly = permissions.readonly
  const isDraft = !!questionBlockState?.draft
  const originalSQL = (queryBlock as Editor.SQLBlock)?.content?.sql

  const queryTitle = questionBlockState?.draft?.title ?? queryBlock?.content?.title
  const { data: sql = questionBlockState?.draft?.sql ?? originalSQL ?? '' } = useTranslateSmartQuery(
    queryBlock.type === Editor.BlockType.SmartQuery
      ? (queryBlock as Editor.SmartQueryBlock).content.queryBuilderId
      : undefined,
    (queryBlock as Editor.SmartQueryBlock)?.content?.metricIds,
    (queryBlock as Editor.SmartQueryBlock)?.content?.dimensions
  )

  useEffect(() => {
    setQuestionBlocksMap((blocksMap) => {
      return {
        ...blocksMap,
        [id]: {
          ...blocksMap[id],
          draft: updateOldDraft(updateOldDraft(blocksMap[id].draft, visualizationBlock ?? queryBlock), queryBlock)
        }
      }
    })
  }, [queryBlock, visualizationBlock, id, setQuestionBlocksMap])

  const setSql = useCallback(
    (sql) => {
      setQuestionBlocksMap((blocksMap) => {
        return {
          ...blocksMap,
          [id]: {
            ...blocksMap[id],
            draft: emitFalsyObject({
              ...blocksMap[id].draft,
              sql: sql !== originalSQL ? sql : undefined
            })
          }
        }
      })
    },
    [id, originalSQL, setQuestionBlocksMap]
  )

  const executeSQL = useExecuteSQL(`draft/${block.id}`)

  const save = useCallback(
    async (snapshotId?: string) => {
      if (!block) {
        toast.error('block is undefined')
        return
      }
      // if (isDraft !== true) return
      if (readonly) {
        toast.error('question is readonly')
        return
      }
      setSqlBlock(queryBlock.id, (draftBlock) => {
        if (draftBlock.type === Editor.BlockType.SQL) {
          ;(draftBlock as Editor.SQLBlock).content!.sql = sql
        }

        if (snapshotId) {
          draftBlock.content!.snapshotId = snapshotId
          draftBlock.content!.error = null
          draftBlock.content!.lastRunAt = Date.now()
        }
        draftBlock.content!.title = queryTitle ?? []
      })
    },
    [block, readonly, setSqlBlock, queryBlock.id, sql, queryTitle]
  )

  const [sqlError, setSQLError] = useState<string | null>(null)

  // const mutateBlock = useMutateBlock<Editor.QuestionBlock>()
  const workspace = useWorkspace()
  const { data: profile } = useConnectorsGetProfile(workspace.preferences.connectorId)
  const profileType = profile?.type
  const createSnapshot = useCreateSnapshot()
  const sidebarEditor = useSideBarQuestionEditor(storyId)

  const run = useCallback(async () => {
    if (!queryBlock) return
    if (!sql) return
    if (!isExecuteableBlockType(queryBlock.type)) {
      return
    }
    const data = await executeSQL.mutateAsync({
      workspaceId: workspace.id,
      sql,
      questionId: queryBlock.id,
      connectorId: workspace.preferences.connectorId!,
      profile: workspace.preferences.profile!
    })
    if (typeof data !== 'object' || data.errMsg) {
      setSQLError(data.errMsg ?? 'unknown error')
      setSqlSidePanel(true)
      return
    }
    setSQLError(null)
    setSqlSidePanel(false)
    const snapshotId = blockIdGenerator()
    const originalBlockId = queryBlock.id
    invariant(queryBlock, 'originalBlock is undefined')
    // TODO: fix snap shot question id
    await createSnapshot({
      snapshotId,
      questionId: originalBlockId,
      sql: sql,
      data: data,
      workspaceId: workspace.id
    })

    save(snapshotId)
    sidebarEditor.open({ blockId: block.id, activeTab: 'Visualization' })
  }, [
    queryBlock,
    sql,
    executeSQL,
    workspace.id,
    workspace.preferences.connectorId,
    workspace.preferences.profile,
    createSnapshot,
    save,
    sidebarEditor,
    block.id
  ])

  const cancelExecuteSql = useCallback(() => {
    if (block?.id) {
      const mutations = queryClient.getMutationCache().getAll()
      mutations
        .filter((mutation) => mutation.options.mutationKey === `draft/${block.id}`)
        .forEach((mutation) => {
          queryClient.getMutationCache().remove(mutation)
        })
      executeSQL.reset()
    }
  }, [executeSQL, block?.id])

  const keyDownHandler = useCallback(
    (e: React.KeyboardEvent) => {
      const handlers: { hotkeys: string[]; handler: (e: KeyboardEvent) => void }[] = [
        {
          hotkeys: ['mod+enter', 'ctrl+enter'],
          handler: (e) => {
            e.preventDefault()
            e.stopPropagation()
            run()
          }
        },
        {
          hotkeys: ['mod+s', 'ctrl+s'],
          handler: (e) => {
            e.preventDefault()
            e.stopPropagation()
            save()
          }
        }
      ]
      const matchingHandler = handlers.find((handler) =>
        handler.hotkeys.some((hotkey) => isHotkey(hotkey, { byKey: true }, e.nativeEvent))
      )
      matchingHandler?.handler(e.nativeEvent)
    },
    [run, save]
  )

  const mutatingCount = useDraftBlockMutating(block.id)

  const isDBT = block.type === Editor.BlockType.DBT

  const sqlReadOnly =
    readonly ||
    queryBlock.type === Editor.BlockType.SnapshotBlock ||
    !!(visualizationBlock && queryBlock.storyId !== visualizationBlock?.storyId) ||
    queryBlock.type === Editor.BlockType.SmartQuery

  return (
    <TabPanel
      {...tab}
      tabId={id}
      className={cx(
        css`
          flex: 1;
          position: relative;
          outline: none;
          display: flex;
          flex-direction: column;
          width: 100%;
          align-items: stretch;
          height: 100%;
        `
      )}
      ref={ref}
      onKeyDown={keyDownHandler}
    >
      {isOpen && (
        <div
          className={css`
            position: absolute;
            right: 50px;
            top: -32px;
          `}
        >
          <TippySingletonContextProvider arrow={false}>
            {isDBT ? null : (
              <div
                className={css`
                  display: inline-flex;
                  align-items: center;
                  > * {
                    margin: 0 10px;
                  }
                `}
              >
                {(sqlError || sqlSidePanel) && (
                  <IconButton
                    icon={IconCommonError}
                    color={ThemingVariables.colors.negative[0]}
                    onClick={() => {
                      setSqlSidePanel(!sqlSidePanel)
                    }}
                  />
                )}
                <IconButton
                  hoverContent={mutatingCount !== 0 ? 'Cancel Query' : 'Execute Query'}
                  icon={mutatingCount !== 0 ? IconCommonClose : IconCommonRun}
                  color={ThemingVariables.colors.primary[1]}
                  disabled={!isExecuteableBlockType(queryBlock.type)}
                  onClick={mutatingCount !== 0 ? cancelExecuteSql : run}
                />
                <IconButton
                  hoverContent="Save"
                  disabled={!isDraft || readonly === true}
                  icon={IconCommonSave}
                  onClick={() => save()}
                  color={ThemingVariables.colors.primary[1]}
                />
              </div>
            )}
          </TippySingletonContextProvider>
        </div>
      )}
      <div
        className={css`
          display: flex;
          width: 100%;
          height: 100%;
        `}
      >
        {isDBT ? (
          <MonacoEditor
            language="yaml"
            theme="tellery"
            value={YAML.stringify(omit(block.content, 'title'))}
            options={{
              readOnly: true,
              padding: { top: 20, bottom: 0 }
            }}
            loading={<CircularLoading size={50} color={ThemingVariables.colors.gray[0]} />}
            wrapperClassName={css`
              flex: 1;
              width: 0 !important;
            `}
          />
        ) : (
          <SQLEditor
            className={css`
              flex: 1;
              width: 0 !important;
            `}
            blockId={block.id}
            value={sql}
            storyId={storyId}
            padding={{ top: 20, bottom: 0 }}
            languageId={profileType}
            onChange={(e) => {
              setSql(e)
            }}
            onRun={run}
            onSave={save}
            readOnly={sqlReadOnly}
          />
        )}
        {sqlSidePanel && (
          <div
            className={css`
              overflow: scroll;
              word-wrap: break-word;
              font-style: normal;
              font-weight: 500;
              font-size: 14px;
              flex: 0 0 400px;
              line-height: 24px;
              color: ${ThemingVariables.colors.negative[0]};
              margin: 15px;
              user-select: text;
              padding: 10px;
              border-radius: 10px;
              background: ${ThemingVariables.colors.negative[1]};
            `}
          >
            {sqlError}
          </div>
        )}
      </div>
    </TabPanel>
  )
}

const emitFalsyObject = (object: EditorDraft) => {
  if (Object.values(object).some((value) => value !== undefined)) {
    return object
  }
  return undefined
}

export const DraftStatus: React.FC<{
  isDraft: boolean
  onCloseClick: React.MouseEventHandler<HTMLDivElement>
  showClose: boolean
}> = ({ onCloseClick, isDraft, showClose }) => {
  const [bindHoveringEvents, isHovering] = useBindHovering()

  return (
    <div
      {...bindHoveringEvents()}
      onClick={onCloseClick}
      className={css`
        display: inline-block;
        margin-left: 10px;
        height: 12px;
        width: 12px;
        padding: 3px;
        position: relative;
      `}
    >
      {isDraft && !isHovering && (
        <div
          className={css`
            position: absolute;
            left: 0;
            top: 0;
            height: 12px;
            width: 12px;
            padding: 3px;
            background-color: ${ThemingVariables.colors.warning[0]};
            border-radius: 100%;
            pointer-events: none;
          `}
        ></div>
      )}
      {(isHovering || (!isDraft && showClose)) && (
        <IconCommonClose
          color={ThemingVariables.colors.text[0]}
          className={css`
            position: absolute;
            cursor: pointer;
            height: 20px;
            width: 20px;
            top: -4px;
            pointer-events: none;
            left: -4px;
          `}
        />
      )}
    </div>
  )
}
