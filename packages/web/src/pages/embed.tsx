import { IconMiscNoResult } from '@app/assets/icons'
import { BlockingUI } from '@app/components/BlockingUI'
import { BlockTitle } from '@app/components/editor'
import { charts } from '@app/components/v11n/charts'
import { Diagram } from '@app/components/v11n/Diagram'
import { Config, Type } from '@app/components/v11n/types'
import { useBlockSuspense, useSnapshot } from '@app/hooks/api'
import { ThemingVariables } from '@app/styles'
import { Editor } from '@app/types'
import { css } from '@emotion/css'
import React, { forwardRef, useMemo } from 'react'
import { useParams } from 'react-router'

const Page = () => {
  const { id } = useParams<{ id: string }>()
  if (!id) return null

  return (
    <>
      <React.Suspense fallback={<BlockingUI blocking />}>
        <VisulizationBlockEmbed blockId={id} />
      </React.Suspense>
    </>
  )
}

const VisulizationBlockEmbed: React.FC<{ blockId: string }> = ({ blockId }) => {
  const block = useBlockSuspense<Editor.VisualizationBlock>(blockId)
  const queryBlock = useBlockSuspense<Editor.QueryBlock>(block.content?.queryId!)
  return (
    <>
      <div
        className={css`
          display: flex;
          height: 100vh;
          flex-direction: column;
          padding: 20px;
          background: #fff;
        `}
      >
        <div
          className={css`
            color: ${ThemingVariables.colors.text[0]};
            font-size: 24px;
            flex: 0;
          `}
        >
          <BlockTitle block={queryBlock} />
        </div>
        <div
          className={css`
            height: 1px;
            width: 100%;
            background: ${ThemingVariables.colors.gray[1]};
            margin-top: 5px;
            margin-bottom: 20px;
          `}
        ></div>
        <QuestionBlockBody
          storyId={block.storyId!}
          blockId={block.id}
          snapshotId={queryBlock.content?.snapshotId}
          visualization={block.content?.visualization}
        />
      </div>
    </>
  )
}

const _QuestionBlockBody: React.ForwardRefRenderFunction<
  HTMLDivElement | null,
  { storyId: string; blockId: string; snapshotId?: string | null; visualization?: Config<Type> }
> = ({ storyId, blockId, snapshotId, visualization }, ref) => {
  const snapshot = useSnapshot(snapshotId)

  const visualizationConfig = useMemo(() => {
    // ensure snapshot data is valid
    if (snapshot?.data && typeof snapshot?.data === 'object' && !snapshot.data.errMsg) {
      return visualization ?? charts[Type.TABLE].initializeConfig(snapshot.data, {})
    } else {
      return undefined
    }
  }, [snapshot, visualization])

  return (
    <div
      ref={ref}
      onCopy={(e) => {
        e.stopPropagation()
      }}
      className={css`
        width: 100%;
        min-height: 100px;
        min-width: 100px;
        user-select: text;
        flex: 1;
      `}
    >
      {visualizationConfig && snapshot?.data && snapshot.data.fields ? (
        <Diagram
          storyId={storyId}
          blockId={blockId}
          data={snapshot.data}
          config={visualizationConfig as never}
          className={css`
            width: 100%;
            height: 100%;
          `}
        ></Diagram>
      ) : (
        <div
          className={css`
            height: 100%;
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
          `}
        >
          <IconMiscNoResult />
          <div
            className={css`
              font-style: normal;
              font-weight: 500;
              font-size: 14px;
              line-height: 17px;
              color: ${ThemingVariables.colors.primary[1]};
              opacity: 0.3;
              margin-top: 10px;
            `}
          >
            No Result
          </div>
        </div>
      )}
    </div>
  )
}

const QuestionBlockBody = forwardRef(_QuestionBlockBody)
export default Page
