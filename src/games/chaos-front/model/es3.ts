export interface Es3Field {
  __type?: string
  value: unknown
}

export type Es3Doc = Record<string, Es3Field>

export function isWrapped(v: unknown): v is Es3Field {
  return typeof v === 'object' && v !== null && '__type' in v && 'value' in v
}

/**
 * 宽松解析真实存档 JSON：LitJson 序列化 Dictionary<int,…> 时输出不带引号的整数键
 * （真实存档 CurrentArmyRanks: `"value" : {11:[3331,2],7:[3022,4]}`），严格 JSON.parse 抛错。
 * 保守补引号：仅处理 { 或 , 之后直接跟裸整数键的场景。
 * 局限（已接受）：字符串字面量内部若含 `{123:` 形式的文本会被改写 —— 真实存档不存在
 * 该模式（已对照实际 savedataN.cf / collection.cf 验证）。
 */
export function parseJsonLoose(text: string): unknown {
  return JSON.parse(text.replace(/([{,]\s*)(\d+)(\s*:)/g, '$1"$2"$3'))
}

/** 解析 ES3 JSON；顶层未包装的值也兼容 */
export function parseEs3(text: string): Es3Doc {
  const raw = parseJsonLoose(text) as Record<string, unknown>
  const doc: Es3Doc = {}
  for (const [k, v] of Object.entries(raw)) {
    doc[k] = isWrapped(v) ? v : { value: v }
  }
  return doc
}

/** 序列化：与游戏 ES3/LitJson 兼容（解析器不关心排版），UTF-8 无 BOM。
 * 关键：整型字典键必须输出为裸数字（与 parseJsonLoose 的宽松规则对称）——
 * 游戏侧 ES3JSONReader.Read_int() 直接 Int32.Parse 键名，带引号的键（JSON.stringify 默认
 * 输出 {"11":[…]}）会 FormatException 导致读档黑屏（Player.log 实证）。
 * 局限（已接受，与解析对称）：字符串值内部含 ,"123": 形式的文本会被改写 —— 真实存档不存在该模式。 */
export function stringifyEs3(doc: Es3Doc): string {
  return JSON.stringify(doc, null, 2).replace(/([{,]\s*)"(\d+)":/g, '$1$2:') + '\n'
}

export function getField<T>(doc: Es3Doc, key: string): T {
  const f = doc[key]
  if (!f) throw new Error(`ES3 字段缺失: ${key}`)
  return f.value as T
}

/** 只改 value，保留 __type */
export function setField(doc: Es3Doc, key: string, value: unknown): void {
  const f = doc[key]
  if (!f) throw new Error(`ES3 字段缺失: ${key}`)
  f.value = value
}
