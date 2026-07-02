import { useCallback } from 'react'
import { useFileSystem } from './useFileSystem'

export type ToolCall = {
  id: string
  name: string
  args: Record<string, any>
}

export type ToolResult = {
  id: string
  name: string
  result: string
  success: boolean
}

export function useToolExecutor() {
  const fs = useFileSystem()

  const execute = useCallback(async (toolCalls: ToolCall[]): Promise<ToolResult[]> => {
    const results: ToolResult[] = []

    for (const tc of toolCalls) {
      try {
        let result = ''

        switch (tc.name) {

          case 'intent_classify': {
            result = JSON.stringify({
              status: 'classified',
              intent: tc.args.intent,
              plan: tc.args.plan,
            })
            break
          }

          case 'list_files': {
            function flatList(nodes: any[], prefix = ''): string[] {
              return nodes.flatMap(n =>
                n.type === 'file'
                  ? [`${prefix}${n.name}`]
                  : flatList(n.children || [], `${prefix}${n.name}/`)
              )
            }
            const files = fs.activeProject
              ? flatList(fs.activeProject.root)
              : []
            result = JSON.stringify({ files })
            break
          }

          case 'read_file': {
            const path = tc.args.path as string
            const name = path.split('/').pop() || path
            function findByName(nodes: any[], name: string): any {
              for (const n of nodes) {
                if (n.name === name) return n
                if (n.children) {
                  const f = findByName(n.children, name)
                  if (f) return f
                }
              }
              return null
            }
            const node = fs.activeProject
              ? findByName(fs.activeProject.root, name)
              : null
            if (node) {
              result = JSON.stringify({ path, content: node.content || '' })
            } else {
              result = JSON.stringify({ error: `File not found: ${path}` })
            }
            break
          }

          case 'create_folder': {
            const path = tc.args.path as string
            const name = path.replace(/\/$/, '').split('/').pop() || path
            await fs.createFolder(name)
            result = JSON.stringify({ status: 'created', path })
            break
          }

          case 'create_file': {
            const path = tc.args.path as string
            const content = tc.args.content as string
            const name = path.split('/').pop() || path
            await fs.injectFile(name, content)
            result = JSON.stringify({ status: 'created', path, bytes: content.length })
            break
          }

          case 'edit_file': {
            const path = tc.args.path as string
            const content = tc.args.content as string
            const name = path.split('/').pop() || path

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
              ? findNode(fs.activeProject.root, name)
              : null

            if (node) {
              await fs.updateFileContent(node.id, content)
              result = JSON.stringify({ status: 'edited', path, bytes: content.length })
            } else {
              // File doesn't exist — create it
              await fs.injectFile(name, content)
              result = JSON.stringify({ status: 'created', path, bytes: content.length })
            }
            break
          }

          default: {
            result = JSON.stringify({ status: 'unknown_tool', name: tc.name })
          }
        }

        results.push({ id: tc.id, name: tc.name, result, success: true })

      } catch (err) {
        results.push({
          id: tc.id,
          name: tc.name,
          result: JSON.stringify({ error: String(err) }),
          success: false,
        })
      }
    }

    return results
  }, [fs])

  // Build file system snapshot to send with every message
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
