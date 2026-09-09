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
  }
}
