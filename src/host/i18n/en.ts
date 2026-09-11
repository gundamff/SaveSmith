import type { MessageTree } from './zh'

export const en: MessageTree = {
  app: {
    brandZh: 'Cundang-chan',
    tagline: 'Hammer your saves into shape'
  },
  library: {
    title: 'Game Library',
    subtitle: 'Choose a game below to open and edit your local saves',
    detected: 'Save folder found',
    missing: 'Not found, please choose manually',
    chooseDir: 'Choose save folder',
    openGame: 'Open',
    store: 'Store page',
    unrecognized: 'This folder is not a save directory for this game'
  },
  nav: {
    about: 'About',
    donate: 'Donate',
    langZh: '中文',
    langEn: 'English'
  },
  donate: {
    title: 'Support SaveSmith',
    hint: 'Optional tips are appreciated. Scan WeChat / Alipay in China, or use PayPal elsewhere.',
    wechat: 'WeChat Pay',
    alipay: 'Alipay',
    paypal: 'Open PayPal',
    close: 'Close'
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
    deleteFailed: 'Could not delete backup {0}; the file may still be under backup/.',
    empty: 'No backups',
    file: '{0}',
    target: 'Target {0}'
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
  te: {
    tabs: {
      character: 'Character',
      inventory: 'Inventory'
    },
    character: {
      name: 'Name',
      difficulty: 'Difficulty',
      life: 'Life',
      mana: 'Mana',
      platinum: 'Platinum',
      gold: 'Gold',
      silver: 'Silver',
      copper: 'Copper',
      fillMax: 'Fill life/mana to max',
      renameHint: 'Edits the in-file name only; the .plr filename is not renamed (keeps map folder links).'
    },
    difficulty: {
      classic: 'Classic',
      mediumcore: 'Mediumcore',
      hardcore: 'Hardcore',
      journey: 'Journey'
    },
    inventory: {
      hotbar: 'Hotbar',
      main: 'Main inventory',
      armor: 'Armor / vanity / accessories',
      picker: 'Pick item',
      search: 'Search name or ID',
      pickerHint: 'The catalog has 6000+ items; at most 100 are listed here—type to narrow results.',
      colItem: 'Item',
      colStack: 'Stack',
      hint: 'Click the name to search or clear; edit stack on the right. Armor has no stack.'
    },
    item: {
      empty: '(empty)'
    }
  },
  wb: {
    tabs: {
      resources: 'Resources',
      unlock: 'Unlock'
    },
    resources: {
      silver: 'Silver',
      silverBeforeLastRun: 'Silver before last run',
      empty: 'No editable resource fields in this save'
    },
    unlock: {
      progress: 'Unlocked {0} / {1}',
      unlockAll: 'Unlock all',
      clearAll: 'Clear all',
      unlockedAll: 'All catalog unlocks enabled',
      cleared: 'Cleared catalog unlocks (kept unknown IDs)',
      types: {
        captain: 'Captains',
        crew: 'Crew',
        module: 'Modules',
        vehicle: 'Vehicles / Weapons',
        decoPet: 'Deco / Pets'
      }
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
  ds: {
    tabs: {
      currency: 'Currency',
      items: 'Items',
      characters: 'Characters',
      team: 'Team',
      equipment: 'Equipment',
      cooking: 'Cooking',
      unlock: 'Unlock',
      cosmetics: 'Cosmetics',
      world: 'World'
    },
    actions: {
      maxCurrency: 'Max currency'
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
    DECRYPT_FAILED: 'Cannot decrypt save (key not adapted or file corrupted)',
    UNSUPPORTED_VERSION: 'Unsupported save version: {0}',
    PARSE_FAILED: 'Failed to parse save: {0}',
    SERIALIZE_FAILED: 'Failed to serialize save: {0}',
    INVALID_NAME: 'Invalid character name (length {0})',
    INVALID_SILVER: 'Invalid silver field',
    LIFE_OVER_MAX: 'Current life {0} exceeds max {1}',
    MANA_OVER_MAX: 'Current mana {0} exceeds max {1}',
    ENCRYPT_FAILED: 'Failed to encrypt save: {0}'
  }
}
