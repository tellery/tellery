import {
  IconCommonArrowDropDown,
  IconCommonClose,
  IconCommonError,
  IconCommonRun,
  IconCommonSave
} from '@app/assets/icons'
import { SQLEditor } from '@app/components/SQLEditor'
import { useBindHovering } from '@app/hooks'
import { useBlockSuspense, useConnectorsGetProfile, useTranslateSmartQuery } from '@app/hooks/api'
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
import { useRefreshSnapshot, useSnapshotMutating } from '@app/hooks/useStorySnapshotManager'
import { useWorkspace } from '@app/hooks/useWorkspace'
import { ThemingVariables } from '@app/styles'
import { Editor } from '@app/types'
import { DRAG_HANDLE_WIDTH } from '@app/utils'
import { waitForTranscationApplied } from '@app/utils/oberveables'
import { css, cx } from '@emotion/css'
import MonacoEditor from '@monaco-editor/react'
import Tippy from '@tippyjs/react'
import { dequal } from 'dequal'
import { motion, MotionValue, useMotionValue, useTransform } from 'framer-motion'
import { produce } from 'immer'
import isHotkey from 'is-hotkey'
import { omit } from 'lodash'
import React, { SetStateAction, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ReactDOM from 'react-dom'
import { toast } from 'react-toastify'
import { useEvent, useLatest, useWindowSize } from 'react-use'
import * as Tabs from '@radix-ui/react-tabs'
import YAML from 'yaml'
import { setBlockTranscation } from '../context/editorTranscations'
import { BlockingUI } from './BlockingUI'
import { CircularLoading } from './CircularLoading'
import { BlockTitle, useGetBlockTitleTextSnapshot } from './editor'
import { isExecuteableBlockType } from './editor/Blocks/utils'
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

const QueryEditorResizer: ReactFCWithChildren<{ y: MotionValue<number> }> = ({ y }) => {
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

export const StoryQuestionsEditor: ReactFCWithChildren<{ storyId: string }> = ({ storyId }) => {
  const [open, setOpen] = useQuestionEditorOpenState(storyId)

  const [resizeConfig] = useLocalStorage('MainSQLEditorConfig_v2', {
    y: -300
  })
  const { height: windowHeight } = useWindowSize()
  const y = useMotionValue(resizeConfig.y)
  const height = useTransform(y, (y) => Math.abs(y - 0.5 * DRAG_HANDLE_WIDTH))
  const placeholderHeight = useTransform(height, (height) => (open ? height : 0))

  useEffect(() => {
    if (height.get() > windowHeight * 0.7) {
      y.set(-windowHeight * 0.7)
    }
  }, [height, windowHeight, y])

  const workspace = useWorkspace()
  const { data: profile } = useConnectorsGetProfile(workspace.preferences.connectorId)
  useSqlEditor(profile?.type)

  const [questionBlocksMap, setQuestionBlocksMap] = useQuestionEditorBlockMapState(storyId)
  const [activeId, setActiveId] = useQuestionEditorActiveIdState(storyId)
  const [tab, setTab] = useState<string>()

  const opendQuestionBlockIds = useMemo(() => {
    return Object.keys(questionBlocksMap)
  }, [questionBlocksMap])

  useEffect(() => {
    if (activeId) {
      setTab(activeId)
    }
  }, [activeId, tab])

  useEffect(() => {
    if (opendQuestionBlockIds.length === 0) {
      setActiveId(null)
      setOpen(false)
    }
  }, [opendQuestionBlockIds, setActiveId, setOpen])

  const translateY = useTransform(height, (height) => {
    return open ? 0 : height - (opendQuestionBlockIds.length ? 44 : 0)
  })

  const closeTabById = useCallback(
    (tabId: string) => {
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
    [activeId, opendQuestionBlockIds, setActiveId, setQuestionBlocksMap]
  )

  const keyDownHandler = useCallback(
    (e: KeyboardEvent) => {
      if (!open) return
      console.log(e)
      const handlers: { hotkeys: string[]; handler: (e: KeyboardEvent) => void }[] = [
        {
          hotkeys: ['ctrl+alt+w'],
          handler: (e) => {
            console.log('close', activeId)
            e.preventDefault()
            e.stopPropagation()
            if (activeId) {
              closeTabById(activeId)
            }
          }
        }
      ]
      const matchingHandler = handlers.find((handler) =>
        handler.hotkeys.some((hotkey) => isHotkey(hotkey, { byKey: false }, e))
      )
      matchingHandler?.handler(e)
    },
    [activeId, closeTabById, open]
  )

  useEvent('keydown', keyDownHandler)

  return (
    <>
      <motion.div
        style={{
          height: placeholderHeight,
          flexShrink: 0
        }}
      ></motion.div>

      <Tabs.Root asChild value={tab} onValueChange={setTab}>
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
            transition: transform 0.25s ease-in-out;
          `}
        >
          {open && <QueryEditorResizer y={y} />}
          <Tabs.List
            aria-label="Question Editor Tabs"
            style={{
              backgroundColor: ThemingVariables.colors.gray[4],
              paddingRight: 50
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
                  <Tabs.Trigger key={id} value={id} asChild>
                    <React.Suspense fallback={null}>
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
                        closeTabById={closeTabById}
                      />
                    </React.Suspense>
                  </Tabs.Trigger>
                )
              })}
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
                />
              </Tippy>
            </div>
            <div id="questions-editor-tab-slot"></div>
          </Tabs.List>
          {opendQuestionBlockIds.map((id) => (
            <Tabs.Content key={id} value={id} asChild>
              <React.Suspense fallback={<BlockingUI blocking={true} />}>
                <StoryQuestionEditor
                  tab={tab}
                  key={id}
                  isActive={activeId === id}
                  id={id}
                  setActiveId={setActiveId}
                  storyId={storyId}
                  isOpen={open}
                />
              </React.Suspense>
            </Tabs.Content>
          ))}
        </motion.div>
      </Tabs.Root>
    </>
  )
}

const TabHeader: ReactFCWithChildren<{
  blockId: string
  hovering: boolean
  storyId: string
  closeTabById: (tabId: string) => void
}> = ({ blockId, hovering, storyId, closeTabById }) => {
  const [questionBlocksMap] = useQuestionEditorBlockMapState(storyId)

  const closeTabByIdAndCheckDraft = useCallback(
    (tabId: string) => {
      const isTabDirty = !!questionBlocksMap[tabId].draft
      if (isTabDirty) {
        if (confirm("Close this tab without saving? Your changes will be lost if you don't save them.") === false) {
          return
        }
      }
      closeTabById(tabId)
    },
    [closeTabById, questionBlocksMap]
  )

  const block = useBlockSuspense<Editor.QueryBlock | Editor.VisualizationBlock>(blockId)

  const queryBlock = useBlockSuspense<Editor.QueryBlock>(
    (block as Editor.VisualizationBlock)?.content?.queryId ?? blockId
  )

  const mutatingCount = useDraftBlockMutating(queryBlock.id)

  const getBlockTitle = useGetBlockTitleTextSnapshot()

  useEffect(() => {
    if (block.alive === false) {
      closeTabById(block.id)
    }
  }, [block.alive, block.id, closeTabById])

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
          closeTabByIdAndCheckDraft(block.id)
        }}
      />
    </>
  )
}

const QuestionTab: ReactFCWithChildren<{
  id: string
  isActive: boolean
  isOpen: boolean
  onClick: () => void
  storyId: string
  closeTabById: (tabId: string) => void
}> = ({ id, isActive, isOpen, onClick, storyId, closeTabById }) => {
  const [bindHoveringEvents, isHovering] = useBindHovering()

  return (
    <div
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
      <TabHeader blockId={id} hovering={isHovering} storyId={storyId} closeTabById={closeTabById} />
    </div>
  )
}

export const StoryQuestionEditor: ReactFCWithChildren<{
  id: string
  setActiveId: (update: SetStateAction<string | null>) => void | Promise<void>
  storyId: string
  isOpen: boolean
  isActive: boolean
  // block: Editor.QuestionBlock
  // originalBlock: Editor.QuestionBlock
}> = ({ id, storyId, isActive }) => {
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

  const setSqlBlock = useCallback(
    async (id, update) => {
      const oldBlock = queryBlock
      const newBlock = produce(oldBlock, update)

      const [trascationId] = commit({
        transcation: setBlockTranscation({ oldBlock, newBlock }),
        storyId: queryBlock.storyId!
      })
      await waitForTranscationApplied(trascationId)
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
    (queryBlock as Editor.SmartQueryBlock)?.content?.dimensions,
    (queryBlock as Editor.SmartQueryBlock)?.content?.filters
  )

  useEffect(() => {
    setQuestionBlocksMap((blocksMap) => {
      return {
        ...blocksMap,
        [id]: {
          ...blocksMap[id],
          draft: updateOldDraft(updateOldDraft(blocksMap[id]?.draft, visualizationBlock ?? queryBlock), queryBlock)
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

  // const executeSQL = useExecuteSQL(`draft/${block.id}`)

  const save = useCallback(
    (snapshotId?: string) => {
      if (!block) {
        toast.error('block is undefined')
        return
      }
      // if (isDraft !== true) return
      if (readonly) {
        toast.error('question is readonly')
        return
      }
      return setSqlBlock(queryBlock.id, (draftBlock) => {
        if (draftBlock.type === Editor.BlockType.SQL || draftBlock.type === Editor.BlockType.QueryBuilder) {
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
  const sidebarEditor = useSideBarQuestionEditor(storyId)
  const refreshSnapshot = useRefreshSnapshot(storyId)
  const mutatingCount = useSnapshotMutating(queryBlock.id)

  const run = useCallback(async () => {
    if (!queryBlock) return
    if (!sql) return
    if (!isExecuteableBlockType(queryBlock.type)) {
      return
    }
    save()
    setTimeout(() => {
      refreshSnapshot.execute(queryBlock).then((res) => {
        if (res.errMsg) {
          setSQLError(res.errMsg)
          setSqlSidePanel(true)
        } else {
          setSQLError(null)
          setSqlSidePanel(false)
        }
      })
      sidebarEditor.setState({ blockId: block.id, activeTab: 'Visualization' })
    }, 0)
  }, [queryBlock, sql, save, sidebarEditor, block.id, refreshSnapshot])

  const cancelExecuteSql = useCallback(() => {
    if (block?.id) {
      refreshSnapshot.cancel(queryBlock?.id)
    }
  }, [block?.id, queryBlock?.id, refreshSnapshot])

  const latestSave = useLatest(save)
  const latestRun = useLatest(run)
  const keyDownHandler = useCallback(
    (e: React.KeyboardEvent) => {
      const handlers: { hotkeys: string[]; handler: (e: KeyboardEvent) => void }[] = [
        {
          hotkeys: ['mod+enter', 'ctrl+enter'],
          handler: (e) => {
            e.preventDefault()
            e.stopPropagation()
            latestRun?.current()
          }
        },
        {
          hotkeys: ['mod+s', 'ctrl+s'],
          handler: (e) => {
            e.preventDefault()
            e.stopPropagation()
            latestSave.current?.()
          }
        }
      ]
      const matchingHandler = handlers.find((handler) =>
        handler.hotkeys.some((hotkey) => isHotkey(hotkey, { byKey: true }, e.nativeEvent))
      )
      matchingHandler?.handler(e.nativeEvent)
    },
    [latestRun, latestSave]
  )

  const isDBT = block.type === Editor.BlockType.DBT

  const sqlReadOnly =
    readonly ||
    queryBlock.type === Editor.BlockType.SnapshotBlock ||
    !!(visualizationBlock && queryBlock.storyId !== visualizationBlock?.storyId) ||
    queryBlock.type === Editor.BlockType.SmartQuery

  return (
    <div
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
      {isActive && (
        <TabButtons hasError={!!sqlError} onClickError={() => setSqlSidePanel(!sqlSidePanel)}>
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
        </TabButtons>
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
            wrapperProps={{
              className: css`
                flex: 1;
                width: 0 !important;
              `
            }}
          />
        ) : (
          <SQLEditor
            className={css`
              flex: 1;
              width: 0 !important;
            `}
            key={id}
            blockId={block.id}
            value={sql}
            storyId={storyId}
            padding={{ top: 20, bottom: 0 }}
            languageId={profileType}
            onChange={setSql}
            isActive={isActive}
            onRun={latestRun}
            onSave={latestSave}
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
    </div>
  )
}

const TabButtons: ReactFCWithChildren<{
  hasError: boolean
  onClickError: React.MouseEventHandler<HTMLButtonElement> | undefined
}> = ({ onClickError, hasError, children }) => {
  return ReactDOM.createPortal(
    <div
      className={css`
        display: flex;
        height: 100%;
        align-items: center;
      `}
    >
      <TippySingletonContextProvider arrow={false}>
        <div
          className={css`
            display: inline-flex;
            align-items: center;
            > * {
              margin: 0 10px;
            }
          `}
        >
          {hasError && (
            <IconButton icon={IconCommonError} color={ThemingVariables.colors.negative[0]} onClick={onClickError} />
          )}
          {children}
        </div>
      </TippySingletonContextProvider>
    </div>,
    document.getElementById('questions-editor-tab-slot')!
  )
}

const emitFalsyObject = (object: EditorDraft) => {
  if (Object.values(object).some((value) => value !== undefined)) {
    return object
  }
  return undefined
}

export const DraftStatus: ReactFCWithChildren<{
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
