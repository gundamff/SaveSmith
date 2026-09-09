import type { MessageTree } from './zh'

export const en: MessageTree = {
  app: {
    brandZh: 'Cundang-chan',
    tagline: 'Hammer your saves into shape'
  },
  library: {
    title: 'Game Library',
    subtitle: 'Pick a game and start editing',
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
    restoreConfirm: 'Restore this backup? The current file will be backed up first.',
    saveDir: 'Save folder',
    currentSlot: 'Current slot',
    noSlot: 'No slot loaded'
  },
  slots: {
    load: 'Load',
    empty: 'Empty',
    unreadable: 'Unreadable',
    savedAt: 'Saved {0}'
  },
  backups: {
    title: 'Backups',
    restore: 'Restore',
    delete: 'Delete',
    deleteConfirm: 'Delete backup {0}? This cannot be undone.',
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
  wb: {
    tabs: {
      resources: 'Resources'
    },
    resources: {
      silver: 'Silver',
      silverBeforeLastRun: 'Silver before last run',
      empty: 'No editable resource fields in this save'
    }
  },
  cf: {
    actions: {
      fillResources: 'Max credits / prestige / stars',
      maxUnits: 'All +6',
      maxPilots: 'All Lv10',
      unlockAll: 'Unlock all units and gear',
      maxCollection: 'Max endings + collection'
    },
    tabs: {
      resources: 'Resources',
      planets: 'Planets',
      formation: 'Formation',
      units: 'Units / Ships',
      pilots: 'Pilots',
      unlock: 'Unlock',
      collection: 'Collection'
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
      'Deployed unit(s) missing pilot (#{0}); assign a pilot before saving or the game will crash',
    DECRYPT_FAILED:
      'Cannot decrypt Wanderburg save (key not adapted or file corrupted)'
  }
}
