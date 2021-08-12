import { css } from '@emotion/css'
import { MouseEvent, useEffect, useRef } from 'react'
import scrollIntoView from 'scroll-into-view-if-needed'
import {
  IconCommonBlock,
  IconCommonSearch,
  IconCommonQuestion,
  IconCommonStoryBlock,
  IconCommonDbt
} from '@app/assets/icons'
import { ThemingVariables } from '@app/styles'

export enum ResultType {
  BLOCK,
  STORY,
  QUESTION,
  MORE,
  DBT
}

export function OmniBoxItem(props: {
  item: {
    id: string
    type: ResultType
    text?: string
    html?: string
    subText?: string
  }
  active: boolean
  setActive: () => void
  onClick: (e: MouseEvent) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (props.active && ref.current) {
      scrollIntoView(ref.current, {
        scrollMode: 'always',
        block: 'nearest',
        inline: 'nearest'
      })
    }
  }, [props.active])

  return (
    <div
      ref={ref}
      className={css`
        height: 52px;
        padding: 8px;
        color: ${ThemingVariables.colors.text[0]};
        display: flex;
        margin-bottom: 8px;
        border-radius: 8px;
        font-size: 14px;
        cursor: pointer;
        overflow: hidden;
        &:active {
          background-color: ${ThemingVariables.colors.primary[4]};
        }
      `}
      style={props.active ? { backgroundColor: ThemingVariables.colors.primary[4] } : undefined}
      onClick={props.onClick}
      onMouseMove={props.setActive}
    >
      {
        {
          [ResultType.BLOCK]: (
            <IconCommonBlock
              color={ThemingVariables.colors.gray[0]}
              className={css`
                flex-shrink: 0;
              `}
            />
          ),
          [ResultType.QUESTION]: (
            <IconCommonQuestion
              color={ThemingVariables.colors.gray[0]}
              className={css`
                flex-shrink: 0;
              `}
            />
          ),
          [ResultType.DBT]: (
            <IconCommonDbt
              color={ThemingVariables.colors.gray[0]}
              className={css`
                flex-shrink: 0;
              `}
            />
          ),
          [ResultType.STORY]: (
            <IconCommonStoryBlock
              color={ThemingVariables.colors.gray[0]}
              className={css`
                flex-shrink: 0;
              `}
            />
          ),
          [ResultType.MORE]: (
            <IconCommonSearch
              color={ThemingVariables.colors.gray[0]}
              className={css`
                flex-shrink: 0;
              `}
            />
          )
        }[props.item.type]
      }
      <div
        className={css`
          width: calc(100% - 32px);
          margin-left: 10px;
        `}
      >
        <div
          className={css`
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            word-wrap: break-word;
            font-weight: 400;
            color: ${ThemingVariables.colors.text[1]};

            & > em {
              font-style: normal;
              font-weight: 600;
              color: ${ThemingVariables.colors.text[0]};
            }
          `}
          title={props.item.text}
          dangerouslySetInnerHTML={{ __html: props.item.html || props.item.text || '' }}
        />
        <div
          className={css`
            font-size: 14px;
            color: ${ThemingVariables.colors.text[2]};
            white-space: nowrap;
            word-wrap: break-word;
            overflow: hidden;
            text-overflow: ellipsis;

            & > em {
              font-style: normal;
              font-weight: 600;
              color: ${ThemingVariables.colors.text[0]};
            }
          `}
          title={props.item.subText}
        >
          {props.item.subText}
        </div>
      </div>
    </div>
  )
}
