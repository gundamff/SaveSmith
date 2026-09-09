import type { MessageTree } from './zh'

export const en: MessageTree = {
  library: {
    title: 'Game Library',
    detected: 'Save folder found',
    missing: 'Not found, please choose manually',
    chooseDir: 'Choose save folder',
    openGame: 'Open',
    store: 'Store page',
    unrecognized: 'This folder is not a save directory for this game'
  },
  nav: {
    about: 'About',
    langZh: '中文',
    langEn: 'English'
  },
  editor: {
    quitGame: 'Please quit the game before editing saves.',
    save: 'Save',
    library: 'Back to library',
    dirty: 'Unsaved',
    unsavedConfirm: 'You have unsaved changes. Leave anyway?',
    slotUnreadable: 'This slot cannot be loaded',
    emptySlots: 'No save slots found',
    restoreConfirm: 'Restore this backup? The current file will be backed up first.'
  },
  slots: {
    load: 'Load',
    empty: 'Empty',
    unreadable: 'Unreadable'
  },
  backups: {
    title: 'Backups',
    restore: 'Restore',
    empty: 'No backups',
    file: '{0}'
  },
  about: {
    title: 'About',
    version: 'Version {0}',
    github: 'GitHub repository',
    donate: 'Donate',
    close: 'Close',
    disclaimer:
      'Unofficial tool. Not affiliated with, authorized by, or endorsed by {0}. For personal, offline study by owners of a legitimate copy only. Online / multiplayer use is prohibited.'
  },
  cf: {
    actions: {
      fillResources: 'Max credits / prestige / stars',
      maxUnits: 'All +6',
      maxPilots: 'All Lv10',
      unlockAll: 'Unlock all units and gear',
      maxCollection: 'Max endings + collection'
    }
  },
  error: {
    EMPTY_SERIALIZE: 'Serialize produced an empty or invalid payload; write aborted',
    UNKNOWN_ACTION: 'Unknown action: {0}',
    URL_NOT_ALLOWED: 'This URL is not allowed',
    MISSING_FIELD: 'Save is missing field {0}; format incompatible',
    UNIT_INDEX: 'Invalid unit index: {0}',
    PILOT_TAKEN: 'Pilot already assigned (unit #{0})',
    DEPLOYED_NO_PILOT:
      'Deployed unit(s) missing pilot (#{0}); assign a pilot before saving or the game will crash'
  }
}
