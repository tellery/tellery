import { useMgetBlocksSuspense } from 'hooks/api'
import { useMemo } from 'react'
import { useBlockSnapshot } from 'store/block'
import { Editor } from 'types'
import { blockTitleToText, extractEntitiesFromToken } from '../helpers'

export const useBlockTitleToText = (block: Editor.BaseBlock) => {
  const tokens = useMemo(() => block.content?.title ?? [], [block.content?.title])
  const snapshot = useBlockSnapshot()

  const dependsAssetsKeys = useMemo(() => {
    return tokens
      ?.filter((token) => {
        return token[1]?.some((mark) => mark[0] === Editor.InlineType.Reference)
      })
      .map((token) => {
        const { reference: referenceEntity } = extractEntitiesFromToken(token)
        if (referenceEntity) {
          const id = referenceEntity[2]
          if (referenceEntity[1] === 's') {
            return id
          }
        }
        return null
      })
      .filter((x) => x !== null) as string[]
  }, [tokens])

  const assets = useMgetBlocksSuspense(dependsAssetsKeys)

  return useMemo(() => {
    return blockTitleToText(block, snapshot)
    // keep assets in deps, trigger rerender after depends changed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [block, snapshot, assets])
}
