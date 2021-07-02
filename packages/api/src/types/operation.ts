enum OperationCmdType {
  SET = 'set',
  UPDATE = 'update',
  LIST_REMOVE = 'listRemove',
  LIST_AFTER = 'listAfter',
  LIST_BEFORE = 'listBefore',
  SET_PERMISSIONS = 'setPermissions',
}

enum OperationTableType {
  BLOCK = 'block',
  SNAPSHOT = 'snapshot',
  LINK = 'link',
  WORKSPACE_VIEW = 'workspaceView',
}

interface SingleOperation {
  cmd: OperationCmdType
  id: string
  path: string[]
  table: OperationTableType
  args: any
}

export { OperationCmdType, OperationTableType, SingleOperation }
