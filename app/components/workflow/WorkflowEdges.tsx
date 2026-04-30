'use client'

import React from 'react'
import type { WorkflowNode, WorkflowEdge } from '@/types/workflow'

interface WorkflowEdgesProps {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  previewEdge: { x1: number; y1: number; x2: number; y2: number } | null
  onEdgeClick: (edgeId: string) => void
}

const NODE_WIDTH = 220
const NODE_MID_Y = 40

function cubicBezierPath(
  sx: number,
  sy: number,
  tx: number,
  ty: number,
): string {
  const dx = Math.abs(tx - sx)
  const cx1 = sx + dx * 0.5
  const cx2 = tx - dx * 0.5
  return `M ${sx} ${sy} C ${cx1} ${sy} ${cx2} ${ty} ${tx} ${ty}`
}

const WorkflowEdges = React.memo(function WorkflowEdges({
  nodes,
  edges,
  previewEdge,
  onEdgeClick,
}: WorkflowEdgesProps) {
  const nodeMap = React.useMemo(() => {
    const m = new Map<string, WorkflowNode>()
    for (const n of nodes) m.set(n.id, n)
    return m
  }, [nodes])

  return (
    <svg className="wf-edges-svg" style={{ pointerEvents: 'none' }}>
      <g>
        {edges.map((edge) => {
          const source = nodeMap.get(edge.sourceId)
          const target = nodeMap.get(edge.targetId)
          if (!source || !target) return null

          const sx = source.position.x + NODE_WIDTH
          const sy = source.position.y + NODE_MID_Y
          const tx = target.position.x
          const ty = target.position.y + NODE_MID_Y

          const d = cubicBezierPath(sx, sy, tx, ty)

          return (
            <g key={edge.id}>
              {/* Visible edge */}
              <path
                d={d}
                stroke="rgba(34,197,94,0.5)"
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
              />
              {/* Invisible wide hit area — pointer-events re-enabled locally */}
              <path
                d={d}
                stroke="transparent"
                strokeWidth="12"
                fill="none"
                style={{ pointerEvents: 'stroke', cursor: 'pointer', opacity: 0 }}
                onClick={() => onEdgeClick(edge.id)}
              />
            </g>
          )
        })}

        {/* In-progress connection preview */}
        {previewEdge && (() => {
          const { x1, y1, x2, y2 } = previewEdge
          const d = cubicBezierPath(x1, y1, x2, y2)
          return (
            <path
              d={d}
              className="wf-edge-preview"
              strokeDasharray="5 4"
              fill="none"
              strokeLinecap="round"
            />
          )
        })()}
      </g>
    </svg>
  )
})

export default WorkflowEdges
