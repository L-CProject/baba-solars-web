import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'

/**
 * Keeps open tabs of this browser in step: after a save, other tabs are told over a
 * BroadcastChannel and re-read their data from the API. Other devices pick up changes when the
 * page is focused again (refetchOnWindowFocus) or after the stale time.
 */
const CHANNEL = 'baba-solars-sync'
const TAB_ID = Math.random().toString(36).slice(2)
let channel: BroadcastChannel | null = null
const getChannel = () => {
  if (!channel && typeof BroadcastChannel !== 'undefined') channel = new BroadcastChannel(CHANNEL)
  return channel
}

export function broadcastChange(scope: 'site' | 'admin' = 'site') {
  try { getChannel()?.postMessage({ type: 'changed', scope, from: TAB_ID }) } catch { /* ignore */ }
}

export function SiteSync() {
  const qc = useQueryClient()
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return
    const ch = new BroadcastChannel(CHANNEL)
    ch.onmessage = (e: MessageEvent<{ type?: string; scope?: string; from?: string }>) => {
      if (e.data?.type !== 'changed' || e.data.from === TAB_ID) return
      void qc.invalidateQueries({ queryKey: e.data.scope === 'admin' ? ['admin'] : ['site'] })
    }
    return () => ch.close()
  }, [qc])
  return null
}
