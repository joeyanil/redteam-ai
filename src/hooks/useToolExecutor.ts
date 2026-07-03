import { useCallback } from 'react'
import { useFileSystem } from './useFileSystem'
import { FileOp } from './useAIChat'

export function useToolExecutor() {
  const fs = useFileSystem()

  const executeFileOp = useCallback(async (op: FileOp) => {
    try {
      if (op.op === 'folder') {
        const name = op.path.replace(/\/$/, '').split('/').pop() || op.path
        await fs.createFolder(name)
      } else if (op.op === 'create') {
        const name = op.path.split('/').pop() || op.path
        await fs.injectFile(name, op.content || '')
      }
    } catch (err) {
      console.error(`FileOp error [${op.op}] ${op.path}:`, err)
    }
  }, [fs])

  function getFileSystemSnapshot() {
    if (!fs.activeProject) return []
    function flatten(nodes: any[], prefix = ''): any[] {
      return nodes.flatMap(n =>
        n.type === 'file'
          ? [{ path: `${prefix}${n.name}`, content: n.content || '' }]
          : flatten(n.children || [], `${prefix}${n.name}/`)
      )
    }
    return flatten(fs.activeProject.root)
  }

  return { executeFileOp, getFileSystemSnapshot }
}
