export type MessageTree = { [key: string]: string | MessageTree }

export const zh: MessageTree = {
  library: {
    title: '游戏库',
    detected: '已找到存档目录',
    missing: '未找到，请手动选择',
    chooseDir: '选择存档目录',
    openGame: '打开',
    store: '商店页',
    unrecognized: '此目录不是该游戏的存档'
  },
  nav: {
    about: '关于',
    langZh: '中文',
    langEn: 'English'
  },
  editor: {
    quitGame: '请先退出游戏再修改存档。',
    save: '保存',
    library: '返回游戏库',
    dirty: '未保存',
    unsavedConfirm: '有未保存的修改，确定离开？',
    slotUnreadable: '该槽位无法载入',
    emptySlots: '未找到存档槽位',
    restoreConfirm: '确认还原该备份？当前文件会先备份。'
  },
  slots: {
    load: '载入',
    empty: '空',
    unreadable: '无法读取'
  },
  backups: {
    title: '备份',
    restore: '还原',
    empty: '暂无备份',
    file: '{0}'
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
  error: {
    EMPTY_SERIALIZE: '序列化结果为空或字节无效，已拒绝写入',
    UNKNOWN_ACTION: '未知动作：{0}',
    URL_NOT_ALLOWED: '不允许打开该链接'
  }
}
