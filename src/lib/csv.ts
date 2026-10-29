// CSV の読み込み（Eight / Sansan などの書き出し CSV を想定）

/** バイト列を文字列にする。UTF-8 として読めなければ Shift_JIS として読む */
export function decodeCsvBytes(buf: ArrayBuffer, encoding: 'auto' | 'utf-8' | 'shift_jis'): { text: string; encoding: 'utf-8' | 'shift_jis' } {
  if (encoding === 'utf-8' || encoding === 'auto') {
    try {
      const text = new TextDecoder('utf-8', { fatal: true }).decode(buf)
      return { text: text.replace(/^\uFEFF/, ''), encoding: 'utf-8' }
    } catch (e) {
      if (encoding === 'utf-8') throw e
    }
  }
  return { text: new TextDecoder('shift_jis').decode(buf), encoding: 'shift_jis' }
}

/** RFC 4180 相当の CSV を行列にする（ダブルクォート内の改行・カンマに対応） */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ } else inQuotes = false
      } else field += ch
      continue
    }
    if (ch === '"') inQuotes = true
    else if (ch === ',') { row.push(field); field = '' }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(field); field = ''
      if (row.some((f) => f !== '')) rows.push(row)
      row = []
    } else field += ch
  }
  row.push(field)
  if (row.some((f) => f !== '')) rows.push(row)
  return rows
}

/** 取り込み先の項目 */
export type ImportField =
  | 'name' | 'kana' | 'company' | 'department' | 'title' | 'email' | 'phone' | 'address' | 'url' | 'exchangedOn' | 'memo' | 'lastName' | 'firstName'

export const IMPORT_FIELD_LABEL: Record<ImportField, string> = {
  name: '氏名',
  lastName: '姓',
  firstName: '名',
  kana: 'ふりがな',
  company: '会社名',
  department: '部署',
  title: '役職',
  email: 'メール',
  phone: '電話',
  address: '住所',
  url: '会社HP',
  exchangedOn: '交換日',
  memo: 'メモ',
}

/** 列名から取り込み先を推測する（Eight / Sansan の列名を想定） */
const GUESS: [RegExp, ImportField][] = [
  [/^(氏名|名前|フルネーム)$/, 'name'],
  [/^姓$/, 'lastName'],
  [/^名$/, 'firstName'],
  [/(ふりがな|フリガナ|よみ|カナ)/, 'kana'],
  // 「会社HP」が会社名と取り違えられないよう、会社名より先に見る
  [/(url|ホームページ|hp|web)/i, 'url'],
  [/(会社名|企業名|会社)/, 'company'],
  [/(部署|所属)/, 'department'],
  [/(役職|肩書)/, 'title'],
  [/(e-?mail|メール)/i, 'email'],
  [/(携帯|電話|tel)/i, 'phone'],
  [/(住所|所在地)/, 'address'],
  [/(名刺交換日|交換日)/, 'exchangedOn'],
  [/(メモ|備考)/, 'memo'],
]

export function guessMapping(headers: string[]): (ImportField | null)[] {
  const used = new Set<ImportField>()
  return headers.map((h) => {
    const key = h.trim()
    for (const [re, f] of GUESS) {
      if (!used.has(f) && re.test(key)) { used.add(f); return f }
    }
    return null
  })
}

/** 日付らしき文字列を YYYY-MM-DD にする。読めなければ null */
export function toDateString(s: string): string | null {
  const m = s.normalize('NFKC').trim().match(/^(\d{4})[/\-.年](\d{1,2})[/\-.月](\d{1,2})/)
  if (!m) return null
  return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
}

/** 取り込み用テンプレートの列（列名は取り込み時の自動対応付けで認識される名前にする） */
const TEMPLATE_HEADERS = ['氏名', 'ふりがな', '会社名', '部署', '役職', 'メール', '電話', '住所', '会社HP', '交換日', 'メモ']
const TEMPLATE_SAMPLE = ['見本 太郎', 'みほん たろう', '架空サンプル株式会社', '営業部', '部長', 'mihon@example.com', '000-0000-0000', '東京都架空区サンプル1-2-3', 'https://example.com', '2026/10/01', 'この行は記入例です。消してから使ってください']

function csvEscape(v: string): string {
  return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
}

/** テンプレート CSV（Excel で文字化けしないよう BOM 付き UTF-8） */
export function buildTemplateCsv(): Blob {
  const text = [TEMPLATE_HEADERS, TEMPLATE_SAMPLE].map((r) => r.map(csvEscape).join(',')).join('\r\n') + '\r\n'
  return new Blob(['\uFEFF' + text], { type: 'text/csv;charset=utf-8' })
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
