import { filter, get, isArray, isEmpty, isMap, isObject, isString, omit, set } from 'lodash'

/**
 * set the value of raw by path, e.g. path = ["a", "b", "c"] => raw.set("a.b.c", args)
 */
function setByPath(raw: object, path: string[], args: any, initFunc: (a: any) => void) {
  if (isEmpty(path)) {
    initFunc(args)
    return
  }

  set(raw, path, args)
}

/**
 * delete elements in raw that possessed the same id (by path)
 * NOTE: raw.get(path) must be array or map, and its elements must have the field of `id`.
 */
function removeByPathAndId(raw: object, path: string[], id: string): void {
  let pathVal = get(raw, path)
  if (isEmpty(pathVal)) {
    return
  }

  const mapOrObj = (val: any): boolean => isMap(val) || isObject(val)

  if (isArray(pathVal)) {
    pathVal = filter(pathVal, (val) => {
      if (isString(val)) {
        return val !== id
      }
      if (mapOrObj(val)) {
        return get(val, 'id') !== id
      }
      return true
    })
  } else if (mapOrObj(pathVal)) {
    pathVal = omit(pathVal, id)
  }

  set(raw, path, pathVal)
}

export { setByPath, removeByPathAndId }
