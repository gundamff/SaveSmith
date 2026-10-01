/**
 * Enum constructor shims for Dead Cells save data (port of N3rdL0rd/alivecells
 * shims/deadcells.py, MIT). Needed to skip enum constructor arguments whose
 * layout is not embedded in the save schema.
 */
export interface ShimType {
  type: string
  name?: string
  payload?: ShimType
  fields?: Record<string, ShimType>
}

export interface EnumCtor {
  name: string
  args: ShimType[]
}

export const ENUM_SHIMS: Record<string, EnumCtor[]> = {
  "achievements.EAchievement": [
    {
      "name": "BIOME_REACHED_COURTYARD",
      "args": []
    },
    {
      "name": "BIOME_REACHED_PRISONROOF",
      "args": []
    },
    {
      "name": "BIOME_REACHED_BRIDGE",
      "args": []
    },
    {
      "name": "BIOME_REACHED_OSSUARY",
      "args": []
    },
    {
      "name": "BIOME_REACHED_PRISONDEPTH",
      "args": []
    },
    {
      "name": "BIOME_REACHED_SEWERS",
      "args": []
    },
    {
      "name": "BIOME_REACHED_SEWERSDEPTH",
      "args": []
    },
    {
      "name": "BIOME_REACHED_STILTVILLAGE",
      "args": []
    },
    {
      "name": "BIOME_REACHED_CEMETERY",
      "args": []
    },
    {
      "name": "BIOME_REACHED_CRYPT",
      "args": []
    },
    {
      "name": "BIOME_REACHED_CLOCKTOWER",
      "args": []
    },
    {
      "name": "BIOME_REACHED_TOPCLOCKTOWER",
      "args": []
    },
    {
      "name": "BIOME_REACHED_ANCIENTTEMPLE",
      "args": []
    },
    {
      "name": "BIOME_REACHED_CASTLE",
      "args": []
    },
    {
      "name": "BIOME_REACHED_THRONE",
      "args": []
    },
    {
      "name": "EXPLO_GETRUNE_VINE",
      "args": []
    },
    {
      "name": "EXPLO_GETRUNE_SCORING",
      "args": []
    },
    {
      "name": "EXPLO_GETRUNE_TELEPORT",
      "args": []
    },
    {
      "name": "EXPLO_GETRUNE_BREAKGROUND",
      "args": []
    },
    {
      "name": "EXPLO_GETRUNE_WALLGRAB",
      "args": []
    },
    {
      "name": "EXPLO_FIRST_TIMEDDOOR",
      "args": []
    },
    {
      "name": "EXPLO_FIRST_RIFTCHALLENGE",
      "args": []
    },
    {
      "name": "EXPLO_FIRST_SECRETZONE",
      "args": []
    },
    {
      "name": "FEAT_KILLWITH_ELEVATOR",
      "args": []
    },
    {
      "name": "FEAT_KILLYOURSELF_ELEVATOR",
      "args": []
    },
    {
      "name": "FEAT_KILLYOURSELF_NOPE",
      "args": []
    },
    {
      "name": "FEAT_DEATH_LOST_100_CELLS",
      "args": []
    },
    {
      "name": "FEAT_DIVE_SPIKES",
      "args": []
    },
    {
      "name": "FEAT_ENDGAME_STARTWEAPON",
      "args": []
    },
    {
      "name": "FEAT_SURVIVE_CURSE",
      "args": []
    },
    {
      "name": "FEAT_COMPLETE_1_DAILYRUN",
      "args": []
    },
    {
      "name": "FIGHT_BEAT_100_ELITES",
      "args": []
    },
    {
      "name": "FIGHT_BEAT_BEHEMOTH",
      "args": []
    },
    {
      "name": "FIGHT_BEAT_BEHOLDER",
      "args": []
    },
    {
      "name": "FIGHT_BEAT_BERSERK",
      "args": []
    },
    {
      "name": "FIGHT_BEAT_KINGSHAND",
      "args": []
    },
    {
      "name": "FIGHT_BEAT_BEHEMOTH_NODAMAGE",
      "args": []
    },
    {
      "name": "FIGHT_BEAT_BEHOLDER_NODAMAGE",
      "args": []
    },
    {
      "name": "FIGHT_BEAT_BERSERK_NODAMAGE",
      "args": []
    },
    {
      "name": "FIGHT_BEAT_KINGSHAND_NODAMAGE",
      "args": []
    },
    {
      "name": "EQUIP_UNLOCK_10_WEAPONS",
      "args": []
    },
    {
      "name": "EQUIP_UNLOCK_10_ACTIVES",
      "args": []
    },
    {
      "name": "EQUIP_ENDGAME_YOLO",
      "args": []
    },
    {
      "name": "EQUIP_ENDGAME_CURSEDSWORD",
      "args": []
    },
    {
      "name": "EXPLO_GETBOSSRUNE_FIRST",
      "args": []
    },
    {
      "name": "EXPLO_GETBOSSRUNE_SECOND",
      "args": []
    },
    {
      "name": "EXPLO_GETBOSSRUNE_THIRD",
      "args": []
    },
    {
      "name": "EXPLO_GETBOSSRUNE_FOURTH",
      "args": []
    },
    {
      "name": "FEAT_ENDGAME_BOSSRUNE_1",
      "args": []
    },
    {
      "name": "FEAT_ENDGAME_BOSSRUNE_2",
      "args": []
    },
    {
      "name": "FEAT_ENDGAME_BOSSRUNE_3",
      "args": []
    },
    {
      "name": "FEAT_ENDGAME_BOSSRUNE_4",
      "args": []
    },
    {
      "name": "BIOME_REACHED_BEHOLDERPIT",
      "args": []
    },
    {
      "name": "EXPLO_GETBOSSRUNE_FIFTH",
      "args": []
    },
    {
      "name": "FIGHT_BEAT_GIANT",
      "args": []
    },
    {
      "name": "FIGHT_BEAT_COLLECTOR",
      "args": []
    },
    {
      "name": "BIOME_REACHED_CAVERN",
      "args": []
    },
    {
      "name": "BIOME_REACHED_ASTROLAB",
      "args": []
    },
    {
      "name": "BIOME_REACHED_GIANT",
      "args": []
    },
    {
      "name": "BIOME_REACHED_OBSERVATORY",
      "args": []
    },
    {
      "name": "FEAT_ENDGAME_BOSSRUNE_5",
      "args": []
    },
    {
      "name": "FIGHT_BEAT_GIANT_NODAMAGE",
      "args": []
    },
    {
      "name": "FIGHT_BEAT_COLLECTOR_NODAMAGE",
      "args": []
    },
    {
      "name": "FIGHT_BEAT_MAMATICK",
      "args": []
    },
    {
      "name": "FIGHT_BEAT_MAMATICK_NODAMAGE",
      "args": []
    },
    {
      "name": "FEAT_ENDGAME_NOKILL_MUSHROOM_BOI",
      "args": []
    },
    {
      "name": "FEAT_EXPLODE_MUSHROOM_BOI",
      "args": []
    },
    {
      "name": "FEAT_SACRIFICE_MUSHROOM_BOI",
      "args": []
    },
    {
      "name": "FEAT_PRISON_NOBREAK_DOOR",
      "args": []
    },
    {
      "name": "BIOME_REACHED_GREENHOUSE",
      "args": []
    },
    {
      "name": "BIOME_REACHED_SWAMP",
      "args": []
    },
    {
      "name": "BIOME_REACHED_SWAMPHEART",
      "args": []
    },
    {
      "name": "BIOME_REACHED_PRISONCORRUPT",
      "args": []
    },
    {
      "name": "BIOME_REACHED_DISTILLERY",
      "args": []
    },
    {
      "name": "FEAT_FINISHLEVEL_NOLAUNCHER",
      "args": []
    },
    {
      "name": "FEAT_KILLWITH_BARREL",
      "args": []
    },
    {
      "name": "BIOME_REACHED_GARDENER",
      "args": []
    },
    {
      "name": "BIOME_REACHED_CLIFF",
      "args": []
    },
    {
      "name": "BIOME_REACHED_TUMULUS",
      "args": []
    },
    {
      "name": "FIGHT_BEAT_GARDENER_NOBOUNCE",
      "args": []
    },
    {
      "name": "FIGHT_BEAT_GARDENER",
      "args": []
    },
    {
      "name": "FIGHT_BEAT_GARDENER_NODAMAGE",
      "args": []
    },
    {
      "name": "FEAT_NECROMANT_REVIVE_3_MOBS",
      "args": []
    },
    {
      "name": "FEAT_FLYINGSWORD_JEALOUSY",
      "args": []
    },
    {
      "name": "FEAT_LIGHTNING_WATER_KILL",
      "args": []
    },
    {
      "name": "FEAT_COMBO_SICKLES",
      "args": []
    },
    {
      "name": "FEAT_PENDULO_TRAP_KILL",
      "args": []
    },
    {
      "name": "FEAT_COSTUME_REQUIRED",
      "args": []
    },
    {
      "name": "BIOME_REACHED_SHIPWRECK",
      "args": []
    },
    {
      "name": "BIOME_REACHED_LIGHTHOUSE",
      "args": []
    },
    {
      "name": "BIOME_REACHED_QUEENARENA",
      "args": []
    },
    {
      "name": "FIGHT_BEAT_QUEEN",
      "args": []
    },
    {
      "name": "FIGHT_BEAT_QUEEN_NODAMAGE",
      "args": []
    },
    {
      "name": "FIGHT_BEAT_QUEEN_FALL",
      "args": []
    },
    {
      "name": "FIGHT_BEAT_QUEEN_CARDS",
      "args": []
    },
    {
      "name": "FIGHT_BEAT_QUEEN_COSTUME",
      "args": []
    },
    {
      "name": "FEAT_STAPHY_EVOLVE",
      "args": []
    },
    {
      "name": "FEAT_KILL_PIRATE_CANNON",
      "args": []
    },
    {
      "name": "FEAT_WRECKINGBALL_STRIKE",
      "args": []
    },
    {
      "name": "FEAT_HANDHOOK_SPIKES",
      "args": []
    },
    {
      "name": "FEAT_SHARK_WATER",
      "args": []
    },
    {
      "name": "FEAT_SERVANT_COSTUME",
      "args": []
    },
    {
      "name": "FEAT_TWO_PETS",
      "args": []
    },
    {
      "name": "FEAT_STAPHY_KILL_STAPHY",
      "args": []
    },
    {
      "name": "FIGHT_BEAT_AMAZONS",
      "args": []
    },
    {
      "name": "FIGHT_BEAT_AMAZONS_NODAMAGE",
      "args": []
    },
    {
      "name": "BIOME_REACHED_BANK",
      "args": []
    },
    {
      "name": "FEAT_DEBT",
      "args": []
    },
    {
      "name": "FIGHT_BEAT_MIMIC",
      "args": []
    },
    {
      "name": "BIOME_REACHED_PGARDEN",
      "args": []
    },
    {
      "name": "BIOME_REACHED_PCASTLE",
      "args": []
    },
    {
      "name": "BIOME_REACHED_DEATH",
      "args": []
    },
    {
      "name": "BIOME_REACHED_DOOKU",
      "args": []
    },
    {
      "name": "FIGHT_BEAT_DEATH",
      "args": []
    },
    {
      "name": "FIGHT_BEAT_DEATH_NODAMAGE",
      "args": []
    },
    {
      "name": "FIGHT_BEAT_DOOKU",
      "args": []
    },
    {
      "name": "FIGHT_BEAT_DOOKU_BEAST",
      "args": []
    },
    {
      "name": "FIGHT_BEAT_DOOKU_NODAMAGE",
      "args": []
    },
    {
      "name": "FEAT_CAT_KILL_DEATH",
      "args": []
    },
    {
      "name": "FEAT_AXE_KILL_WWOLF",
      "args": []
    },
    {
      "name": "FEAT_VKILLER_KILL_DOOKU",
      "args": []
    },
    {
      "name": "FEAT_BIBLE_MULTI_HIT",
      "args": []
    }
  ],
  "tool.InventItemKind": [
    {
      "name": "Weapon",
      "args": [
        {
          "type": "String"
        }
      ]
    },
    {
      "name": "Active",
      "args": [
        {
          "type": "String"
        }
      ]
    },
    {
      "name": "Talisman",
      "args": [
        {
          "type": "String"
        }
      ]
    },
    {
      "name": "BagItem",
      "args": [
        {
          "type": "String"
        }
      ]
    },
    {
      "name": "__D_Passive",
      "args": []
    },
    {
      "name": "Consumable",
      "args": [
        {
          "type": "String"
        }
      ]
    },
    {
      "name": "PreciousLoot",
      "args": [
        {
          "type": "String"
        }
      ]
    },
    {
      "name": "Meta",
      "args": [
        {
          "type": "String"
        }
      ]
    },
    {
      "name": "Perk",
      "args": [
        {
          "type": "String"
        }
      ]
    },
    {
      "name": "Skin",
      "args": [
        {
          "type": "String"
        }
      ]
    },
    {
      "name": "Head",
      "args": [
        {
          "type": "String"
        }
      ]
    },
    {
      "name": "Aspect",
      "args": [
        {
          "type": "String"
        }
      ]
    },
    {
      "name": "BossRushStatueUnlock",
      "args": [
        {
          "type": "String"
        }
      ]
    }
  ],
  "level.GameplayMod": [
    {
      "name": "ForcedDarkness",
      "args": []
    },
    {
      "name": "DeathBombs",
      "args": []
    },
    {
      "name": "ExplodingDoors",
      "args": []
    },
    {
      "name": "BloodThirst",
      "args": []
    },
    {
      "name": "FullPoison",
      "args": []
    },
    {
      "name": "ChickenLightning",
      "args": []
    },
    {
      "name": "ExtraFlyingBois",
      "args": []
    },
    {
      "name": "InvisibleMobs",
      "args": []
    },
    {
      "name": "BulletHell",
      "args": []
    },
    {
      "name": "SpikedMushrooms",
      "args": []
    },
    {
      "name": "SuperJumps",
      "args": []
    },
    {
      "name": "RandomEquipment",
      "args": []
    }
  ],
  "CollisionMode": [
    {
      "name": "Normal",
      "args": []
    },
    {
      "name": "All",
      "args": []
    },
    {
      "name": "null",
      "args": []
    },
    {
      "name": "Ladder",
      "args": []
    },
    {
      "name": "Pully",
      "args": []
    },
    {
      "name": "WallGrab",
      "args": []
    },
    {
      "name": "IgnoreOneWay",
      "args": []
    },
    {
      "name": "IgnoreWalls",
      "args": []
    }
  ],
  "Direction": [
    {
      "name": "Up",
      "args": []
    },
    {
      "name": "Down",
      "args": []
    },
    {
      "name": "Left",
      "args": []
    },
    {
      "name": "Right",
      "args": []
    }
  ],
  "tool.HeadMode": [
    {
      "name": "null",
      "args": []
    },
    {
      "name": "Normal",
      "args": []
    },
    {
      "name": "NormalNoEye",
      "args": []
    },
    {
      "name": "EyeOnly",
      "args": []
    },
    {
      "name": "Fire",
      "args": [
        {
          "type": "Int"
        },
        {
          "type": "Int"
        }
      ]
    },
    {
      "name": "Electric",
      "args": [
        {
          "type": "Int"
        },
        {
          "type": "Int"
        }
      ]
    }
  ],
  "level.MerchantType": [
    {
      "name": "Mini",
      "args": []
    },
    {
      "name": "Actives",
      "args": []
    },
    {
      "name": "Heals",
      "args": []
    },
    {
      "name": "Weapons",
      "args": []
    },
    {
      "name": "Talismans",
      "args": []
    }
  ],
  "level.ZDoorType": [
    {
      "name": "BossRune",
      "args": [
        {
          "type": "Int"
        }
      ]
    },
    {
      "name": "PerfectKills",
      "args": [
        {
          "type": "Int"
        }
      ]
    },
    {
      "name": "Timed",
      "args": [
        {
          "type": "Float"
        }
      ]
    },
    {
      "name": "Conditional",
      "args": []
    },
    {
      "name": "TumulusAntichamber",
      "args": []
    },
    {
      "name": "CliffEnigma",
      "args": []
    },
    {
      "name": "TrainingArena",
      "args": []
    },
    {
      "name": "PurpleTeleport",
      "args": []
    },
    {
      "name": "BossRushTeleport",
      "args": []
    }
  ],
  "Triggerability": [
    {
      "name": "Never",
      "args": []
    },
    {
      "name": "Once",
      "args": []
    },
    {
      "name": "Always",
      "args": []
    }
  ],
  "LootType": [
    {
      "name": "MoneyGold",
      "args": [
        {
          "type": "Int"
        }
      ]
    },
    {
      "name": "MoneyGem",
      "args": [
        {
          "type": "Int"
        }
      ]
    },
    {
      "name": "GenericCell",
      "args": []
    },
    {
      "name": "GenericCellBonus",
      "args": []
    },
    {
      "name": "Blueprint",
      "args": [
        {
          "type": "String"
        }
      ]
    },
    {
      "name": "InvItem",
      "args": [
        {
          "type": "Serializable",
          "name": "tool.InventItem"
        }
      ]
    },
    {
      "name": "Ammo",
      "args": [
        {
          "type": "Serializable",
          "name": "tool.InventItem"
        },
        {
          "type": "String"
        }
      ]
    },
    {
      "name": "LeechDrop",
      "args": []
    },
    {
      "name": "HealDrop",
      "args": [
        {
          "type": "Float"
        }
      ]
    },
    {
      "name": "MoneyGoldCombo",
      "args": [
        {
          "type": "Int"
        }
      ]
    },
    {
      "name": "MoneyGemCombo",
      "args": [
        {
          "type": "Int"
        }
      ]
    },
    {
      "name": "Heart",
      "args": [
        {
          "type": "Bool"
        }
      ]
    }
  ],
  "NpcId": [
    {
      "name": "Knight",
      "args": []
    },
    {
      "name": "Scribe",
      "args": []
    },
    {
      "name": "Collector",
      "args": []
    },
    {
      "name": "Docker",
      "args": []
    },
    {
      "name": "PlagueDoctor",
      "args": []
    },
    {
      "name": "SewerCreature",
      "args": []
    },
    {
      "name": "CryptDemon",
      "args": []
    },
    {
      "name": "Sign",
      "args": []
    },
    {
      "name": "Berserk",
      "args": []
    },
    {
      "name": "ScoringGuy",
      "args": []
    },
    {
      "name": "InternMerchant",
      "args": []
    },
    {
      "name": "Blacksmith",
      "args": []
    },
    {
      "name": "PerkMaster",
      "args": []
    },
    {
      "name": "SmallBlacksmith",
      "args": []
    },
    {
      "name": "ChallengeGuy",
      "args": []
    },
    {
      "name": "Tailor",
      "args": []
    },
    {
      "name": "GlitchedKnight",
      "args": []
    },
    {
      "name": "TickPriest",
      "args": []
    },
    {
      "name": "CollectorIntern",
      "args": []
    },
    {
      "name": "TrainingKnight",
      "args": []
    },
    {
      "name": "TrainingKnightBoss",
      "args": []
    },
    {
      "name": "AspectMaster",
      "args": []
    },
    {
      "name": "Fisherfish",
      "args": []
    },
    {
      "name": "Banker",
      "args": []
    },
    {
      "name": "PiggyBankKid",
      "args": []
    },
    {
      "name": "GuillainLibrarian",
      "args": []
    },
    {
      "name": "GuillainMimic",
      "args": []
    },
    {
      "name": "GuillainHidden",
      "args": []
    },
    {
      "name": "SoulKnightBug",
      "args": []
    },
    {
      "name": "BossRushNPC",
      "args": []
    },
    {
      "name": "Architect",
      "args": []
    },
    {
      "name": "SlayTheSpireNeow",
      "args": []
    },
    {
      "name": "AlucardNpc",
      "args": []
    },
    {
      "name": "RichterNpc",
      "args": []
    },
    {
      "name": "CollectorShanoa",
      "args": []
    },
    {
      "name": "Maria",
      "args": []
    },
    {
      "name": "TailorDaughter",
      "args": []
    }
  ],
  "Achievement_ID": [
    {
      "name": "BIOME_REACHED_COURTYARD",
      "args": []
    },
    {
      "name": "BIOME_REACHED_PRISONROOF",
      "args": []
    },
    {
      "name": "BIOME_REACHED_BRIDGE",
      "args": []
    },
    {
      "name": "BIOME_REACHED_OSSUARY",
      "args": []
    },
    {
      "name": "BIOME_REACHED_PRISONDEPTH",
      "args": []
    },
    {
      "name": "BIOME_REACHED_SEWERS",
      "args": []
    },
    {
      "name": "BIOME_REACHED_SEWERSDEPTH",
      "args": []
    },
    {
      "name": "BIOME_REACHED_STILTVILLAGE",
      "args": []
    },
    {
      "name": "BIOME_REACHED_CEMETERY",
      "args": []
    },
    {
      "name": "BIOME_REACHED_CRYPT",
      "args": []
    },
    {
      "name": "BIOME_REACHED_CLOCKTOWER",
      "args": []
    },
    {
      "name": "BIOME_REACHED_TOPCLOCKTOWER",
      "args": []
    },
    {
      "name": "BIOME_REACHED_ANCIENTTEMPLE",
      "args": []
    },
    {
      "name": "BIOME_REACHED_CASTLE",
      "args": []
    },
    {
      "name": "BIOME_REACHED_THRONE",
      "args": []
    },
    {
      "name": "EXPLO_GETRUNE_VINE",
      "args": []
    },
    {
      "name": "EXPLO_GETRUNE_SCORING",
      "args": []
    },
    {
      "name": "EXPLO_GETRUNE_TELEPORT",
      "args": []
    },
    {
      "name": "EXPLO_GETRUNE_BREAKGROUND",
      "args": []
    },
    {
      "name": "EXPLO_GETRUNE_WALLGRAB",
      "args": []
    },
    {
      "name": "EXPLO_FIRST_TIMEDDOOR",
      "args": []
    },
    {
      "name": "EXPLO_FIRST_RIFTCHALLENGE",
      "args": []
    },
    {
      "name": "EXPLO_FIRST_SECRETZONE",
      "args": []
    },
    {
      "name": "FEAT_KILLWITH_ELEVATOR",
      "args": []
    },
    {
      "name": "FEAT_KILLYOURSELF_ELEVATOR",
      "args": []
    },
    {
      "name": "FEAT_KILLYOURSELF_NOPE",
      "args": []
    },
    {
      "name": "FEAT_DEATH_LOST_100_CELLS",
      "args": []
    },
    {
      "name": "FEAT_DIVE_SPIKES",
      "args": []
    },
    {
      "name": "FEAT_ENDGAME_STARTWEAPON",
      "args": []
    },
    {
      "name": "FEAT_SURVIVE_CURSE",
      "args": []
    },
    {
      "name": "FEAT_COMPLETE_1_DAILYRUN",
      "args": []
    },
    {
      "name": "FIGHT_BEAT_100_ELITES",
      "args": []
    },
    {
      "name": "FIGHT_BEAT_BEHEMOTH",
      "args": []
    },
    {
      "name": "FIGHT_BEAT_BEHOLDER",
      "args": []
    },
    {
      "name": "FIGHT_BEAT_BERSERK",
      "args": []
    },
    {
      "name": "FIGHT_BEAT_KINGSHAND",
      "args": []
    },
    {
      "name": "FIGHT_BEAT_BEHEMOTH_NODAMAGE",
      "args": []
    },
    {
      "name": "FIGHT_BEAT_BEHOLDER_NODAMAGE",
      "args": []
    },
    {
      "name": "FIGHT_BEAT_BERSERK_NODAMAGE",
      "args": []
    },
    {
      "name": "FIGHT_BEAT_KINGSHAND_NODAMAGE",
      "args": []
    },
    {
      "name": "EQUIP_UNLOCK_10_WEAPONS",
      "args": []
    },
    {
      "name": "EQUIP_UNLOCK_10_ACTIVES",
      "args": []
    },
    {
      "name": "EQUIP_ENDGAME_YOLO",
      "args": []
    },
    {
      "name": "EQUIP_ENDGAME_CURSEDSWORD",
      "args": []
    },
    {
      "name": "EXPLO_GETBOSSRUNE_FIRST",
      "args": []
    },
    {
      "name": "EXPLO_GETBOSSRUNE_SECOND",
      "args": []
    },
    {
      "name": "EXPLO_GETBOSSRUNE_THIRD",
      "args": []
    },
    {
      "name": "EXPLO_GETBOSSRUNE_FOURTH",
      "args": []
    },
    {
      "name": "FEAT_ENDGAME_BOSSRUNE_1",
      "args": []
    },
    {
      "name": "FEAT_ENDGAME_BOSSRUNE_2",
      "args": []
    },
    {
      "name": "FEAT_ENDGAME_BOSSRUNE_3",
      "args": []
    },
    {
      "name": "FEAT_ENDGAME_BOSSRUNE_4",
      "args": []
    },
    {
      "name": "BIOME_REACHED_BEHOLDERPIT",
      "args": []
    },
    {
      "name": "EXPLO_GETBOSSRUNE_FIFTH",
      "args": []
    },
    {
      "name": "FIGHT_BEAT_GIANT",
      "args": []
    },
    {
      "name": "FIGHT_BEAT_COLLECTOR",
      "args": []
    },
    {
      "name": "BIOME_REACHED_CAVERN",
      "args": []
    },
    {
      "name": "BIOME_REACHED_ASTROLAB",
      "args": []
    },
    {
      "name": "BIOME_REACHED_GIANT",
      "args": []
    },
    {
      "name": "BIOME_REACHED_OBSERVATORY",
      "args": []
    },
    {
      "name": "FEAT_ENDGAME_BOSSRUNE_5",
      "args": []
    },
    {
      "name": "FIGHT_BEAT_GIANT_NODAMAGE",
      "args": []
    },
    {
      "name": "FIGHT_BEAT_COLLECTOR_NODAMAGE",
      "args": []
    },
    {
      "name": "FIGHT_BEAT_MAMATICK",
      "args": []
    },
    {
      "name": "FIGHT_BEAT_MAMATICK_NODAMAGE",
      "args": []
    },
    {
      "name": "FEAT_ENDGAME_NOKILL_MUSHROOM_BOI",
      "args": []
    },
    {
      "name": "FEAT_EXPLODE_MUSHROOM_BOI",
      "args": []
    },
    {
      "name": "FEAT_SACRIFICE_MUSHROOM_BOI",
      "args": []
    },
    {
      "name": "FEAT_PRISON_NOBREAK_DOOR",
      "args": []
    },
    {
      "name": "BIOME_REACHED_GREENHOUSE",
      "args": []
    },
    {
      "name": "BIOME_REACHED_SWAMP",
      "args": []
    },
    {
      "name": "BIOME_REACHED_SWAMPHEART",
      "args": []
    },
    {
      "name": "BIOME_REACHED_PRISONCORRUPT",
      "args": []
    },
    {
      "name": "BIOME_REACHED_DISTILLERY",
      "args": []
    },
    {
      "name": "FEAT_FINISHLEVEL_NOLAUNCHER",
      "args": []
    },
    {
      "name": "FEAT_KILLWITH_BARREL",
      "args": []
    },
    {
      "name": "BIOME_REACHED_GARDENER",
      "args": []
    },
    {
      "name": "BIOME_REACHED_CLIFF",
      "args": []
    },
    {
      "name": "BIOME_REACHED_TUMULUS",
      "args": []
    },
    {
      "name": "FIGHT_BEAT_GARDENER_NOBOUNCE",
      "args": []
    },
    {
      "name": "FIGHT_BEAT_GARDENER",
      "args": []
    },
    {
      "name": "FIGHT_BEAT_GARDENER_NODAMAGE",
      "args": []
    },
    {
      "name": "FEAT_NECROMANT_REVIVE_3_MOBS",
      "args": []
    },
    {
      "name": "FEAT_FLYINGSWORD_JEALOUSY",
      "args": []
    },
    {
      "name": "FEAT_LIGHTNING_WATER_KILL",
      "args": []
    },
    {
      "name": "FEAT_COMBO_SICKLES",
      "args": []
    },
    {
      "name": "FEAT_PENDULO_TRAP_KILL",
      "args": []
    },
    {
      "name": "FEAT_COSTUME_REQUIRED",
      "args": []
    },
    {
      "name": "BIOME_REACHED_SHIPWRECK",
      "args": []
    },
    {
      "name": "BIOME_REACHED_LIGHTHOUSE",
      "args": []
    },
    {
      "name": "BIOME_REACHED_QUEENARENA",
      "args": []
    },
    {
      "name": "FIGHT_BEAT_QUEEN",
      "args": []
    },
    {
      "name": "FIGHT_BEAT_QUEEN_NODAMAGE",
      "args": []
    },
    {
      "name": "FIGHT_BEAT_QUEEN_FALL",
      "args": []
    },
    {
      "name": "FIGHT_BEAT_QUEEN_CARDS",
      "args": []
    },
    {
      "name": "FIGHT_BEAT_QUEEN_COSTUME",
      "args": []
    },
    {
      "name": "FEAT_STAPHY_EVOLVE",
      "args": []
    },
    {
      "name": "FEAT_KILL_PIRATE_CANNON",
      "args": []
    },
    {
      "name": "FEAT_WRECKINGBALL_STRIKE",
      "args": []
    },
    {
      "name": "FEAT_HANDHOOK_SPIKES",
      "args": []
    },
    {
      "name": "FEAT_SHARK_WATER",
      "args": []
    },
    {
      "name": "FEAT_SERVANT_COSTUME",
      "args": []
    },
    {
      "name": "FEAT_TWO_PETS",
      "args": []
    },
    {
      "name": "FEAT_STAPHY_KILL_STAPHY",
      "args": []
    },
    {
      "name": "FIGHT_BEAT_AMAZONS",
      "args": []
    },
    {
      "name": "FIGHT_BEAT_AMAZONS_NODAMAGE",
      "args": []
    }
  ],
  "level.LoreEvent": [
    {
      "name": "LE_CdbLineStart",
      "args": []
    },
    {
      "name": "LE_ChangeLabel",
      "args": [
        {
          "type": "String"
        }
      ]
    },
    {
      "name": "LE_Look",
      "args": [
        {
          "type": "String"
        },
        {
          "type": "Bool"
        }
      ]
    },
    {
      "name": "LE_Text",
      "args": [
        {
          "type": "String"
        },
        {
          "type": "Null",
          "payload": {
            "type": "Int"
          }
        },
        {
          "type": "Bool"
        }
      ]
    },
    {
      "name": "LE_InvItem",
      "args": [
        {
          "type": "Serializable",
          "name": "tool.InventItem"
        }
      ]
    },
    {
      "name": "LE_Gold",
      "args": [
        {
          "type": "Int"
        }
      ]
    },
    {
      "name": "LE_GlobalRoomLoot",
      "args": []
    },
    {
      "name": "LE_ExaminableLoot",
      "args": [
        {
          "type": "String"
        }
      ]
    },
    {
      "name": "LE_Anim",
      "args": [
        {
          "type": "String"
        },
        {
          "type": "Float"
        },
        {
          "type": "Bool"
        },
        {
          "type": "Bool"
        }
      ]
    },
    {
      "name": "LE_DisableCdbLine",
      "args": []
    },
    {
      "name": "LE_DestroyExaminable",
      "args": []
    },
    {
      "name": "LE_Pause",
      "args": [
        {
          "type": "Float"
        }
      ]
    },
    {
      "name": "LE_CustomLoreEvent",
      "args": [
        {
          "type": "String"
        }
      ]
    }
  ],
  "level.RoomLinkType": [
    {
      "name": "Enter",
      "args": []
    },
    {
      "name": "Exit",
      "args": []
    },
    {
      "name": "EnterOrExit",
      "args": []
    }
  ],
  "level.ZDoorContentClue": [
    {
      "name": "CTreasure",
      "args": []
    },
    {
      "name": "CCursed",
      "args": []
    },
    {
      "name": "CShop",
      "args": []
    },
    {
      "name": "CKey",
      "args": []
    },
    {
      "name": "CExit",
      "args": []
    },
    {
      "name": "CTimedDoor",
      "args": []
    }
  ],
  "LinkType": [
    {
      "name": "Walk",
      "args": []
    },
    {
      "name": "CrossDoor",
      "args": []
    },
    {
      "name": "NarrowWalk",
      "args": []
    },
    {
      "name": "Fall",
      "args": []
    },
    {
      "name": "HighFall",
      "args": []
    },
    {
      "name": "Jump",
      "args": []
    },
    {
      "name": "HorizontalJump",
      "args": []
    },
    {
      "name": "HighJump",
      "args": []
    }
  ],
  "level.RoomFlag": [
    {
      "name": "LockedNeedKey",
      "args": []
    },
    {
      "name": "LockedNeedCard",
      "args": []
    },
    {
      "name": "TemplateFlip",
      "args": []
    },
    {
      "name": "Outside",
      "args": []
    },
    {
      "name": "InsideOut",
      "args": []
    },
    {
      "name": "Holes",
      "args": []
    },
    {
      "name": "ForceCollExtTop",
      "args": []
    },
    {
      "name": "ForceCollExtBottom",
      "args": []
    },
    {
      "name": "NoExitSizeCheck",
      "args": []
    },
    {
      "name": "DarkRoom",
      "args": []
    },
    {
      "name": "NoCritters",
      "args": []
    },
    {
      "name": "NoLoot",
      "args": []
    }
  ],
  "UserFlag": [
    {
      "name": "CollectorMet",
      "args": []
    },
    {
      "name": "CollectorLeft",
      "args": []
    }
  ],
  "level.RoomLoot": [
    {
      "name": "GoldNugget",
      "args": [
        {
          "type": "Int"
        },
        {
          "type": "Int"
        },
        {
          "type": "Int"
        }
      ]
    },
    {
      "name": "FreeItem",
      "args": [
        {
          "type": "Int"
        },
        {
          "type": "Int"
        },
        {
          "type": "Serializable",
          "name": "tool.InventItem"
        },
        {
          "type": "Bool"
        }
      ]
    },
    {
      "name": "FreeBlueprint",
      "args": [
        {
          "type": "Int"
        },
        {
          "type": "Int"
        },
        {
          "type": "String"
        },
        {
          "type": "Serializable",
          "name": "tool.InventItem"
        }
      ]
    },
    {
      "name": "Chest",
      "args": [
        {
          "type": "Array",
          "payload": {
            "type": "Serializable",
            "name": "tool.InventItem"
          }
        },
        {
          "type": "Bool"
        }
      ]
    },
    {
      "name": "LoreEventGlobalDrop",
      "args": [
        {
          "type": "Serializable",
          "name": "tool.InventItem"
        }
      ]
    },
    {
      "name": "LoreEventExaminableDrop",
      "args": [
        {
          "type": "Serializable",
          "name": "tool.InventItem"
        },
        {
          "type": "String"
        }
      ]
    },
    {
      "name": "HiddenBlock",
      "args": [
        {
          "type": "Int"
        },
        {
          "type": "Int"
        },
        {
          "type": "Int"
        },
        {
          "type": "Serializable",
          "name": "tool.InventItem"
        }
      ]
    },
    {
      "name": "Cells",
      "args": [
        {
          "type": "Int"
        }
      ]
    },
    {
      "name": "LegendaryAltar",
      "args": [
        {
          "type": "Serializable",
          "name": "tool.InventItem"
        },
        {
          "type": "Int"
        },
        {
          "type": "Int"
        }
      ]
    }
  ]
}
