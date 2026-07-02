import { useCallback } from 'react'
import { useFileSystem } from './useFileSystem'

export function useToolExecutor() {
  const fs = useFileSystem()

  const execute = useCallback(async (name: string, args: Record<string, any>) => {
    try {
      switch (name) {
        case 'create_file': {
          const fileName = args.path.split('/').pop() || args.path
          await fs.injectFile(fileName, args.content || '')
          break
        }
        case 'edit_file': {
          const fileName = args.path.split('/').pop() || args.path
          function findNode(nodes: any[], name: string): any {
            for (const n of nodes) {
              if (n.name === name) return n
              if (n.children) {
                const f = findNode(n.children, name)
                if (f) return f
              }
            }
            return null
          }
          const node = fs.activeProject
            ? findNode(fs.activeProject.root, fileName)
            : null
          if (node) {
            await fs.updateFileContent(node.id, args.content || '')
          } else {
            await fs.injectFile(fileName, args.content || '')
          }
          break
        }
        case 'create_folder': {
          const folderName = args.path.replace(/\/$/, '').split('/').pop() || args.path
          await fs.createFolder(folderName)
          break
        }
      }
    } catch (err) {
      console.error(`Tool error [${name}]:`, err)
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

  return { execute, getFileSystemSnapshot }
}
