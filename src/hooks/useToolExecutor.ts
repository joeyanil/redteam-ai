import { useCallback } from 'react'
import { useFileSystem } from './useFileSystem'
import { FileOp } from './useAIChat'

export function useToolExecutor() {
  const fs = useFileSystem()

  const executeFileOp = useCallback(async (op: FileOp) => {
    try {
      switch (op.op) {
        case 'folder': {
          const folderName =
            op.path.replace(/\/$/, '').split('/').pop() || op.path
          await fs.createFolder(folderName)
          break
        }

        case 'create': {
          const fileName = op.path.split('/').pop() || op.path
          await fs.injectFile(fileName, op.content || '')
          break
        }

        case 'edit': {
          const fileName = op.path.split('/').pop() || op.path

          function findNode(nodes: any[], name: string): any {
            for (const node of nodes) {
              if (node.type === 'file' && node.name === name) {
                return node
              }

              if (node.children) {
                const found = findNode(node.children, name)
                if (found) return found
              }
            }

            return null
          }

          const node = fs.activeProject
            ? findNode(fs.activeProject.root, fileName)
            : null

          if (node) {
            await fs.updateFileContent(node.id, op.content || '')
          } else {
            await fs.injectFile(fileName, op.content || '')
          }

          break
        }

        default:
          console.error(`Unknown FileOp "${(op as any).op}"`)
      }
    } catch (err) {
      console.error(`FileOp error [${op.op}] ${op.path}:`, err)
    }
  }, [fs])

  const execute = useCallback(
    async (name: string, args: Record<string, any>) => {
      if (!args?.path) {
        console.error(`Tool error [${name}]: missing "path" argument`)
        return
      }

      switch (name) {
        case 'create_file':
          return executeFileOp({
            op: 'create',
            path: args.path,
            content: args.content || '',
          } as FileOp)

        case 'edit_file':
          return executeFileOp({
            op: 'edit',
            path: args.path,
            content: args.content || '',
          } as FileOp)

        case 'create_folder':
          return executeFileOp({
            op: 'folder',
            path: args.path,
          } as FileOp)

        default:
          console.error(`Unknown tool "${name}"`)
      }
    },
    [executeFileOp]
  )

  function getFileSystemSnapshot() {
    if (!fs.activeProject) return []

    function flatten(nodes: any[], prefix = ''): any[] {
      return nodes.flatMap((node) =>
        node.type === 'file'
          ? [
              {
                path: `${prefix}${node.name}`,
                content: node.content || '',
              },
            ]
          : flatten(node.children || [], `${prefix}${node.name}/`)
      )
    }

    return flatten(fs.activeProject.root)
  }

  return {
    execute,
    executeFileOp,
    getFileSystemSnapshot,
  }
}
