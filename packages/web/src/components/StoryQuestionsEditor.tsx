import {
  IconCommonArrowDropDown,
  IconCommonClose,
  IconCommonDbt,
  IconCommonDownstream,
  IconCommonError,
  IconCommonMetrics,
  IconCommonRun,
  IconCommonSave,
  IconCommonSql,
  IconVisualizationSetting
} from '@app/assets/icons'
import { SQLEditor } from '@app/components/SQLEditor'
import { Configuration } from '@app/components/v11n'
import { useHover, useOpenStory, usePrevious } from '@app/hooks'
import {
  useBlockSuspense,
  useConnectorsListProfiles,
  useExecuteSQL,
  useQuestionDownstreams,
  useSnapshot
} from '@app/hooks/api'
import { useCommit } from '@app/hooks/useCommit'
import { useLocalStorage } from '@app/hooks/useLocalStorage'
import { usePushFocusedBlockIdState } from '@app/hooks/usePushFocusedBlockIdState'
import { useSqlEditor } from '@app/hooks/useSqlEditor'
import { useStoryPermissions } from '@app/hooks/useStoryPermissions'
import { useWorkspace } from '@app/hooks/useWorkspace'
import { useCreateSnapshot } from '@app/store/block'
import { ThemingVariables } from '@app/styles'
import { Editor, Story } from '@app/types'
import { blockIdGenerator, DRAG_HANDLE_WIDTH, queryClient } from '@app/utils'
import { css, cx } from '@emotion/css'
import Tippy from '@tippyjs/react'
import { dequal } from 'dequal'
import { motion, useMotionValue, useTransform } from 'framer-motion'
import { produce } from 'immer'
import isHotkey from 'is-hotkey'
import React, { SetStateAction, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useIsMutating } from 'react-query'
import { toast } from 'react-toastify'
import { Tab, TabList, TabPanel, TabStateReturn, useTabState } from 'reakit/Tab'
import { atom, useRecoilCallback, useRecoilState } from 'recoil'
import invariant from 'tiny-invariant'
import { setBlockTranscation } from '../context/editorTranscations'
import { CircularLoading } from './CircularLoading'
import { BlockTitle, useGetBlockTitleTextSnapshot } from './editor'
import { isExecuteableBlockType } from './editor/Blocks/utils'
import type { SetBlock } from './editor/types'
import IconButton from './kit/IconButton'
import QuestionDownstreams from './QuestionDownstreams'
import { charts } from './v11n/charts'
import { Config, Type } from './v11n/types'
import MonacoEditor from '@monaco-editor/react'
import { omit } from 'lodash'
import YAML from 'yaml'

type Mode = 'SQL' | 'VIS' | 'DOWNSTREAM'

export interface QuestionEditor {
  close: (arg: string) => Promise<void>
  open: (arg: { mode: Mode }) => Promise<void>
}

export const useDraftBlockMutating = (blockId: string) => {
  const refreshingSnapshot = useIsMutating({
    predicate: (mutation) => (mutation.options.mutationKey as string) === `draft/${blockId}`
  })

  return refreshingSnapshot
}
interface EditorDraft {
  sql?: string
  visConfig?: Config<Type>
  snapshotId?: string
}

export const questionEditorBlockMapState = atom<
  Record<
    string,
    {
      storyId: string
      draft?: EditorDraft
      mode: string
    }
  >
>({
  key: 'questionEditorBlockMapState',
  default: {}
})

export const questionEditorOpenState = atom<boolean>({ key: 'questionEditorOpenState', default: false })

export const questionEditorActiveIdState = atom<string | null>({ key: 'questionEditorActiveIdState', default: null })

const updateOldDraft = (oldDraft?: EditorDraft, block?: Editor.SQLLikeBlock) => {
  if (!oldDraft) return undefined

  const updatedDraft = emitFalsyObject({
    ...oldDraft,
    sql: oldDraft.sql !== block?.content?.sql ? oldDraft.sql : undefined,
    visConfig: dequal(oldDraft.visConfig, block?.content?.visualization) === false ? oldDraft.visConfig : undefined,
    snapshotId: oldDraft.snapshotId !== block?.content?.snapshotId ? oldDraft.snapshotId : undefined
  })

  return updatedDraft
}

export const useQuestionEditor = () => {
  const openQuestionBlockHandler = useOpenQuestionBlockIdHandler()
  const cleanQuestionEditorHandler = useCleanQuestionEditorHandler()

  return useMemo(() => {
    return {
      close: cleanQuestionEditorHandler,
      open: openQuestionBlockHandler
    }
  }, [cleanQuestionEditorHandler, openQuestionBlockHandler])
}

export const useCleanQuestionEditorHandler = () => {
  const handler = useRecoilCallback(
    (recoilCallback) => async (arg: string) => {
      const blockId = arg
      const blockMap = await recoilCallback.snapshot.getPromise(questionEditorBlockMapState)
      if (blockMap[blockId]) {
        recoilCallback.set(questionEditorBlockMapState, (state) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { [blockId]: _removed, ...rest } = state
          return rest
        })
      }
    },
    []
  )

  return handler
}

export const useOpenQuestionBlockIdHandler = () => {
  const handler = useRecoilCallback(
    (recoilCallback) =>
      ({ mode, blockId, storyId }: { mode: Mode; blockId: string; storyId: string }) => {
        recoilCallback.set(questionEditorActiveIdState, blockId)
        recoilCallback.set(questionEditorOpenState, true)
        recoilCallback.set(questionEditorBlockMapState, (state) => {
          return {
            ...state,
            [blockId]: {
              ...state[blockId],
              storyId,
              mode
            }
          }
        })
      },
    []
  )
  return handler
}

const DragConstraints = {
  top: -700,
  bottom: -300
}

const _StoryQuestionsEditor = () => {
  const [open, setOpen] = useRecoilState(questionEditorOpenState)
  const [resizeConfig, setResizeConfig] = useLocalStorage('MainSQLEditorConfig_v2', {
    y: -300
  })

  const y = useMotionValue(resizeConfig.y)
  const height = useTransform(y, (y) => Math.abs(y - 0.5 * DRAG_HANDLE_WIDTH))

  useEffect(() => {
    const unsubscribe = y.onChange((y) => {
      if (!y) return
      setResizeConfig((config) => ({ ...config, y: y }))
    })
    return () => {
      unsubscribe()
    }
  }, [setResizeConfig, y])
  const workspace = useWorkspace()
  const { data: profiles } = useConnectorsListProfiles(workspace.preferences.connectorId)
  const profileType = useMemo(
    () => profiles?.find((profile) => profile.name === workspace.preferences.profile)?.type,
    [profiles, workspace.preferences.profile]
  )
  useSqlEditor(profileType)

  return (
    <>
      <div
        style={{
          height: open ? `${height.get()}px` : '0px',
          flexShrink: 0
        }}
      ></div>
      <motion.div
        style={{
          height: height,
          transform: open ? 'translateY(0%)' : 'translateY(100%)'
        }}
        transition={{ duration: 0.15 }}
        className={css`
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          width: 100%;
          user-select: none;
          z-index: 1000;
          box-shadow: 0px -1px 0px ${ThemingVariables.colors.gray[1]};
          transition: transform 0.25s;
          display: flex;
          flex-direction: column;
          background-color: ${ThemingVariables.colors.gray[5]};
        `}
      >
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
        <EditorContent />
      </motion.div>
    </>
  )
}

export const StoryQuestionsEditor = _StoryQuestionsEditor

const TabHeader: React.FC<{ blockId: string; hovering: boolean }> = ({ blockId, hovering }) => {
  const [questionBlocksMap, setQuestionBlocksMap] = useRecoilState(questionEditorBlockMapState)
  const [activeId, setActiveId] = useRecoilState(questionEditorActiveIdState)
  const opendQuestionBlockIds = useMemo(() => {
    return Object.keys(questionBlocksMap)
  }, [questionBlocksMap])
  // const [ref, hovering] = useHover<HTMLDivElement>()

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

  const block = useBlockSuspense<Editor.SQLLikeBlock | Editor.VisualizationBlock>(blockId)

  const sqlBlock = useBlockSuspense<Editor.SQLLikeBlock>(
    (block as Editor.VisualizationBlock)?.content?.dataAssetId ?? blockId
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
        title={getBlockTitle(sqlBlock)}
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
          <BlockTitle block={sqlBlock} />
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

const QuestionTab: React.FC<{ id: string; tab: TabStateReturn; isActive: boolean; onClick: () => void }> = ({
  id,
  tab,
  isActive,
  onClick
}) => {
  const [ref, hover] = useHover<HTMLButtonElement>()
  return (
    <Tab
      key={id}
      {...tab}
      ref={ref}
      onClick={onClick}
      className={cx(
        css`
          height: 36px;
          margin-top: 4px;
          font-style: normal;
          font-weight: normal;
          font-size: 14px;
          line-height: 16px;
          display: inline-flex;
          align-items: center;
          padding: 8px 15px;
          cursor: pointer;
          border-radius: 8px 8px 0 0;
          outline: none;
          border: none;
        `,
        isActive
          ? css`
              background: ${ThemingVariables.colors.primary[5]};
              color: ${ThemingVariables.colors.text[0]};
            `
          : css`
              background: ${ThemingVariables.colors.primary[4]};
              color: ${ThemingVariables.colors.text[1]};
            `
      )}
    >
      <TabHeader blockId={id} hovering={hover} />
    </Tab>
  )
}

export const EditorContent = () => {
  const [questionBlocksMap, setQuestionBlocksMap] = useRecoilState(questionEditorBlockMapState)
  const [activeId, setActiveId] = useRecoilState(questionEditorActiveIdState)
  const [open, setOpen] = useRecoilState(questionEditorOpenState)
  const tab = useTabState()

  const opendQuestionBlockIds = useMemo(() => {
    return Object.keys(questionBlocksMap)
  }, [questionBlocksMap])

  useEffect(() => {
    // tab.setCurrentId(activeId)
    tab.setSelectedId(activeId)
  }, [activeId, tab])

  const isDirty = useMemo(() => {
    return opendQuestionBlockIds.some((id) => {
      return !!questionBlocksMap[id].draft
    })
  }, [opendQuestionBlockIds, questionBlocksMap])

  useEffect(() => {
    if (opendQuestionBlockIds.length === 0) {
      setActiveId(null)
      setOpen(false)
    }
  }, [opendQuestionBlockIds, setActiveId, setOpen])

  return (
    <>
      <TabList
        {...tab}
        aria-label="Question Editor Tabs"
        className={css`
          background: ${ThemingVariables.colors.primary[4]};
          box-shadow: 0px -1px 0px ${ThemingVariables.colors.gray[1]};
          padding: 0 10px;
          display: flex;
          height: 40px;
          position: relative;
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
            ::-webkit-scrollbar {
              display: none;
            }
          `}
        >
          {opendQuestionBlockIds?.map((id) => {
            return (
              <React.Suspense key={id} fallback={<div>loading...</div>}>
                <QuestionTab id={id} isActive={id === activeId} tab={tab} onClick={() => setActiveId(id)} />
              </React.Suspense>
            )
          })}
        </div>
        <IconButton
          icon={IconCommonClose}
          color={ThemingVariables.colors.text[0]}
          className={css`
            margin-left: auto;
            cursor: pointer;
            align-self: center;
            padding: 0 10px;
            flex-shrink: 0;
          `}
          onClick={() => {
            if (isDirty) {
              if (confirm("Close without saving? Your changes will be lost if you don't save them.") === false) {
                return
              }
            }
            setOpen(false)
          }}
        />
      </TabList>
      {opendQuestionBlockIds.map((id) => (
        <React.Suspense key={id} fallback={<div>loading...</div>}>
          <StoryQuestionEditor tab={tab} id={id} setActiveId={setActiveId} />
        </React.Suspense>
      ))}
    </>
  )
}

export const StoryQuestionEditor: React.FC<{
  id: string
  setActiveId: (update: SetStateAction<string | null>) => void | Promise<void>
  tab: TabStateReturn
  // block: Editor.QuestionBlock
  // originalBlock: Editor.QuestionBlock
}> = ({ id, setActiveId, tab }) => {
  const block = useBlockSuspense<Editor.VisualizationBlock | Editor.SQLLikeBlock>(id)
  const visualizationBlock: Editor.VisualizationBlock | null =
    block.type === Editor.BlockType.Visualization ? block : null
  const sqlBlock = useBlockSuspense<Editor.SQLLikeBlock>(visualizationBlock?.content?.dataAssetId ?? id)
  const [questionBlocksMap, setQuestionBlocksMap] = useRecoilState(questionEditorBlockMapState)
  const [sqlSidePanel, setSqlSidePanel] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const questionBlockState = useMemo(() => {
    if (id && questionBlocksMap && questionBlocksMap[id]) {
      return questionBlocksMap[id]
    }
    return null
  }, [id, questionBlocksMap])

  const commit = useCommit()

  const setVisualizationBlock = useCallback<SetBlock<Editor.VisualizationBlock>>(
    (id, update) => {
      if (!visualizationBlock) return
      const oldBlock = visualizationBlock
      const newBlock = produce(oldBlock, update)

      commit({
        transcation: setBlockTranscation({ oldBlock, newBlock }),
        storyId: oldBlock.storyId!
      })
    },
    [commit, visualizationBlock]
  )

  const setSqlBlock = useCallback<SetBlock<Editor.SQLLikeBlock>>(
    (id, update) => {
      const oldBlock = sqlBlock
      const newBlock = produce(oldBlock, update)

      commit({
        transcation: setBlockTranscation({ oldBlock, newBlock }),
        storyId: sqlBlock.storyId!
      })
    },
    [commit, sqlBlock]
  )

  const permissions = useStoryPermissions(visualizationBlock?.storyId ?? block.id)

  const mode = questionBlockState?.mode ?? 'VIS'
  const readonly = permissions.readonly
  const isDraftSql = !!questionBlockState?.draft?.sql
  const isDraft = !!questionBlockState?.draft
  const originalSQL = sqlBlock?.content?.sql
  const sql = questionBlockState?.draft?.sql ?? originalSQL ?? ''
  const snapShotId = questionBlockState?.draft?.snapshotId ?? sqlBlock?.content?.snapshotId

  const snapshot = useSnapshot(snapShotId)

  useEffect(() => {
    setQuestionBlocksMap((blocksMap) => {
      return {
        ...blocksMap,
        [id]: {
          ...blocksMap[id],
          draft: updateOldDraft(updateOldDraft(blocksMap[id].draft, visualizationBlock ?? sqlBlock), sqlBlock)
        }
      }
    })
  }, [sqlBlock, visualizationBlock, id, setQuestionBlocksMap])

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

  const previousSnapshot = usePrevious(snapshot)

  const visualizationConfig = useMemo(() => {
    if (snapshot?.data && typeof snapshot?.data === 'object' && !snapshot.data.errMsg) {
      return (
        questionBlockState?.draft?.visConfig ??
        block?.content?.visualization ??
        charts[Type.TABLE].initializeConfig(snapshot.data, {})
      )
    } else {
      return undefined
    }
  }, [block?.content?.visualization, questionBlockState?.draft?.visConfig, snapshot?.data])

  const setVisConfig = useCallback<
    (config: Config<Type> | undefined | ((config: Config<Type> | undefined) => Config<Type> | undefined)) => void
  >(
    (update) => {
      setQuestionBlocksMap((blocksMap) => {
        const oldConfig = visualizationConfig
        const newConfig = typeof update === 'function' ? update(oldConfig ?? undefined) : update
        return {
          ...blocksMap,
          [id]: {
            ...blocksMap[id],
            draft: emitFalsyObject({
              ...blocksMap[id].draft,
              visConfig: dequal(newConfig, block.content?.visualization) ? undefined : newConfig
            })
          }
        }
      })
    },
    [block.content?.visualization, id, setQuestionBlocksMap, visualizationConfig]
  )

  useEffect(() => {
    if (previousSnapshot?.data && snapshot?.data) {
      if (dequal(previousSnapshot.data.fields, snapshot?.data.fields) === false) {
        setVisConfig((old) => charts[old?.type || Type.TABLE].initializeConfig(snapshot?.data, {}))
      }
    }
  }, [previousSnapshot, setVisConfig, snapshot])

  const setSnapshotId = useCallback(
    (snapshotId: string) => {
      setQuestionBlocksMap((blocksMap) => {
        return {
          ...blocksMap,
          [id]: {
            ...blocksMap[id],
            draft: emitFalsyObject({
              ...blocksMap[id].draft,
              snapshotId: snapshotId
            })
          }
        }
      })
    },
    [id, setQuestionBlocksMap]
  )

  const setMode = useCallback(
    (mode: Mode) => {
      setQuestionBlocksMap((blocksMap) => {
        return {
          ...blocksMap,
          [id]: {
            ...blocksMap[id],
            mode
          }
        }
      })
    },
    [id, setQuestionBlocksMap]
  )

  const executeSQL = useExecuteSQL(`draft/${block.id}`)

  const save = useCallback(async () => {
    if (!block) {
      toast.error('block is undefined')
      return
    }
    if (isDraft !== true) return
    if (readonly) {
      toast.error('question is readonly')
      return
    }
    setSqlBlock(sqlBlock.id, (draftBlock) => {
      draftBlock.content!.sql = sql
      draftBlock.content!.snapshotId = snapShotId
      draftBlock.content!.error = null
      draftBlock.content!.lastRunAt = Date.now()
    })
    setVisualizationBlock(block.id, (draftBlock) => {
      draftBlock.content!.visualization = visualizationConfig
    })
  }, [block, isDraft, readonly, setSqlBlock, sqlBlock.id, setVisualizationBlock, sql, snapShotId, visualizationConfig])

  const [sqlError, setSQLError] = useState<string | null>(null)

  // const mutateBlock = useMutateBlock<Editor.QuestionBlock>()
  const workspace = useWorkspace()
  const { data: profiles } = useConnectorsListProfiles(workspace.preferences.connectorId)
  const profileType = useMemo(
    () => profiles?.find((profile) => profile.name === workspace.preferences.profile)?.type,
    [profiles, workspace.preferences.profile]
  )
  const createSnapshot = useCreateSnapshot()

  const run = useCallback(async () => {
    if (!sqlBlock) return
    if (!sql) return

    if (!isExecuteableBlockType(sqlBlock.type)) {
      return
    }
    const data = await executeSQL.mutateAsync({
      workspaceId: workspace.id,
      sql,
      questionId: sqlBlock.id,
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
    // queryClient.setQueryData(['snapshot', snapshotId], { id: snapshotId, data, sql })
    if (isDraftSql) {
      // TODO: fix snap shot question id
      await createSnapshot({
        snapshotId,
        questionId: sqlBlock.id,
        sql: sql,
        data: data,
        workspaceId: workspace.id
      })
      setSnapshotId(snapshotId)
    } else {
      const originalBlockId = sqlBlock.id
      invariant(sqlBlock, 'originalBlock is undefined')
      // mutateBlock(
      //   originalBlockId,
      //   { ...originalBlock, content: { ...originalBlock.content, snapshotId: snapshotId } },
      //   false
      // )
      // TODO: fix snap shot question id
      await createSnapshot({
        snapshotId,
        questionId: originalBlockId,
        sql: sql,
        data: data,
        workspaceId: workspace.id
      })

      if (!readonly) {
        setSqlBlock(sqlBlock.id, (draftBlock: Editor.SQLLikeBlock) => {
          draftBlock.content!.snapshotId = snapshotId
        })
      }
    }
    setMode('VIS')
  }, [
    sql,
    createSnapshot,
    executeSQL,
    workspace.id,
    workspace.preferences.connectorId,
    workspace.preferences.profile,
    isDraftSql,
    setMode,
    setSnapshotId,
    sqlBlock,
    readonly,
    setSqlBlock
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
        },
        {
          hotkeys: ['alt+v'],
          handler: (e) => {
            e.preventDefault()
            e.stopPropagation()
            setMode('VIS')
          }
        },
        {
          hotkeys: ['alt+s'],
          handler: (e) => {
            e.preventDefault()
            e.stopPropagation()
            setMode('SQL')
          }
        }
      ]
      const matchingHandler = handlers.find((handler) =>
        handler.hotkeys.some((hotkey) => isHotkey(hotkey, { byKey: true }, e.nativeEvent))
      )
      matchingHandler?.handler(e.nativeEvent)
    },
    [run, save, setMode]
  )

  const story = useBlockSuspense<Story>(block.storyId!)

  const mutatingCount = useDraftBlockMutating(block.id)
  const openStory = useOpenStory()
  const { data: downstreams } = useQuestionDownstreams(block.id)
  const pushFocusedBlockIdState = usePushFocusedBlockIdState()

  const scrollToBlock = useCallback(() => {
    pushFocusedBlockIdState(block.id, block.storyId)
  }, [block.id, block.storyId, pushFocusedBlockIdState])
  const isDBT = block.type === Editor.BlockType.DBT

  const sqlReadOnly =
    readonly || sqlBlock.type === Editor.BlockType.SnapshotBlock || sqlBlock.storyId !== visualizationBlock?.storyId

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
          height: calc(100% - 40px);
        `
      )}
      ref={ref}
      onKeyDown={keyDownHandler}
    >
      <div
        className={css`
          background-color: ${ThemingVariables.colors.primary[5]};
          padding: 4px 10px;
          display: flex;
          height: 40px;
          z-index: 2;
        `}
      >
        <div
          className={css`
            flex: 1;
            align-items: center;
            justify-content: center;
            display: flex;
          `}
        >
          <div
            className={css`
              outline: none;
              border: none;
              background: transparent;
              font-style: normal;
              font-weight: 500;
              font-size: 20px;
              text-align: center;
              font-weight: 500;
              font-size: 14px;
              line-height: 24px;
              color: ${ThemingVariables.colors.text[0]};
              display: flex;
              align-items: center;
            `}
          >
            {story && !isDBT && (
              <>
                <a
                  className={css`
                    cursor: pointer;
                    color: ${ThemingVariables.colors.text[1]};
                  `}
                  onClick={(e) => {
                    openStory(story.id, { blockId: block.id, isAltKeyPressed: e.altKey })
                  }}
                >
                  <BlockTitle block={story} />
                </a>
                <IconCommonArrowDropDown
                  className={css`
                    transform: rotate(-90deg);
                  `}
                />
              </>
            )}
            <span
              className={css`
                cursor: pointer;
              `}
              onClick={scrollToBlock}
            >
              <BlockTitle block={sqlBlock} />
            </span>
            {block.type === Editor.BlockType.Metric ? (
              <IconCommonMetrics
                color={ThemingVariables.colors.text[0]}
                className={css`
                  margin-left: 10px;
                `}
              />
            ) : null}
          </div>
        </div>
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
            {mode === 'SQL' && (sqlError || sqlSidePanel) && (
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
              onClick={mutatingCount !== 0 ? cancelExecuteSql : run}
            />
            {isExecuteableBlockType(sqlBlock.type) && (
              <IconButton
                hoverContent={mutatingCount !== 0 ? 'Cancel Query' : 'Execute Query'}
                icon={mutatingCount !== 0 ? IconCommonClose : IconCommonRun}
                color={ThemingVariables.colors.primary[1]}
                onClick={mutatingCount !== 0 ? cancelExecuteSql : run}
              />
            )}
            <IconButton
              hoverContent="Save"
              disabled={!isDraft || readonly === true}
              icon={IconCommonSave}
              onClick={save}
              color={ThemingVariables.colors.primary[1]}
            />
          </div>
        )}
      </div>
      <div
        className={css`
          display: flex;
          width: 100%;
          height: calc(100% - 40px);
        `}
      >
        <div
          className={css`
            flex-shrink: 0;
            width: 60px;
            background-color: ${ThemingVariables.colors.gray[4]};
            box-shadow: 2px 0px 8px rgba(0, 0, 0, 0.08);
            display: flex;
            flex-direction: column;
            align-items: center;
            z-index: 1;
            & > button {
              padding: 20px;
              position: relative;
            }
            & > button::after {
              content: '';
              width: 4px;
              height: 40px;
              border-radius: 2px;
              background: ${ThemingVariables.colors.primary[1]};
              position: absolute;
              top: 10px;
              right: 0;
            }
          `}
        >
          <Tippy content={isDBT ? 'View DBT' : 'Edit SQL'} arrow={false} placement="right" delay={300}>
            <IconButton
              icon={isDBT ? IconCommonDbt : IconCommonSql}
              className={css`
                &::after {
                  display: ${mode === 'SQL' ? 'visible' : 'none'};
                }
              `}
              color={mode === 'SQL' ? ThemingVariables.colors.primary[1] : ThemingVariables.colors.gray[0]}
              onClick={() => {
                setMode('SQL')
              }}
            />
          </Tippy>
          {block.type === Editor.BlockType.Visualization && (
            <Tippy content="Visualization options" arrow={false} placement="right" delay={300}>
              <IconButton
                icon={IconVisualizationSetting}
                className={css`
                  &::after {
                    display: ${mode === 'VIS' ? 'visible' : 'none'};
                  }
                `}
                color={mode === 'VIS' ? ThemingVariables.colors.primary[1] : ThemingVariables.colors.gray[0]}
                onClick={() => {
                  setMode('VIS')
                }}
              />
            </Tippy>
          )}
          {downstreams.length === 0 || (
            <Tippy content="Downstreams" arrow={false} placement="right" delay={300}>
              <IconButton
                icon={IconCommonDownstream}
                className={css`
                  &::after {
                    display: ${mode === 'DOWNSTREAM' ? 'visible' : 'none'};
                  }
                `}
                color={mode === 'DOWNSTREAM' ? ThemingVariables.colors.primary[1] : ThemingVariables.colors.gray[0]}
                onClick={() => {
                  setMode('DOWNSTREAM')
                }}
              />
            </Tippy>
          )}
        </div>
        {mode === 'SQL' && (
          <>
            {isDBT ? (
              <MonacoEditor
                language="yaml"
                value={YAML.stringify(omit(block.content, 'title'))}
                options={{
                  readOnly: true,
                  padding: { top: 20, bottom: 0 }
                }}
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
          </>
        )}
        {mode === 'VIS' && (
          <Configuration
            data={snapshot?.data}
            config={visualizationConfig}
            onConfigChange={setVisConfig}
            className={cx(
              css`
                flex: 1;
                overflow: hidden;
              `
            )}
          />
        )}
        {mode === 'DOWNSTREAM' && (
          <QuestionDownstreams
            blockId={id}
            className={css`
              flex: 1;
            `}
          />
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
  const [ref, hovering] = useHover<HTMLDivElement>()
  return (
    <div
      ref={ref}
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
      {isDraft && !hovering && (
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
      {(hovering || (!isDraft && showClose)) && (
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
