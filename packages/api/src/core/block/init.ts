import _ from 'lodash'
import { register } from '.'
import { BlockType } from '../../types/block'
import { BookmarkBlock } from './bookmark'
import { BulletedListBlock } from './bulletedList'
import { CalloutBlock } from './callout'
import { CodeBlock } from './code'
import { CodepenBlock } from './codepen'
import { ColumnBlock } from './column'
import { DataViewBlock } from './dataView'
import { DividerBlock } from './divider'
import { EmbedBlock } from './embed'
import { EquationBlock } from './equation'
import { ExcalidrawBlock } from './excalidraw'
import { FigmaBlock } from './figma'
import { FileBlock } from './file'
import { GistBlock } from './gist'
import { GoogleDriveBlock } from './googleDrive'
import { Heading1Block } from './heading1'
import { Heading2Block } from './heading2'
import { Heading3Block } from './heading3'
import { ImageBlock } from './image'
import { MetabaseBlock } from './metabse'
import { NumberListBlock } from './numberList'
import { ObservablehqBlock } from './observeablehq'
import { QuestionBlock } from './question'
import { QuoteBlock } from './quote'
import { RowBlock } from './row'
import { StoryBlock } from './story'
import { StoryLinkBlock } from './storyLink'
import { TableBlock } from './table'
import { TextBlock } from './text'
import { ThoughtBlock } from './thought'
import { TODOBlock } from './todo'
import { ToggleBlock } from './toggle'
import { TweetBlock } from './tweet'
import { VideoBlock } from './video'
import { QuestionReferenceBlock } from './questionReference'
import { YouTubeBlock } from './youtube'



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
  [BlockType.EMBED]: FigmaBlock,
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
  [BlockType.EMBED]: EmbedBlock,
  [BlockType.BOOKMARK]: BookmarkBlock,
  [BlockType.CODEPEN]: CodepenBlock,
  [BlockType.EXCALIDRAW]: ExcalidrawBlock,
  [BlockType.GIST]: GistBlock,
  [BlockType.GOOGLE_DRIVE]: GoogleDriveBlock,
  [BlockType.METABASE]: MetabaseBlock,
  [BlockType.FIGMA]: FigmaBlock,
  [BlockType.OBSERVEABLEHQ]: ObservablehqBlock,
  [BlockType.STORY_LINK]: StoryLinkBlock,
  [BlockType.TWEET]: TweetBlock,
  [BlockType.QUESTION_REFERENCE]: QuestionReferenceBlock,
  [BlockType.YOUTUBE]: YoutubeBlock
}

_(blockConstructors).forEach((v, k) => {
  register(k as BlockType, v)
})
