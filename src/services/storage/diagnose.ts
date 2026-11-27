/** 把 IndexedDB / Dexie 的底层异常翻译成用户能看懂的提示 */
export function explainStorageError(e: unknown): string {
  const name = e instanceof Error ? e.name : ''
  const raw = e instanceof Error ? e.message : String(e)

  if (name === 'QuotaExceededError' || /quota|storage full|exceeded/i.test(raw)) {
    return '浏览器本地存储空间已满，请清理浏览器缓存或更换浏览器后重试'
  }
  if (name === 'SecurityError' || /security|denied|blocked/i.test(raw)) {
    return '浏览器阻止了本地存储（隐私/无痕模式或站点存储权限被禁），请关闭无痕模式后重试'
  }
  if (/VersionError|SchemaDiffError|Upgrade|version/i.test(raw)) {
    return '本地数据结构需要更新，请强制刷新页面（Ctrl/Cmd + Shift + R）后重试'
  }
  if (/randomUUID|crypto/i.test(raw)) {
    return '当前页面环境不支持安全随机数，请通过 https 地址访问后重试'
  }
  if (/DataCloneError|clone|structured/i.test(raw)) {
    return '数据格式异常，请刷新页面后重试；若仍失败请先在设置里备份数据'
  }
  return `本地存储写入失败：${raw}`
}

/** 主动探测本地存储是否可用，用于页面自检提示 */
export async function checkStorageAvailable(): Promise<{ ok: boolean; message: string }> {
  try {
    if (typeof indexedDB === 'undefined') {
      return { ok: false, message: '当前浏览器不支持 IndexedDB，数据将无法保存' }
    }
    const probe = indexedDB.open('__wardrobe_probe__', 1)
    await new Promise<void>((resolve, reject) => {
      probe.onsuccess = () => { probe.result.close(); resolve() }
      probe.onerror = () => reject(probe.error ?? new Error('无法打开本地数据库'))
      probe.onblocked = () => reject(new Error('本地数据库被其他页面占用'))
    })
    return { ok: true, message: '本地存储正常' }
  } catch (e) {
    return { ok: false, message: explainStorageError(e) }
  }
}
