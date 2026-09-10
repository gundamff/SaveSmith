export const APP_NAME = 'SaveSmith'
export const APP_NAME_ZH = '存档酱'
export const GITHUB_REPO_URL = 'https://github.com/gundamff/SaveSmith'
export const DONATION_URL = 'https://paypal.me/gundamff'

export type BrandLocale = 'zh' | 'en'

/** Library / about brand line: zh shows Chinese subtitle, en is English-only. */
export function brandDisplayName(locale: BrandLocale): string {
  return locale === 'zh' ? `${APP_NAME} · ${APP_NAME_ZH}` : APP_NAME
}
