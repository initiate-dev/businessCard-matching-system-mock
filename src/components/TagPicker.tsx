import { useId, useMemo, useState } from 'react'
import { css, cx } from '@emotion/css'
import type { ID, Tag, TagCategory } from '../types'
import { TAG_CATEGORY_LABEL } from '../types'
import { normalizeText, resolveTag, tagKeys } from '../lib/normalize'
import { useData } from '../context/DataContext'
import { btn, btnSmall, input, pillTab, pillTabActive, pillTabs, row } from '../styles/ui'

const list = css`
  position: absolute;
  z-index: 50;
  top: 100%;
  left: 0;
  right: 0;
  margin: 2px 0 0;
  padding: 4px 0;
  list-style: none;
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow);
  max-height: 240px;
  overflow: auto;
  li button {
    width: 100%;
    text-align: left;
    padding: 6px 10px;
    border: none;
    background: none;
    cursor: pointer;
  }
  li button:hover {
    background: var(--c-surface-2);
  }
`

const ALL_CATS = Object.keys(TAG_CATEGORY_LABEL) as TagCategory[]

const smallTab = css`
  padding: 2px 10px;
  font-size: var(--fs-sm);
`

/**
 * タグを 1 つ選ぶ入力欄。正規名・別名（表記ゆれ込み）で候補を出す。
 * 分類が複数あるときは分類タブで候補を切り替える。辞書にないときは選んでいる分類でその場で追加できる。
 */
export function TagPicker({ onPick, exclude = [], categories, placeholder = 'タグを入力（別名でも可）' }: {
  onPick: (id: ID) => void
  exclude?: ID[]
  categories?: TagCategory[]
  placeholder?: string
}) {
  const { db, addTag, notify } = useData()
  const cats = categories ?? ALL_CATS
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<TagCategory>(cats[0])
  const listId = useId()

  const candidates = useMemo(() => {
    const key = normalizeText(q)
    const pool = db.tags
      .filter((t) => !exclude.includes(t.id) && t.category === tab)
      .sort((a, b) => a.name.localeCompare(b.name, 'ja'))
    if (!key) return pool.slice(0, 50)
    return pool.filter((t) => tagKeys(t).some((k) => k.includes(key))).slice(0, 50)
  }, [q, db.tags, exclude, tab])

  const exact = q ? resolveTag(q, db.tags) : null
  // 入力と同じタグが、選んでいない分類や対象外の分類にある
  const exactElsewhere = exact && exact.category !== tab ? exact : null

  const pick = (t: Tag) => {
    onPick(t.id)
    setQ('')
    setOpen(false)
  }

  const create = async () => {
    const r = await addTag({ name: q, category: tab, aliases: [] })
    if (typeof r === 'string') notify(r)
    else pick(r)
  }

  return (
    <div className={css`display: flex; flex-direction: column; gap: 6px;`}>
      {cats.length > 1 && (
        <div className={pillTabs} role="tablist" aria-label="タグの分類">
          {cats.map((c) => (
            <button key={c} type="button" role="tab" aria-selected={tab === c} className={cx(pillTab, smallTab, tab === c && pillTabActive)} onClick={() => setTab(c)}>
              {TAG_CATEGORY_LABEL[c]}
            </button>
          ))}
        </div>
      )}
      <div className={css`position: relative;`}>
        <input
          className={input}
          value={q}
          placeholder={cats.length > 1 ? `${TAG_CATEGORY_LABEL[tab]}のタグを入力（別名でも可）` : placeholder}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          onChange={(e) => { setQ(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              if (exact && !exactElsewhere && !exclude.includes(exact.id)) pick(exact)
              else if (candidates[0]) pick(candidates[0])
            }
          }}
        />
        {open && candidates.length > 0 && (
          <ul className={list} id={listId} role="listbox">
            {candidates.map((t) => (
              <li key={t.id}>
                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pick(t)}>
                  {t.name}
                  {t.aliases.length > 0 && <span className={css`color: var(--c-muted); font-size: var(--fs-sm); margin-left: 6px;`}>{t.aliases.join('、')}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {q.trim() && exactElsewhere && (
        <div className={row}>
          <span className={css`font-size: var(--fs-sm); color: var(--c-muted);`}>「{exactElsewhere.name}」は{TAG_CATEGORY_LABEL[exactElsewhere.category]}の分類にあります。</span>
          {cats.includes(exactElsewhere.category) && !exclude.includes(exactElsewhere.id) && (
            <button type="button" className={`${btn} ${btnSmall}`} onClick={() => pick(exactElsewhere)}>これを使う</button>
          )}
        </div>
      )}
      {q.trim() && !exact && (
        <div className={row}>
          <span className={css`font-size: var(--fs-sm); color: var(--c-muted);`}>辞書にありません。</span>
          <button type="button" className={`${btn} ${btnSmall}`} onClick={create}>「{q.trim()}」を{TAG_CATEGORY_LABEL[tab]}として辞書に追加して使う</button>
        </div>
      )}
    </div>
  )
}

/**
 * 分類を 1 つに絞ってタグを 1 つだけ選ぶ欄（会社の業種・地域など）。
 * 未選択なら入力欄（辞書にないものはその場で追加できる）、選択済みならタグと「外す」ボタンを出す。
 */
export function SingleTagField({ label, category, value, onChange }: {
  label: string
  category: TagCategory
  value: ID | null
  onChange: (id: ID | null) => void
}) {
  const { db } = useData()
  const tag = value ? db.tags.find((t) => t.id === value) : undefined
  return (
    <div className={css`display: flex; flex-direction: column; gap: 4px; min-width: 0; > span:first-child { font-size: var(--fs-sm); color: var(--c-muted); font-weight: 600; }`}>
      <span>{label}</span>
      {value ? (
        <div className={row} style={{ minHeight: 36 }}>
          <strong>{tag?.name ?? '（削除されたタグ）'}</strong>
          <button type="button" className={`${btn} ${btnSmall}`} onClick={() => onChange(null)}>外す</button>
        </div>
      ) : (
        <TagPicker categories={[category]} placeholder={`${TAG_CATEGORY_LABEL[category]}を入力（未選択は「不明」）`} onPick={(id) => onChange(id)} />
      )}
    </div>
  )
}
