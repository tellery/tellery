import { IconMiscNoResult } from '@app/assets/icons'
import { BlockingUI } from '@app/components/BlockingUI'
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
  return <QuestionBlockBody snapshotId={queryBlock.content?.snapshotId} visualization={block.content?.visualization} />
}

const _QuestionBlockBody: React.ForwardRefRenderFunction<
  HTMLDivElement | null,
  { snapshotId?: string | null; visualization?: Config<Type> }
> = ({ snapshotId, visualization }, ref) => {
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
        height: 100%;
        width: 100%;
        min-height: 100px;
        min-width: 100px;
        user-select: text;
        position: absolute;
        padding: 0;
        left: 0;
        top: 0;
      `}
    >
      {visualizationConfig && snapshot?.data && snapshot.data.fields ? (
        <Diagram
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
