import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { css, cx } from '@emotion/css'
import type { Person, Visibility } from '../types'
import { VISIBILITY_LABEL } from '../types'
import { useData, type PersonInput } from '../context/DataContext'
import { findDuplicates, newId } from '../lib/util'
import { normalizeText } from '../lib/normalize'
import { NeedsEditor, OfferingEditor } from '../components/ProfileEditors'
import { alertError, alertWarn, btn, btnPrimary, card, field, formGrid, input, muted, page, pageHeader, row, textarea } from '../styles/ui'

/** 名刺画像の上限（本番は Storage の非公開バケット card-images で同じ制限をかける） */
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const IMAGE_MAX_BYTES = 2 * 1024 * 1024

/** 基本情報の中の小見出し（会社の情報 / 本人の情報） */
const subHead = css`
  font-size: var(--fs);
  color: var(--c-muted);
  margin: 0 0 8px;
`
/** 名刺画像の表・裏をそれぞれ囲む枠 */
const imageBox = css`
  border: 1px solid var(--c-border);
  border-radius: var(--radius);
  padding: 12px;
  background: var(--c-surface);
  gap: 8px;
`
/** 小見出しどうしの間の薄い区切り線 */
const divider = css`
  border: none;
  border-top: 1px solid var(--c-border);
  margin: 16px 0;
`

function emptyPerson(ownerId: string): PersonInput {
  return {
    id: newId('p'), name: '', kana: null, companyId: null, department: null, title: null, email: null, phone: null, address: null, url: null,
    cardFrontUrl: null, cardBackUrl: null, exchangedOn: new Date().toISOString().slice(0, 10), exchangedAt: null, referrer: null, memo: null,
    visibility: 'company', ownerId, offering: { tagIds: [], description: null }, needs: [], needsNote: null,
  }
}

function toInput(p: Person): PersonInput {
  const { createdBy: _a, updatedBy: _b, createdAt: _c, updatedAt: _d, deletedAt: _e, ...rest } = p
  return structuredClone(rest)
}


export function PersonFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { db, me, people, savePerson, notify } = useData()
  const existing = id ? people.find((p) => p.id === id) : undefined
  const [form, setForm] = useState<PersonInput>(() => (existing ? toInput(existing) : emptyPerson(me!.id)))
  // 会社は名前を打つだけ。登録済みの会社に一致すればそれを使い、なければ保存時に新しく作る
  const [companyName, setCompanyName] = useState<string>(() => db.companies.find((c) => c.id === existing?.companyId)?.name ?? '')
  const [error, setError] = useState<string | null>(null)

  const companies = useMemo(() => [...db.companies].sort((a, b) => a.name.localeCompare(b.name, 'ja')), [db.companies])

  // 登録時に重複を知らせる
  const matchedCompany = useMemo(() => {
    const key = normalizeText(companyName)
    return key ? db.companies.find((c) => normalizeText(c.name) === key) : undefined
  }, [companyName, db.companies])
  const isNewCompany = !!companyName.trim() && !matchedCompany

  const duplicates = useMemo(() => {
    const tmpCompanies = isNewCompany ? [...db.companies, { id: '__tmp', name: companyName, industryTagId: null, size: null, regionTagId: null, address: null }] : db.companies
    return findDuplicates({ id: form.id, name: form.name, email: form.email, companyId: matchedCompany?.id ?? (isNewCompany ? '__tmp' : null) }, people, tmpCompanies)
  }, [form.id, form.name, form.email, companyName, matchedCompany, isNewCompany, people, db.companies])

  if (id && !existing) return <div className={page}><p>名刺が見つかりません（削除されたか、見る権限がありません）。</p><Link to="/people">一覧へ</Link></div>

  const set = <K extends keyof PersonInput>(k: K, v: PersonInput[K]) => setForm((f) => ({ ...f, [k]: v }))
  const text = (k: keyof PersonInput) => ({
    value: (form[k] as string | null) ?? '',
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(k, (e.target.value || null) as never),
  })

  const pickImage = (k: 'cardFrontUrl' | 'cardBackUrl') => (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!IMAGE_TYPES.includes(file.type)) { setError('画像は JPEG / PNG / WebP にしてください'); return }
    if (file.size > IMAGE_MAX_BYTES) { setError('画像は 2MB 以下にしてください'); return }
    // 本番: 新しいパスにアップロードしてから前のファイルを消す（同じパスに上書きしない）
    const reader = new FileReader()
    reader.onload = () => set(k, reader.result as string)
    reader.readAsDataURL(file)
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { setError('氏名は必須です'); return }
    const input = { ...form, name: form.name.trim(), companyId: matchedCompany?.id ?? null }
    const saved = await savePerson(input, isNewCompany ? companyName : null)
    notify(existing ? '保存しました' : '登録しました')
    navigate(`/people/${saved.id}`)
  }

  const activeUsers = db.profiles.filter((p) => p.active)

  return (
    <form className={page} onSubmit={submit}>
      <div className={pageHeader}>
        <h1>{existing ? '名刺を編集' : '名刺を登録'}</h1>
        <div className={row}>
          <button type="button" className={btn} onClick={() => navigate(-1)}>キャンセル</button>
          <button type="submit" className={btnPrimary}>保存</button>
        </div>
      </div>

      {error && <div className={alertError}>{error}</div>}
      {duplicates.length > 0 && (
        <div className={alertWarn}>
          重複しているかもしれない名刺があります:{' '}
          {duplicates.map((d) => <span key={d.person.id}><Link to={`/people/${d.person.id}`}>{d.person.name}</Link>（{d.reason}） </span>)}
          <div className={muted}>保存後、詳細画面の「重複の統合」で 1 つにまとめられます。</div>
        </div>
      )}

      <section className={card}>
        <h2>名刺画像</h2>
        <p className={muted}>JPEG / PNG / WebP、2MB まで。</p>
        <div className={css`display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px;`}>
          {(['cardFrontUrl', 'cardBackUrl'] as const).map((k) => (
            <div key={k} className={cx(field, imageBox)}>
              <span>{k === 'cardFrontUrl' ? '表' : '裏'}</span>
              {form[k] ? <img src={form[k]!} alt="" className={css`max-width: 100%; border: 1px solid var(--c-border); border-radius: var(--radius-sm);`} /> : <span className={muted}>未登録</span>}
              <div className={row}>
                <input type="file" accept={IMAGE_TYPES.join(',')} onChange={pickImage(k)} />
                {form[k] && <button type="button" className={btn} onClick={() => set(k, null)}>削除</button>}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={card}>
        <h2>基本情報</h2>
        {/* 名刺の上から読む順に、会社の情報 → 本人の情報 */}
        <h3 className={subHead}>会社の情報</h3>
        <div className={formGrid}>
          <label className={field} style={{ gridColumn: 'span 2' }}>
            <span>会社名</span>
            <input className={input} list="company-options" value={companyName} onChange={(e) => setCompanyName(e.target.value)}/>
            <datalist id="company-options">
              {companies.map((c) => <option key={c.id} value={c.name} />)}
            </datalist>
            <span className={muted}>
              {matchedCompany ? `登録済みの会社です（所属 ${people.filter((p) => p.companyId === matchedCompany.id && p.id !== form.id).length} 人）`
                : isNewCompany ? '新しい会社として登録されます（業種などは後から会社一覧で追加できます）'
                : '空欄なら「会社不明」になります'}
            </span>
          </label>
          <label className={field}><span>会社HP</span><input className={input} type="url" {...text('url')} /></label>
          <label className={field} style={{ gridColumn: '1 / -1' }}><span>住所</span><input className={input} {...text('address')} /></label>
        </div>

        <hr className={divider} />

        <h3 className={subHead}>本人の情報</h3>
        <div className={formGrid}>
          <label className={field}><span>氏名 *</span><input className={input} value={form.name} onChange={(e) => set('name', e.target.value)} required /></label>
          <label className={field}><span>ふりがな</span><input className={input} {...text('kana')} /></label>
          <label className={field}><span>部署</span><input className={input} {...text('department')} /></label>
          <label className={field}><span>役職</span><input className={input} {...text('title')} /></label>
          <label className={field}><span>メール</span><input className={input} type="email" {...text('email')} /></label>
          <label className={field}><span>電話</span><input className={input} type="tel" {...text('phone')} /></label>
        </div>
      </section>

      <section className={card}>
        <h2>交換の記録・管理</h2>
        <div className={formGrid}>
          <label className={field}><span>交換日</span><input className={input} type="date" {...text('exchangedOn')} /></label>
          <label className={field}><span>交換した場所・イベント</span><input className={input} {...text('exchangedAt')} /></label>
          <label className={field}><span>紹介者</span><input className={input} {...text('referrer')} /></label>
          <label className={field}>
            <span>見える範囲</span>
            <select className={input} value={form.visibility} onChange={(e) => set('visibility', e.target.value as Visibility)}>
              {(Object.keys(VISIBILITY_LABEL) as Visibility[]).map((v) => <option key={v} value={v}>{VISIBILITY_LABEL[v]}</option>)}
            </select>
          </label>
          <label className={field}>
            <span>持ち主（登録者）</span>
            <select className={input} value={form.ownerId} onChange={(e) => set('ownerId', e.target.value)} disabled={me?.role !== 'admin' && form.ownerId !== me?.id}>
              {activeUsers.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </label>
          <label className={field} style={{ gridColumn: '1 / -1' }}><span>メモ</span><textarea className={textarea} {...text('memo')} /></label>
        </div>
      </section>

      <section className={card}>
        <h2>事業内容・得意領域（提供できること）</h2>
        <OfferingEditor value={form.offering} onChange={(v) => set('offering', v)} />
      </section>

      <section className={card}>
        <h2>課題・希望（求めていること）</h2>
        <NeedsEditor value={form.needs} onChange={(v) => set('needs', v)} />
        <label className={field} style={{ marginTop: 12 }}>
          <span>自由記述（背景・事情など。マッチ率の計算には使いません）</span>
          <textarea className={textarea} {...text('needsNote')} placeholder="例: 来春までに自社 EC を立ち上げたい。予算は〇〇くらい" />
        </label>
      </section>
    </form>
  )
}
