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
    noSlot: 'No slot loaded',
    busyParse: 'Parsing save…',
    busySave: 'Saving…',
    busyView: 'Loading panel…',
    backups: 'Backups'
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
      'Unofficial tool. Not affiliated with, authorized by, or endorsed by {0} / {1}. For personal, offline study by owners of a legitimate copy only. Online / multiplayer use is prohibited.',
    disclaimerGeneric:
      'Unofficial tool. Not affiliated with, authorized by, or endorsed by any game publisher. For personal, offline study by owners of a legitimate copy only. Online / multiplayer use is prohibited.'
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
  es: {
    tabs: {
      overview: 'Overview',
      fighters: 'Fighters',
      items: 'Items'
    },
    actions: {
      maxProgress: 'Max all fighters level / exp',
      clearInjuries: 'Clear all injuries'
    },
    overview: {
      readonlyNotice: 'Quit the game before editing and saving.',
      quitNotice: 'Quit the game before editing and saving.',
      writeDisabled: 'Integrity is not ready; view only — saving changes is disabled.',
      teamName: 'Team name',
      gold: 'Gold',
      renown: 'Renown',
      developmentStars: 'Development stars',
      season: 'Season',
      week: 'Week',
      savedAt: 'Saved at',
      difficulty: 'Difficulty',
      challengeTower: 'Challenge Tower submitted',
      yes: 'Yes',
      no: 'No'
    },
    fighters: {
      empty: 'No editable fighters in this save',
      name: 'Name',
      profession: 'Profession',
      level: 'Level',
      experience: 'Experience',
      injured: 'Injured',
      growthStyles: 'Growth styles',
      growthStylesHint: 'Select one or more',
      equipped: 'Equipped relics',
      equippedSlot: 'Slot {0}',
      equippedEmpty: 'Empty slot',
      skills: 'Skills',
      skillSlot: 'Skill {0}',
      injury: 'Injury',
      injuryBattles: 'Injury battles left',
      clearInjury: 'Clear injury',
      maxProgress: 'Max level / exp',
      birth: 'Birth stats',
      growthBase: 'Growth base',
      career: 'Career stats',
      personality: 'Personality',
      aiProfile: 'AI profile'
    },
    items: {
      empty: 'No editable items in this save',
      definition: 'Item',
      quality: 'Quality',
      exceptionalRoll: 'Exceptional roll',
      instanceId: 'Instance ID',
      stats: 'Rolled stats',
      noStats: 'This item has no editable rolled stats',
      statId: 'Stat',
      amount: 'Amount',
      ratio: 'Ratio'
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
  cg2: {
    actions: {
      fillResources: 'Max gold / supply / prestige',
      maxCommanders: 'Max commanders',
      unlockAll: 'Unlock all known flags',
      maxCollection: 'Max collection'
    },
    tabs: {
      resources: 'Resources',
      planets: 'Planets',
      commanders: 'Commanders',
      fleets: 'Fleets',
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
    },
    cidHint:
      'Adding items/characters needs game CIDs. Look up names and CIDs in the th.gl DragonSword database (characters, items, cooking, etc.).',
    cidHintLink: 'Open th.gl database'
  },
  ac8: {
    tabs: {
      resources: 'Resources',
      progress: 'Progress / NG+',
      aircraft: 'Aircraft',
      skins: 'Skins',
      emblems: 'Emblems',
      missions: 'Mission ranks'
    },
    hint: {
      quitAndCloud: 'Quit the game completely and temporarily disable Steam Cloud before editing.'
    },
    resources: {
      currentMrp: 'Current MRP',
      totalMrp: 'Lifetime MRP (TotalMRP)',
      syncTotal: 'Set Total MRP equal to Current MRP'
    },
    progress: {
      hint: '“Enable post-clear unlocks” writes clear FeatureFlags, Ace (incl. MenuMiscFlag), Free Mission / hangar 1–31, and stubs matching mission records; it does not move the cursor or dump 100% skins/emblems (use Unlock visible on those tabs). Pseudo NG+ also resets mission IDs to 0. Campaign DLC aircraft need CompletionCount ≥ 1.',
      missionIdWarn: 'Do not manually set last completed/played mission ID to 30 or 31 — the game resumes from that cursor and can soft-lock without full clear records. If stuck, use Pseudo NG+ to reset the cursor to 0.',
      completionCount: 'Clear count (CompletionCount)',
      lastCompleted: 'Last completed mission ID',
      lastPlayed: 'Last played mission ID',
      featureFlags: 'FeatureFlagMask',
      freeMissions: 'Free Mission unlocks',
      hangarSituations: 'Hangar situations unlocked',
      treeNodes: 'Aircraft tree nodes unlocked',
      skins: 'Skins unlocked',
      emblems: 'Emblems unlocked',
      medals: 'Medals unlocked',
      aceUnlock: 'Ace difficulty UnlockData',
      yes: 'Yes',
      no: 'No'
    },
    actions: {
      postCampaignUnlocks: 'Enable post-clear unlocks (keep story)',
      pseudoNgPlus: 'Pseudo NG+ (reset story + unlocks)'
    },
    lists: {
      searchId: 'Search ID',
      searchName: 'Search name or ID',
      onlyLocked: 'Locked only',
      unlockVisible: 'Unlock visible',
      lockVisible: 'Lock visible',
      id: 'ID',
      name: 'Name',
      unlocked: 'Unlocked',
      owned: 'Owned',
      skinsHint:
        'Search by name and toggle unlock. “Unlock visible” rewrites the save tree once (ac8-save-editor Check All).',
      emblemsHint:
        'Search by name and toggle unlock. “Unlock visible” rewrites the save tree once (ac8-save-editor Check All).',
      aircraftHint:
        'Owning syncs the hangar tree node and unlocks SP1 (hangar purchase). Toggle SP2/SP3 per plane; Unlock visible skips mission loaners and opens every SP weapon.',
      spWeapons: 'Special weapons',
      missionOnly: 'Mission loaner (not sold in the tree)'
    },
    missions: {
      hint: 'You can only change ranks on missions you have already flown. Uncleared missions have no record to edit.',
      id: 'Mission',
      lastRank: 'Last rank',
      noRecord: 'no record',
      allS: 'Set existing records to S'
    }
  },
  bc: {
    tabs: {
      overview: 'Overview',
      character: 'Character',
      inventory: 'Inventory',
      abilities: 'Abilities / Arcana',
      exploration: 'Exploration'
    },
    hint: {
      quitAndCloud: 'Quit the game completely and temporarily disable Steam Cloud before editing.',
      mirrorRestoresVitals:
        'Loading from a Mirror of Life restores full HP/MP and heal charges, so editing the fields below has no lasting effect. Raise caps via health/mana upgrade fragments instead.'
    },
    overview: {
      version: 'Save version',
      saveDate: 'Saved at',
      playTime: 'Play time (seconds)'
    },
    character: {
      playerId: 'Character ID',
      level: 'Level',
      experienceCurrent: 'Current XP',
      healthUpgradeFragmentCount: 'Health upgrade fragments',
      manaUpgradeFragmentCount: 'Mana upgrade fragments',
      atkBonusUpgradeCount: 'ATK bonus upgrades',
      defBonusUpgradeCount: 'DEF bonus upgrades',
      currentHealth: 'Current health (restored on load)',
      currentMana: 'Current mana (restored on load)',
      currentHealChargesCount: 'Heal charges (restored on load)',
      currentTheHermitDeathDefianceCount: 'Hermit death defiance charges'
    },
    inventory: {
      items: 'Inventory',
      equipment: 'Equipped',
      weapon: 'Weapon',
      spell: 'Sub-weapon / spell',
      skin: 'Skin',
      charmSlot: 'Charm slot {0}',
      empty: '(empty)',
      emptyList: 'Inventory is empty',
      colSlot: 'Slot',
      colId: 'ID',
      colName: 'Name',
      colActions: 'Actions',
      add: 'Add',
      remove: 'Remove',
      addPlaceholder: 'Search item name or ID…',
      needCatalog: 'Name catalog not ready: run the extract script on a dev machine to generate catalog/items.json before editing inventory.',
      noWorldSync: 'World pickup state is not synced: added items may be pickable again at their original locations.',
      readonlyHint: 'Read-only until the name catalog is ready; unknown IDs show as raw strings.'
    },
    abilities: {
      vaniaMoves: 'Vania moves',
      progression: 'Persistent progression',
      arcanaTasks: 'Arcana completed tasks',
      arcanaTalents: 'Arcana unlocked talents',
      colId: 'GUID',
      empty: '(none)',
      readonlyHint: 'Read-only in phase 1; add flows unlock after mapping.'
    },
    exploration: {
      worldKeyCount: 'World regions',
      completionItemCount: 'Completion items (sum)',
      entityCount: 'Savable entities',
      readonlyHint: 'Summary counts only; no per-entity editing.'
    }
  },
  dc: {
    tabs: {
      resources: 'Resources',
      blueprints: 'Blueprints',
      unlock: 'Unlock',
      runes: 'Runes'
    },
    resources: {
      deathMoney: 'Gold',
      deathCells: 'Cells',
      bossCells: 'Boss Stem Cells (difficulty)',
      heroSkin: 'Skin',
      heroHeadSkin: 'Head skin',
      bossRush: 'Boss Rush unlocks',
      field: 'Field',
      idx: 'Index',
      unlock: 'Unlocked',
      unreadable: 'Save structure cannot be parsed; view-only'
    },
    difficulty: {
      normal: 'Normal',
      hard: 'Hard',
      veryHard: 'Very Hard',
      expert: 'Expert',
      nightmare: 'Nightmare',
      hell: 'Hell'
    },
    bossRush: {
      unlockedGameMode: 'Game mode',
      basementUnlock: 'Base',
      capUnlock: 'Cloak',
      pantUnlock: 'Pants',
      skirtUnlock: 'Belt',
      skullUnlock: 'Helmet',
      topUnlock: 'Armor',
      weaponUnlock: 'Weapon',
      materialUnlock: 'Material'
    },
    blueprints: {
      name: 'Item',
      itemId: 'Item ID',
      unlocked: 'Unlocked',
      isNew: 'New',
      investedCells: 'Invested cells',
      unreadable: 'Save structure cannot be parsed; editing disabled'
    },
    runes: {
      name: 'Rune',
      unlocked: 'Unlocked',
      unlockAll: 'Unlock all',
      clearAll: 'Clear all',
      hint: 'Runes are permanent upgrades; names come from the game localization. Confirm in-game after editing (a backup is taken automatically).',
      unreadable: 'Save structure cannot be parsed; rune editing disabled'
    },
    unlock: {
      name: 'Name',
      kind: 'Type',
      search: 'Search name / ID',
      unlocked: 'Unlocked',
      unlockVisible: 'Unlock listed',
      clearVisible: 'Lock listed',
      hint: 'Unlocking writes into the save item progress; items missing from the save get a new entry. Confirm in-game after editing (a backup is taken automatically).',
      unreadable: 'Save structure cannot be parsed; unlock editing disabled',
      cat: {
        all: 'All',
        weapons: 'Weapons & skills',
        mutations: 'Mutations',
        aspects: 'Aspects',
        skins: 'Skins',
        heads: 'Heads',
        meta: 'Permanent upgrades'
      }
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
    INVALID_AMOUNT: 'Invalid currency amount (CID {0})',
    INVALID_STACK: 'Invalid stack count (CID {0})',
    INVALID_POSITION: 'Position {0} is not a finite number',
    UNKNOWN_TEAM_CID: 'Team page {0} uses unknown character CID {1}',
    COLLECTION_LENGTH:
      'Collection {0} length {1} is shorter than catalog {2}; refusing rewrite',
    LIFE_OVER_MAX: 'Current life {0} exceeds max {1}',
    MANA_OVER_MAX: 'Current mana {0} exceeds max {1}',
    ENCRYPT_FAILED: 'Failed to encrypt save: {0}',
    INVALID_FORMAT: 'Invalid save format: {0}',
    OUT_OF_RANGE: 'Value out of range: {0}',
    INVALID_STATE: 'Invalid save state: {0}',
    INVALID_JSON: 'Invalid JSON in {0}',
    BC_LEVEL: 'Invalid level (must be an integer ≥ 1): {0}',
    BC_SCALAR: 'Invalid value for field {0}: {1}',
    BC_INV_DUP: 'Duplicate inventory item ID: {0}',
    BC_EQUIP_ORPHAN: 'Equipped {0} is not in inventory: {1}'
  }
}
