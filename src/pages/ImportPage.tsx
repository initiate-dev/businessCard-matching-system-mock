import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { css } from '@emotion/css'
import { useData, type PersonInput } from '../context/DataContext'
import { VISIBILITY_LABEL, type Visibility } from '../types'
import { IMPORT_FIELD_LABEL, decodeCsvBytes, guessMapping, parseCsv, toDateString, type ImportField } from '../lib/csv'
import { findDuplicates, newId } from '../lib/util'
import { normalizeEmail } from '../lib/normalize'
import { alertError, alertInfo, alertWarn, btn, btnPrimary, card, chip, field, input, muted, page, pageHeader, row, table, tableWrap } from '../styles/ui'

const SAMPLE_CSV = `会社名,部署名,役職,姓,名,フリガナ,e-mail,電話番号,名刺交換日
架空テック株式会社,開発部,部長,見本,一郎,ミホン イチロウ,mihon@kakuu-tech.example,000-1111-2222,2026/10/01
サンプル精工株式会社,生産技術部,部長,山田,太郎,ヤマダ タロウ,yamada@sample-seiko.example,,2026/10/02
仮置き商店,,店主,試験,花子,シケン ハナコ,,000-3333-4444,2026/10/03`

type Row = { values: Partial<Record<ImportField, string>>; dup: string | null }

export function ImportPage({ embedded = false }: { embedded?: boolean }) {
  const { db, me, people, importPeople, notify } = useData()
  const navigate = useNavigate()
  const [encoding, setEncoding] = useState<'auto' | 'utf-8' | 'shift_jis'>('auto')
  const [detected, setDetected] = useState<string | null>(null)
  const [rows, setRows] = useState<string[][] | null>(null)
  const [mapping, setMapping] = useState<(ImportField | null)[]>([])
  const [skipDup, setSkipDup] = useState(true)
  const [visibility, setVisibility] = useState<Visibility>('company')
  const [error, setError] = useState<string | null>(null)

  const load = (text: string, enc: string) => {
    const parsed = parseCsv(text)
    if (parsed.length < 2) { setError('データ行がありません（1 行目は列名にしてください）'); setRows(null); return }
    setError(null)
    setRows(parsed)
    setMapping(guessMapping(parsed[0]))
    setDetected(enc)
  }

  const onFile = async (f: File | undefined) => {
    if (!f) return
    try {
      const { text, encoding: enc } = decodeCsvBytes(await f.arrayBuffer(), encoding)
      load(text, enc === 'utf-8' ? 'UTF-8' : 'Shift_JIS')
    } catch {
      setError('UTF-8 として読めませんでした。文字コードを Shift_JIS にして読み直してください')
    }
  }

  const preview: Row[] = useMemo(() => {
    if (!rows) return []
    const seenEmails = new Set<string>()
    return rows.slice(1).map((r) => {
      const values: Partial<Record<ImportField, string>> = {}
      mapping.forEach((f, i) => { if (f && r[i]?.trim()) values[f] = r[i].trim() })
      if (!values.name && (values.lastName || values.firstName)) values.name = [values.lastName, values.firstName].filter(Boolean).join(' ')
      const company = values.company ? db.companies.find((c) => c.name === values.company) : undefined
      const hits = findDuplicates({ name: values.name ?? '', email: values.email ?? null, companyId: company?.id ?? null }, people, db.companies)
      let dup = hits.length ? `既存: ${hits[0].person.name}（${hits[0].reason}）` : null
      const em = normalizeEmail(values.email ?? null)
      if (!dup && em && seenEmails.has(em)) dup = 'ファイル内で同じメール'
      if (em) seenEmails.add(em)
      return { values, dup }
    })
  }, [rows, mapping, people, db.companies])

  const importable = preview.filter((r) => r.values.name && (!skipDup || !r.dup))

  const run = async () => {
    const inputs: (PersonInput & { companyName: string | null })[] = importable.map(({ values: v }) => ({
      id: newId('p'), name: v.name!, kana: v.kana ?? null, companyId: null, companyName: v.company ?? null,
      department: v.department ?? null, title: v.title ?? null, email: v.email ?? null, phone: v.phone ?? null, address: v.address ?? null, url: v.url ?? null,
      cardFrontUrl: null, cardBackUrl: null, exchangedOn: v.exchangedOn ? toDateString(v.exchangedOn) : null, exchangedAt: 'CSV 取り込み', referrer: null, memo: v.memo ?? null,
      visibility, ownerId: me!.id, offering: { tagIds: [], description: null }, needs: [], needsNote: null,
    }))
    const n = await importPeople(inputs)
    notify(`${n} 件を取り込みました。タグ（提供できること・求めていること）は各名刺で追加してください`)
    navigate('/people')
  }

  const fields = Object.keys(IMPORT_FIELD_LABEL) as ImportField[]

  return (
    <div className={page}>
      {!embedded && <div className={pageHeader}><h1>CSV 取り込み</h1></div>}
      <p className={muted}>Eight / Sansan などから書き出した CSV を取り込めます。1 行目は列名にしてください。文字コードは自動判定（UTF-8 で読めなければ Shift_JIS）です。</p>

      <section className={card}>
        <h2>1. ファイルを選ぶ</h2>
        <div className={row}>
          <label className={field}>
            <span>文字コード</span>
            <select className={input} value={encoding} onChange={(e) => setEncoding(e.target.value as typeof encoding)}>
              <option value="auto">自動</option>
              <option value="utf-8">UTF-8</option>
              <option value="shift_jis">Shift_JIS</option>
            </select>
          </label>
          <input type="file" accept=".csv,text/csv" onChange={(e) => onFile(e.target.files?.[0])} />
          <button className={btn} onClick={() => load(SAMPLE_CSV, 'UTF-8（サンプル）')}>サンプル CSV で試す</button>
        </div>
        {detected && <div className={muted} style={{ marginTop: 8 }}>読み込んだ文字コード: {detected} ／ {rows ? rows.length - 1 : 0} 行</div>}
        {error && <div className={alertError} style={{ marginTop: 8 }}>{error}</div>}
      </section>

      {rows && (
        <>
          <section className={card}>
            <h2>2. 列の対応付け</h2>
            <div className={css`display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px;`}>
              {rows[0].map((h, i) => (
                <label key={i} className={field}>
                  <span>{h || `（列 ${i + 1}）`}</span>
                  <select className={input} value={mapping[i] ?? ''} onChange={(e) => setMapping(mapping.map((m, j) => (j === i ? ((e.target.value || null) as ImportField | null) : m)))}>
                    <option value="">取り込まない</option>
                    {fields.map((f) => <option key={f} value={f}>{IMPORT_FIELD_LABEL[f]}</option>)}
                  </select>
                </label>
              ))}
            </div>
            {!mapping.includes('name') && !mapping.includes('lastName') && <div className={alertWarn} style={{ marginTop: 10 }}>「氏名」または「姓」「名」の列を選んでください。</div>}
          </section>

          <section className={card}>
            <h2>3. プレビュー</h2>
            <div className={row} style={{ marginBottom: 10 }}>
              <label className={row}><input type="checkbox" checked={skipDup} onChange={(e) => setSkipDup(e.target.checked)} />重複の疑いがある行は取り込まない</label>
              <label className={row}>見える範囲
                <select className={input} style={{ width: 'auto' }} value={visibility} onChange={(e) => setVisibility(e.target.value as Visibility)}>
                  {(Object.keys(VISIBILITY_LABEL) as Visibility[]).map((v) => <option key={v} value={v}>{VISIBILITY_LABEL[v]}</option>)}
                </select>
              </label>
            </div>
            <div className={tableWrap}>
              <table className={table}>
                <thead><tr><th>判定</th><th>氏名</th><th>ふりがな</th><th>会社</th><th>部署・役職</th><th>メール</th><th>交換日</th></tr></thead>
                <tbody>
                  {preview.slice(0, 100).map((r, i) => (
                    <tr key={i} style={r.dup || !r.values.name ? { opacity: 0.6 } : undefined}>
                      <td>{!r.values.name ? <span className={chip}>氏名なし</span> : r.dup ? <span className={chip} title={r.dup}>重複? {r.dup}</span> : <span className={chip}>新規</span>}</td>
                      <td>{r.values.name}</td>
                      <td>{r.values.kana}</td>
                      <td>{r.values.company}</td>
                      <td>{[r.values.department, r.values.title].filter(Boolean).join(' / ')}</td>
                      <td>{r.values.email}</td>
                      <td>{r.values.exchangedOn && (toDateString(r.values.exchangedOn) ?? <span className={muted}>読めない日付</span>)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {preview.length > 100 && <p className={muted}>先頭 100 行を表示しています。</p>}
            <div className={alertInfo} style={{ margin: '12px 0' }}>{importable.length} 件を取り込みます（全 {preview.length} 行）。会社名が辞書にない会社は新しく作ります。</div>
            <button className={btnPrimary} disabled={importable.length === 0} onClick={run}>取り込む</button>
          </section>
        </>
      )}
    </div>
  )
}
