import { ref } from 'vue'
import { appVersion } from './tauri'

const cached = ref('')
let pending: Promise<string> | null = null

/** Cached `app_version` lookup; returns an empty string when unavailable. */
export function getAppVersion(): Promise<string> {
  if (cached.value) return Promise.resolve(cached.value)
  if (!pending) {
    pending = (async () => {
      try {
        const version = await appVersion()
        cached.value = version
        return version
      } catch {
        return ''
      } finally {
        pending = null
      }
    })()
  }
  return pending
}
