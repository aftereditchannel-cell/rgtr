/**
 * Compatibility helpers for callers that used the former cloud sync module.
 * Local-first scheduling lives in the Zustand store; this file exposes safe manual
 * Firebase operations without any GitHub token/Gist dependency.
 */
import { useApp } from '../store/useApp'
import { migrate } from './migrate'
import { isCloudReady, pullCloudData, pushCloudData } from './cloud'

export async function syncPushNow(): Promise<boolean> {
  if (!isCloudReady()) return false
  try {
    const updatedAt = await pushCloudData(useApp.getState().data)
    useApp.setState(s => ({ data: { ...s.data, settings: { ...s.data.settings, cloud: { ...s.data.settings.cloud, lastSync: updatedAt } } } }))
    return true
  } catch { return false }
}

export async function autoPullOnStart(): Promise<boolean> {
  const state = useApp.getState()
  if (!isCloudReady() || !state.data.settings.cloud.autoPull) return false
  try {
    const remote = await pullCloudData()
    if (!remote || (Date.parse(remote.updatedAt) || 0) <= (Date.parse(state.data.settings.cloud.lastSync) || 0)) return false
    await state.replaceAll(migrate(remote.data))
    useApp.setState(s => ({ data: { ...s.data, settings: { ...s.data.settings, cloud: { ...s.data.settings.cloud, lastSync: remote.updatedAt } } } }))
    return true
  } catch { return false }
}
