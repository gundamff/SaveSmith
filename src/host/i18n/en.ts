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
      tarot: 'Tarot'
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
      colCategory: 'Type',
      add: 'Add',
      remove: 'Remove',
      addPlaceholder: 'Search item name or ID…',
      typeFilter: 'Type',
      catAll: 'All',
      catAllAddable: 'All addable',
      addAll: 'Add all {0}',
      addedAll: 'Added {1} {0}',
      addedAllNone: 'Already own every {0}',
      addableOnlyHint: 'Add covers weapons / charms / spells / skins only; clues and keys are omitted. Charm slots list owned charms — use “Add all charms” first if the list looks short.',
      cat: {
        weapon: 'Weapon',
        spell: 'Spell',
        charm: 'Charm',
        skin: 'Skin',
        clue: 'Clue',
        key: 'Key',
        other: 'Other'
      },
      needCatalog: 'Name catalog not ready: run the extract script on a dev machine to generate catalog/items.json before editing inventory.',
      noWorldSync: 'World pickup state is not synced: added items may be pickable again at their original locations.',
      readonlyHint: 'Read-only until the name catalog is ready; unknown IDs show as raw strings.'
    },
    tarot: {
      hint: 'Unlock Tarot Arcana cards and complete all Works of Mercy (tasks + gifts). Does not dual-write world pickups or PLAYERPREFS.',
      needCatalog: 'Tarot catalogs not ready: generate catalog/arcana.json and catalog/mercy.json first.',
      cards: 'Arcana cards',
      unlockAll: 'Unlock all Arcana',
      unlockedAll: 'Unlocked {0} Arcana',
      unlockedAllNone: 'All Arcana already unlocked',
      mercy: 'Works of Mercy',
      mercyProgress: 'Tasks {0}/{1} · Gifts {2}/{3}',
      completeMercy: 'Complete all Works of Mercy',
      mercyDone: 'Completed {0} new Works of Mercy tasks (and unlocked gifts)',
      mercyDoneNone: 'All Works of Mercy already complete',
      colNum: '#',
      colName: 'Character',
      colSpell: 'Spell',
      colStatus: 'Status',
      statusOn: 'Unlocked',
      statusOff: 'Locked'
    }
  },
  ffr: {
    tabs: {
      records: 'Records',
      status: 'Party',
      items: 'Items',
      visions: 'Visions',
      maps: 'Maps',
      bestiary: 'Bestiary',
      journal: 'Journal',
      artifacts: 'Artifacts'
    },
    hint: {
      quitAndCloud: 'Quit the game completely and temporarily disable Steam Cloud before editing.'
    },
    records: {
      gil: 'Gil (currentMoney)',
      playTime: 'Play time (seconds)',
      winNum: 'Battles won'
    },
    status: {
      unitId: 'Unit ID',
      name: 'Name',
      experience: 'EXP',
      hp: 'HP',
      mp: 'MP',
      weapon: 'Weapon',
      armor: 'Armor',
      vision: 'Vision',
      equipHint:
        'Weapons/armor are filtered by class (e.g. Fina = bows only). Visions list owned entries. Wrong weapon types can crash the game.'
    },
    items: {
      id: 'Item ID',
      name: 'Name',
      num: 'Qty',
      add: 'Add / set qty',
      pick: 'Pick item'
    },
    visions: {
      id: 'Vision ID',
      name: 'Name',
      awakening: 'Awakening',
      synchroSum: 'Synchro sum',
      actions: 'Actions',
      maxSynchro: 'Max synchro'
    },
    maps: {
      mapId: 'Map ID',
      name: 'Name',
      known: 'Known',
      visited: 'Visited',
      cleared: 'Cleared'
    },
    bestiary: {
      filter: 'Search ID / name',
      id: 'SaveId',
      name: 'Name',
      defeat: 'Defeats',
      analyzed: 'Libra',
      yes: 'Scanned',
      no: 'Not scanned',
      actions: 'Actions',
      libra: 'Libra',
      libraAll: 'Libra-scan all'
    },
    journal: {
      storyReadonly: 'Story Progress flags: {0} entries (read-only).',
      safeHint:
        'No quest/request delete here. The sidebar Backup “Delete” only removes a local backup file, not save data.',
      quests: 'Quest board',
      questsReadonly: 'Delivery quantities are read-only — editing them often soft-locks or crashes the game.',
      questId: 'Quest ID',
      deliveryId: 'Delivery ID',
      quantity: 'Qty',
      requests: 'Requests',
      requestsReadonly: 'Request progress is read-only (same reason).',
      requestId: 'Request ID',
      progress: 'Progress index',
      colosseum: 'Colosseum',
      coloId: 'Battle ID',
      clearCount: 'Clears',
      shops: 'Shop limits (read-only table; use quick action to restock)',
      shopsHint: 'Use toolbar “Restock shops” to zero CurrentBuyNum.',
      shopId: 'Shop',
      itemId: 'Item',
      bought: 'Bought',
      maxOrder: 'Max'
    },
    artifacts: {
      missing:
        'This save has no artifactList (the game may omit it until you own an artifact).',
      id: 'Item ID',
      name: 'Name',
      active: 'Active',
      add: 'Add artifact'
    },
    actions: {
      maxMoney: 'Max Gil',
      unlockGear: 'Unlock gear / consumables',
      unlockVisions: 'Unlock all visions',
      materialsPack: 'Materials pack (adamantite / shards / keys)',
      revealMaps: 'Reveal all maps',
      libraAll: 'Libra-scan all',
      restockShops: 'Restock shops',
      resetChests: 'Reset opened chests'
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
  pbz: {
    tabs: {
      resources: 'Resources'
    },
    resources: {
      warning:
        'Only build 26266538 has been verified. Fully quit the game before editing; Steam Cloud may roll back changes. This is an unofficial tool for single-player use only.',
      slot: 'Internal slot',
      slotDirty:
        'Changes in the current slot will remain and will be written together when you save. Switch slots?',
      dust: 'Dust',
      materials: 'Materials',
      filterPlaceholder: 'Filter by material name or raw ID',
      setAll9999: 'Set all existing materials to 9999',
      empty: 'No existing materials or no filter matches',
      name: 'Generic name',
      id: 'ID',
      current: 'Current',
      max: 'Historical max',
      target: 'Target',
      materialName: 'Material {0}'
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
    BC_EQUIP_ORPHAN: 'Equipped {0} is not in inventory: {1}',
    CHECKSUM_MISMATCH: 'Checksum mismatch: {0}',
    FFR_MONEY: 'Invalid Gil: {0}',
    FFR_ITEM_NUM: 'Invalid qty for item {0}: {1}',
    FFR_GVAS: 'GVAS structure is corrupt; refusing save',
    PBZ_INVALID_BLOCK: 'Invalid PBZS block: {0}',
    PBZ_AUTH_FAILED:
      'PBZS authentication failed: the game may have updated or the save is corrupted; write rejected',
    PBZ_INVALID_CONTAINER: 'Invalid PBZS container: {0}',
    PBZ_UNSUPPORTED_COMPRESSION: 'Slot {0} uses an unsupported compression format',
    PBZ_DECOMPRESSION_FAILED: 'Failed to decompress slot {0}',
    PBZ_SLOT_READ_ONLY: 'Slot {0} is read-only',
    PBZ_INVALID_JSON: 'Slot {0} contains invalid JSON',
    PBZ_INVALID_EDIT: 'Invalid PBZ edit: {0}',
    PBZ_NO_EDITABLE_SLOTS: 'No editable AutoSave/ManualSave slots',
    PBZ_INVALID_SLOT: 'Invalid slot name: {0}',
    PBZ_DUPLICATE_SLOT: 'Duplicate slot: {0}',
    PBZ_INVALID_SELECTION: 'Invalid selected slot: {0}',
    PBZ_INVALID_DOCUMENT: 'Invalid document in slot {0}',
    PBZ_INVALID_PLAYER: 'Slot {0} has no valid Player',
    PBZ_INVALID_DUST: 'Invalid Dust in slot {0}',
    PBZ_INVALID_INVENTORY: 'Invalid Inventory in slot {0}',
    PBZ_INVALID_INVENTORY_INFOS: 'Invalid InventoryInfos in slot {0}',
    PBZ_INVALID_MATERIAL: 'Invalid material {1} in slot {0}',
    PBZ_INVALID_MATERIAL_AMOUNT: 'Invalid current amount for material {1} in slot {0}',
    PBZ_INVALID_MATERIAL_MAX: 'Invalid historical max for material {1} in slot {0}'
  }
}
