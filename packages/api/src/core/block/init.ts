import _ from 'lodash'

import { register } from '.'
import { BlockType } from '../../types/block'
import { BulletedListBlock } from './bulletedList'
import { CalloutBlock } from './callout'
import { CodeBlock } from './code'
import { ColumnBlock } from './column'
import { DataViewBlock } from './dataView'
import { DividerBlock } from './divider'
import { EquationBlock } from './equation'
import { FileBlock } from './file'
import { Heading1Block } from './heading1'
import { Heading2Block } from './heading2'
import { Heading3Block } from './heading3'
import { ImageBlock } from './image'
import { NumberListBlock } from './numberList'
import { QuestionBlock } from './question'
import { QuoteBlock } from './quote'
import { RowBlock } from './row'
import { StoryBlock } from './story'
import { TableBlock } from './table'
import { TextBlock } from './text'
import { ThoughtBlock } from './thought'
import { TODOBlock } from './todo'
import { ToggleBlock } from './toggle'
import { VideoBlock } from './video'

// record all block types
const blockConstructors = {
  [BlockType.BULLETED_LIST]: BulletedListBlock,
  [BlockType.CALLOUT]: CalloutBlock,
  [BlockType.DATA_VIEW]: DataViewBlock,
  [BlockType.EQUATION]: EquationBlock,
  [BlockType.FILE]: FileBlock,
  [BlockType.CODE]: CodeBlock,
  [BlockType.HEADING_1]: Heading1Block,
  [BlockType.HEADING_2]: Heading2Block,
  [BlockType.HEADING_3]: Heading3Block,
  [BlockType.IMAGE]: ImageBlock,
  [BlockType.NUMBERED_LIST]: NumberListBlock,
  [BlockType.STORY]: StoryBlock,
  [BlockType.QUESTION]: QuestionBlock,
  [BlockType.QUOTE]: QuoteBlock,
  [BlockType.TABLE]: TableBlock,
  [BlockType.TEXT]: TextBlock,
  [BlockType.THOUGHT]: ThoughtBlock,
  [BlockType.TODO]: TODOBlock,
  [BlockType.TOGGLE]: ToggleBlock,
  [BlockType.VIDEO]: VideoBlock,
  [BlockType.DIVIDER]: DividerBlock,
  [BlockType.ROW]: RowBlock,
  [BlockType.COLUMN]: ColumnBlock,
}

_(blockConstructors).forEach((v, k) => {
  register(k as BlockType, v)
})
