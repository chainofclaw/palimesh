import { getEffectiveRpcUrl } from './provider'

let rpcId = 1

export async function rpcCall<T>(method: string, params: unknown[] = []): Promise<T> {
  const response = await fetch(getEffectiveRpcUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method,
      params,
      id: rpcId++,
    }),
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`RPC call failed: ${response.statusText}`)
  }

  const json = await response.json()

  if (json.error) {
    // 过渡兼容:现网节点仍服务 coc_* 命名空间;Phase 4 节点升级后移除
    if (
      method.startsWith('pali_') &&
      typeof json.error.message === 'string' &&
      json.error.message.includes('method not supported')
    ) {
      return rpcCall<T>(method.replace(/^pali_/, 'coc_'), params)
    }
    throw new Error(json.error.message || 'RPC error')
  }

  return json.result as T
}
