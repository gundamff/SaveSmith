export type MessageTree = { [key: string]: string | MessageTree }

export const zh: MessageTree = {
  app: {
    brandZh: '存档酱',
    tagline: '帮你把存档敲成想要的样子'
  },
  library: {
    title: '游戏库',
    subtitle: '从下方选一个游戏，打开本地存档就能改',
    detected: '已找到存档目录',
    missing: '未找到，请手动选择',
    chooseDir: '选择存档目录',
    openGame: '打开',
    store: '商店页',
    unrecognized: '此目录不是该游戏的存档'
  },
  nav: {
    about: '关于',
    donate: '捐助',
    langZh: '中文',
    langEn: 'English'
  },
  donate: {
    title: '捐助存档酱',
    hint: '随意打赏即可，谢谢支持。国内可用微信 / 支付宝扫码；海外可用 PayPal。',
    wechat: '微信支付',
    alipay: '支付宝',
    paypal: '打开 PayPal',
    close: '关闭'
  },
  editor: {
    quitGame: '请先退出游戏再修改存档。',
    save: '保存',
    library: '返回游戏库',
    dirty: '未保存',
    unsavedConfirm: '有未保存的修改，确定离开？',
    slotUnreadable: '该槽位无法载入',
    emptySlots: '未找到存档槽位',
    restoreConfirm: '确认还原该备份？当前文件会先备份。',
    saveDir: '存档目录',
    currentSlot: '当前槽位',
    noSlot: '未载入槽位'
  },
  slots: {
    load: '载入',
    empty: '空',
    unreadable: '无法读取',
    savedAt: '保存于 {0}'
  },
  backups: {
    title: '备份',
    restore: '还原',
    delete: '删除',
    deleteConfirm: '确认删除备份 {0}？此操作不可恢复。',
    deleteFailed: '未能删除备份 {0}，文件可能仍在 backup 目录中。',
    empty: '暂无备份',
    file: '{0}',
    target: '目标 {0}'
  },
  about: {
    title: '关于',
    version: '版本 {0}',
    github: 'GitHub 仓库',
    donate: '捐赠',
    close: '关闭',
    disclaimer:
      '非官方工具。与 {0} 官方无任何关联、授权或合作。仅供已购买正版的玩家在本地、单机环境下学习研究。禁止用于联机或破坏多人公平。'
  },
  te: {
    tabs: {
      character: '角色',
      inventory: '物品'
    },
    character: {
      name: '名字',
      difficulty: '难度',
      life: '生命',
      mana: '魔力',
      platinum: '铂金币',
      gold: '金币',
      silver: '银币',
      copper: '铜币',
      fillMax: '生命/魔力拉满到上限',
      renameHint: '只改档内名字，不会重命名 .plr 文件（避免断开地图目录关联）。'
    },
    difficulty: {
      classic: '经典',
      mediumcore: '中核',
      hardcore: '硬核',
      journey: '旅行'
    },
    inventory: {
      hotbar: '热键栏',
      main: '主物品栏',
      armor: '装备 / 时装 / 饰品',
      picker: '选择物品',
      search: '搜索名称或 ID',
      pickerHint: '物品表共六千余种；此处最多列出 100 条，请输入关键字缩小范围。',
      colItem: '物品',
      colStack: '数量',
      hint: '点左侧名称搜索换物或清空；右侧改堆叠数量。装备栏无数量。'
    },
    item: {
      empty: '（空）'
    }
  },
  wb: {
    tabs: {
      resources: '资源',
      unlock: '解锁'
    },
    resources: {
      silver: '银币',
      silverBeforeLastRun: '上次出征前银币',
      empty: '当前存档没有可编辑的资源字段'
    },
    unlock: {
      progress: '已解锁 {0} / {1}',
      unlockAll: '全部解锁',
      clearAll: '全部清空',
      unlockedAll: '已解锁全部条目',
      cleared: '已清空可识别解锁（保留未知 ID）',
      types: {
        captain: '船长',
        crew: '船员',
        module: '舱室',
        vehicle: '载具 / 武器',
        decoPet: '装饰 / 宠物'
      }
    }
  },
  cf: {
    actions: {
      fillResources: '一键拉满（信用/威望/星级）',
      maxUnits: '全部 +6',
      maxPilots: '全部 Lv10',
      unlockAll: '解锁全部机型与装备',
      maxCollection: '一键拉满（结局 + 收藏度）'
    },
    tabs: {
      resources: '资源',
      planets: '星球',
      formation: '编队',
      units: '机体 / 飞船',
      pilots: '驾驶员',
      unlock: '全解锁',
      collection: '图鉴'
    }
  },
  ds: {
    tabs: {
      currency: '货币',
      items: '物品',
      characters: '角色',
      team: '编队',
      equipment: '装备'
    },
    actions: {
      maxCurrency: '货币拉满'
    }
  },
  error: {
    EMPTY_SERIALIZE: '序列化结果为空或字节无效，已拒绝写入',
    UNKNOWN_ACTION: '未知动作：{0}',
    URL_NOT_ALLOWED: '不允许打开该链接',
    MISSING_FIELD: '存档缺少字段 {0}，格式不兼容',
    UNIT_INDEX: '机体下标无效: {0}',
    PILOT_TAKEN: '驾驶员已被占用（机体 #{0}）',
    DEPLOYED_NO_PILOT: '已上阵机体缺少驾驶员（机体 #{0}），请先拖驾驶员上去再保存，否则游戏会崩溃',
    DECRYPT_FAILED: '无法解密存档（密钥未适配或文件损坏）',
    UNSUPPORTED_VERSION: '暂不支持该存档版本：{0}',
    PARSE_FAILED: '存档解析失败：{0}',
    SERIALIZE_FAILED: '存档序列化失败：{0}',
    INVALID_NAME: '角色名无效（长度 {0}）',
    INVALID_SILVER: '银币字段无效',
    LIFE_OVER_MAX: '当前生命 {0} 超过上限 {1}',
    MANA_OVER_MAX: '当前魔力 {0} 超过上限 {1}',
    ENCRYPT_FAILED: '存档加密失败：{0}'
  }
}
