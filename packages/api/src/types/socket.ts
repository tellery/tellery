export type BroadCastValue = { event: BroadCastEvent; args: BroadCastArgs }

export enum OnEventType {
  USER_ENTER_STORY = 'userEnterStory',
  USER_LEAVE_STORY = 'userLeaveStory',
}

export enum BroadCastEvent {
  MOVE_MOUSE_IN_STORY = 'moveMouseInStory',
  USER_DISCONNECTED = 'userDisconnected',
  ACTIVE_USERS_IN_STORY = 'activeUsersInStory',
}

export type BroadCastArgs =
  // MOVE_MOUSE_IN_STORY
  | {
      operatorId: string
      storyId: string
      blockId: string
    }
  // USER_DISCONNECTED
  | {
      operatorId: string
      sessionId: string
    }
  // ACTIVE_USERS_IN_STORY
  | {
      userIds: string[]
      storyId: string
    }
