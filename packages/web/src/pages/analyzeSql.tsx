import { analyzeSql, fetchBlock } from '@app/api'
import { tokensToText } from '@app/components/editor'
import { SQLViewer } from '@app/components/SQLViewer'
import { useConnectorsGetProfile } from '@app/hooks/api'
import { useWorkspace } from '@app/hooks/useWorkspace'
import { Editor } from '@app/types'
import { css } from '@emotion/css'
import React, { useEffect, useMemo, useState } from 'react'
import { Graph as DAG } from 'react-d3-graph'

type Unbox<T> = T extends Promise<infer U> ? U : T
type Graph = Unbox<ReturnType<typeof analyzeSql>>
const graphCfg = {
  automaticRearrangeAfterDropNode: true,
  directed: true,
  focusAnimationDuration: 0.75,
  focusZoom: 1,
  freezeAllDragEvents: false,
  height: 1000,
  highlightDegree: 2,
  highlightOpacity: 0.2,
  linkHighlightBehavior: true,
  maxZoom: 12,
  minZoom: 0.05,
  nodeHighlightBehavior: true,
  panAndZoom: false,
  staticGraph: false,
  staticGraphWithDragAndDrop: false,
  width: 1000,
  d3: {
    alphaTarget: 0.05,
    gravity: -250,
    linkLength: 120,
    linkStrength: 2,
    disableLinkForce: false
  },
  node: {
    labelProperty: 'title'
  },
  link: {
    labelProperty: 'title',
    renderLabel: true
  }
}

const Page = () => {
  const workspace = useWorkspace()
  const { data: profile } = useConnectorsGetProfile(workspace.preferences.connectorId)
  const [queryId, setQueryId] = useState<string | null>(null)
  const [graph, setGraph] = useState<Graph | null>(null)
  const [blocks, setBlocks] = useState<Record<string, Editor.Block>>({})
  const [selectedSql, setSelectedSql] = useState<{ blockId: string; sql: string } | null>(null)
  useEffect(() => {
    const blockIds = graph?.nodes.filter((i) => i.type === 'transclusion').map((i) => i.id) ?? []
    Promise.all(blockIds.map((i) => fetchBlock(i, workspace.id))).then((blocks) =>
      setBlocks(Object.fromEntries(blocks.map((i) => [i.id, i])))
    )
  }, [graph, workspace])

  const graphData = useMemo(
    () => ({
      nodes: (graph?.nodes ?? []).map(({ id, type }) => ({
        id,
        type,
        title: type === 'table' ? id : tokensToText(blocks?.[id]?.content?.title),
        color: type === 'table' ? 'lightgreen' : 'red',
        labelPosition: 'top'
      })),
      links: (graph?.edges ?? []).map(({ source, target, weight }) => ({
        source,
        target,
        title: weight,
        color: weight === 'direct' ? 'green' : weight === 'join' ? 'blue' : 'red'
      }))
    }),
    [blocks]
  )

  return (
    <>
      <input onChange={(e) => setQueryId(e.target.value)} />
      <button
        disabled={!queryId}
        onClick={() => {
          if (queryId) {
            analyzeSql(workspace.id, queryId).then(setGraph)
          }
        }}
      >
        Click me
      </button>
      <div
        className={css`
          height: 300px;
        `}
      >
        <br />
        <div></div>
        {profile && selectedSql && (
          <SQLViewer
            key="sql"
            blockId={selectedSql.blockId ?? ''}
            languageId={profile.type}
            value={selectedSql.sql ?? ''}
          />
        )}
      </div>
      <DAG
        id="graph"
        data={graphData}
        config={graphCfg}
        onClickNode={(nodeId) =>
          setSelectedSql({ blockId: nodeId, sql: (blocks?.[nodeId] as Editor.SQLBlock).content?.sql ?? '' })
        }
      />
    </>
  )
}

export default Page
