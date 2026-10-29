import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { css, cx } from '@emotion/css'
import { useData } from '../context/DataContext'
import type { PeopleView, Person } from '../types'
import { normalizeText, tagKeys } from '../lib/normalize'
import { PersonCard, PersonTable } from '../components/PersonCard'
import { Icon } from '../components/Icons'
import { Modal } from '../components/Modal'
import { ImportButton } from '../components/ImportButton'
import { ImportPage } from './ImportPage'
import { btnPrimary, card, input, muted, page, pageHeader, personGrid, pillTab, pillTabActive, pillTabs, row } from '../styles/ui'

const PAGE_SIZE = 20

type SortKey = 'updated' | 'exchanged' | 'kana'

/** カード / リストの切り替えボタン */
const viewToggle = css`
  display: inline-flex;
  margin-left: auto;
  flex-shrink: 0;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  overflow: hidden;
  background: var(--c-surface);
  button {
    display: grid;
    place-items: center;
    width: 36px;
    height: 34px;
    border: none;
    background: none;
    color: var(--c-muted);
    cursor: pointer;
  }
  button + button {
    border-left: 1px solid var(--c-border);
  }
  button:hover {
    background: var(--c-surface-2);
  }
`
const viewOn = css`
  background: var(--c-primary-weak) !important;
  color: var(--c-primary) !important;
`

/** 提供側 = 事業内容・得意領域のタグあり、求める側 = 課題・希望のタグあり。両方ある人は両方に出る */
type RoleTab = 'all' | 'provider' | 'seeker'

const ROLE_TABS: { key: RoleTab; label: string }[] = [
  { key: 'all', label: 'すべて' },
  { key: 'provider', label: '提供側' },
  { key: 'seeker', label: '求める側' },
]

export function PeopleListPage() {
  const { db, me, myPrefs, people, profilesById, updatePreferences } = useData()
  const view: PeopleView = myPrefs?.peopleView ?? 'grid'
  const [q, setQ] = useState('')
  const [mineOnly, setMineOnly] = useState(false)
  const [sort, setSort] = useState<SortKey>('updated')
  const [roleTab, setRoleTab] = useState<RoleTab>('all')
  const [limit, setLimit] = useState(PAGE_SIZE)
  const sentinel = useRef<HTMLDivElement>(null)
  // CSV インポートのモーダル（?import=1 で開いた状態から始める）
  const [params, setParams] = useSearchParams()
  const importing = params.get('import') === '1'
  const setImporting = (v: boolean) => setParams(v ? { import: '1' } : {})

  const tagsById = useMemo(() => new Map(db.tags.map((t) => [t.id, t])), [db.tags])
  const companiesById = useMemo(() => new Map(db.companies.map((c) => [c.id, c])), [db.companies])

  // 人ごとに 提供側 / 求める側 かを判定
  const roles = useMemo(() => {
    const m = new Map<string, { provider: boolean; seeker: boolean }>()
    for (const p of people) {
      m.set(p.id, { provider: p.offering.tagIds.length > 0, seeker: p.needs.length > 0 })
    }
    return m
  }, [people])
  const inTab = (p: Person, t: RoleTab) => t === 'all' || !!roles.get(p.id)?.[t]

  const searched = useMemo(() => {
    const key = normalizeText(q)
    const list = people.filter((p) => {
      if (mineOnly && p.ownerId !== me?.id) return false
      if (!key) return true
      const company = p.companyId ? companiesById.get(p.companyId) : undefined
      const texts = [p.name, p.kana, company?.name, p.email, p.department, p.title, p.exchangedAt, p.memo].filter(Boolean) as string[]
      if (texts.some((t) => normalizeText(t).includes(key))) return true
      const tagIds = [...p.offering.tagIds, ...p.needs.map((n) => n.tagId)]
      return tagIds.some((id) => { const t = tagsById.get(id); return t ? tagKeys(t).some((k) => k.includes(key)) : false })
    })
    // 一意な並び順にする（同じ値なら id で並べる）
    const cmp: Record<SortKey, (a: typeof list[number], b: typeof list[number]) => number> = {
      updated: (a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id),
      exchanged: (a, b) => (b.exchangedOn ?? '').localeCompare(a.exchangedOn ?? '') || a.id.localeCompare(b.id),
      kana: (a, b) => (a.kana ?? a.name).localeCompare(b.kana ?? b.name, 'ja') || a.id.localeCompare(b.id),
    }
    return [...list].sort(cmp[sort])
  }, [people, q, mineOnly, sort, me, companiesById, tagsById])

  const filtered = searched.filter((p) => inTab(p, roleTab))

  // 一番下が見えたら次の 20 枚を描く
  useEffect(() => {
    const el = sentinel.current
    if (!el) return
    const io = new IntersectionObserver((es) => { if (es[0].isIntersecting) setLimit((l) => l + PAGE_SIZE) })
    io.observe(el)
    return () => io.disconnect()
  }, [filtered.length])

  return (
    <div className={page}>
      <div className={pageHeader}>
        <h1>名刺一覧</h1>
        <div className={row}>
          <ImportButton onImport={() => setImporting(true)} />
          <Link className={btnPrimary} to="/people/new">名刺を登録</Link>
        </div>
      </div>

      <div className={cx(card, row)}>
        <input className={input} style={{ flex: '1 1 240px' }} placeholder="氏名・会社・メール・タグなどで検索" value={q} onChange={(e) => { setQ(e.target.value); setLimit(PAGE_SIZE) }} />
        <select className={input} style={{ width: 'auto' }} value={sort} onChange={(e) => { setSort(e.target.value as SortKey); setLimit(PAGE_SIZE) }}>
          <option value="updated">更新が新しい順</option>
          <option value="exchanged">交換日が新しい順</option>
          <option value="kana">ふりがな順</option>
        </select>
        <label className={row}><input type="checkbox" checked={mineOnly} onChange={(e) => { setMineOnly(e.target.checked); setLimit(PAGE_SIZE) }} />自分の名刺だけ</label>
      </div>

      <div className={row} style={{ flexWrap: 'nowrap' }}>
        <div className={pillTabs} role="tablist" aria-label="提供側・求める側">
          {ROLE_TABS.map((t) => (
            <button key={t.key} role="tab" aria-selected={roleTab === t.key} className={cx(pillTab, roleTab === t.key && pillTabActive)} onClick={() => { setRoleTab(t.key); setLimit(PAGE_SIZE) }}>
              {t.label}<span>{searched.filter((p) => inTab(p, t.key)).length}</span>
            </button>
          ))}
        </div>
        <div className={viewToggle} role="group" aria-label="表示の切り替え">
          {([['grid', 'カードで表示'], ['list', 'リストで表示']] as const).map(([v, label]) => (
            <button key={v} type="button" title={label} aria-label={label} aria-pressed={view === v} className={cx(view === v && viewOn)} onClick={() => updatePreferences({ peopleView: v })}>
              <Icon name={v} size={18} />
            </button>
          ))}
        </div>
      </div>
      <p className={muted} style={{ margin: 0 }}>
        {roleTab === 'provider' && '事業内容・得意領域（提供できること）のタグを登録している人。'}
        {roleTab === 'seeker' && '課題・希望（求めていること）のタグを登録している人。'}
        {roleTab === 'all' && 'すべての名刺。'}
        両方を登録している人は提供側・求める側の両方に出ます。
      </p>

      {filtered.length === 0 && <p className={muted}>該当する名刺はありません。</p>}

      {filtered.length > 0 && (view === 'list' ? (
        <PersonTable people={filtered.slice(0, limit)} companiesById={companiesById} tagsById={tagsById} profilesById={profilesById} />
      ) : (
        <div className={personGrid}>
          {filtered.slice(0, limit).map((p) => (
            <PersonCard key={p.id} person={p} company={p.companyId ? companiesById.get(p.companyId) : undefined} tagsById={tagsById} owner={profilesById.get(p.ownerId)} />
          ))}
        </div>
      ))}
      {filtered.length > limit && <div ref={sentinel} className={muted} style={{ textAlign: 'center', padding: 12 }}>読み込み中…</div>}

      {importing && (
        <Modal title="CSV インポート" wide onClose={() => setImporting(false)}>
          <ImportPage embedded />
        </Modal>
      )}
    </div>
  )
}
