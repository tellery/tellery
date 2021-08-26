import { useSnapshot } from '@app/hooks/api'
import { useDimensions } from '@app/hooks/useDimensions'
import { ThemingVariables } from '@app/styles'
import { Editor } from '@app/types'
import { css, cx } from '@emotion/css'
import { useEffect, useRef, useState } from 'react'
import { FormButton } from './kit/FormButton'
import { table } from './v11n/charts/table'
import { ConfigLabel } from './v11n/components/ConfigLabel'

export default function MetricConfig(props: { block: Editor.SQLLikeBlock; className?: string }) {
  const [isMetric, setIsMetric] = useState(false)
  useEffect(() => {
    setIsMetric(props.block.type === Editor.BlockType.Metric)
  }, [props.block.type])

  if (!isMetric) {
    return (
      <div
        className={cx(
          css`
            display: flex;
            align-items: center;
            justify-content: center;
          `,
          props.className
        )}
      >
        <FormButton variant="primary" onClick={() => setIsMetric(true)}>
          Convert as data assets
        </FormButton>
      </div>
    )
  }
  return <MetricConfigInner block={props.block} className={props.className} />
}

function MetricConfigInner(props: { block: Editor.SQLLikeBlock; className?: string }) {
  const snapshot = useSnapshot(props.block.content?.snapshotId)
  const [activeFieldIndex, setActiveFieldIndex] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const dimensions = useDimensions(ref, 0)

  return (
    <div
      className={cx(
        css`
          display: flex;
        `,
        props.className
      )}
    >
      <div
        className={css`
          width: 280px;
          flex-shrink: 0;
          border-right: 1px solid ${ThemingVariables.colors.gray[1]};
        `}
      >
        {snapshot?.data.fields.map((field, index) => (
          <div
            key={field.name + index}
            onClick={() => {
              setActiveFieldIndex(index)
            }}
            className={cx(
              css`
                height: 36px;
                border-radius: 8px;
                padding: 0 10px;
                margin: 10px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                cursor: pointer;
              `,
              index === activeFieldIndex &&
                css`
                  background: ${ThemingVariables.colors.primary[1]};
                `
            )}
          >
            <span
              className={cx(
                css`
                  font-size: 14px;
                `,
                index === activeFieldIndex
                  ? css`
                      color: ${ThemingVariables.colors.gray[5]};
                    `
                  : css`
                      color: ${ThemingVariables.colors.text[0]};
                    `
              )}
            >
              {field.name}
            </span>
            <span
              className={cx(
                css`
                  font-size: 12px;
                  font-style: italic;
                  text-transform: lowercase;
                `,
                index === activeFieldIndex
                  ? css`
                      color: ${ThemingVariables.colors.gray[5]};
                      opacity: 0.5;
                    `
                  : css`
                      color: ${ThemingVariables.colors.text[1]};
                    `
              )}
            >
              {field.sqlType}
            </span>
          </div>
        ))}
      </div>
      <div
        className={css`
          width: 320px;
          flex-shrink: 0;
          border-right: 1px solid ${ThemingVariables.colors.gray[1]};
          padding: 20px;
        `}
      >
        <ConfigLabel top={0}>Metric config</ConfigLabel>
        <span
          className={css`
            font-weight: 500;
            font-size: 12px;
            color: ${ThemingVariables.colors.text[1]};
            margin-top: 5px;
          `}
        >
          Name
        </span>
      </div>
      <div
        ref={ref}
        className={css`
          height: 100%;
          width: 0;
          flex: 1;
          padding: 20px;
        `}
      >
        {snapshot?.data ? (
          <table.Diagram
            dimensions={dimensions}
            config={table.initializeConfig(snapshot.data, {})}
            data={snapshot?.data}
          />
        ) : null}
      </div>
    </div>
  )
}
