import {
  IconVisualizationTable,
  IconVisualizationCombo,
  IconVisualizationLine,
  IconVisualizationBar,
  IconVisualizationArea,
  IconVisualizationPie,
  IconVisualizationScatter,
  IconVisualizationNumber
} from '@app/assets/icons'
import { useBlock } from '@app/hooks/api'
import { ThemingVariables } from '@app/styles'
import { Editor } from '@app/types'
import { css } from '@emotion/css'
import IconButton from './kit/IconButton'
import { Type } from './v11n/types'

const icons = {
  [Type.TABLE]: IconVisualizationTable,
  [Type.COMBO]: IconVisualizationCombo,
  [Type.LINE]: IconVisualizationLine,
  [Type.BAR]: IconVisualizationBar,
  [Type.AREA]: IconVisualizationArea,
  [Type.PIE]: IconVisualizationPie,
  [Type.SCATTER]: IconVisualizationScatter,
  [Type.NUMBER]: IconVisualizationNumber
}

export default function SideBarVisualizationConfig(props: { storyId: string; blockId: string }) {
  const block = useBlock<Editor.VisualizationBlock>(props.blockId)
  const config = block.data?.content?.visualization

  return (
    <div
      className={css`
        padding: 14px 8px;
      `}
    >
      {Object.values(Type).map((t) => (
        <IconButton
          key={t}
          icon={icons[t]}
          color={t === config?.type ? ThemingVariables.colors.primary[1] : ThemingVariables.colors.gray[0]}
          className={css`
            margin: 2px;
            border-radius: 8px;
            height: 32px;
            width: 32px;
            background: ${t === config?.type ? ThemingVariables.colors.primary[4] : undefined};
            display: inline-flex;
            align-items: center;
            justify-content: center;
          `}
          onClick={() => {
            console.log(123)
          }}
        />
      ))}
    </div>
  )
}
