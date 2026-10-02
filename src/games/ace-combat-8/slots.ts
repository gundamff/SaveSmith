import type { ListedFiles, SlotInfo } from '@sdk/types'

const CAMPAIGN = /^Campaign\.sav$/i

export function listSlots(listed: ListedFiles): SlotInfo[] {
  const campaign = listed.files.find((f) => CAMPAIGN.test(basename(f.relativePath)))
  if (!campaign) return []
  return [
    {
      id: 'campaign',
      exists: true,
      readable: campaign.bytes !== null,
      title: 'Campaign.sav',
      subtitle: 'LiveCampaignSaveGame',
      sessionFiles: [campaign.relativePath]
    }
  ]
}

function basename(relativePath: string): string {
  const parts = relativePath.replace(/\\/g, '/').split('/')
  return parts[parts.length - 1] ?? relativePath
}
