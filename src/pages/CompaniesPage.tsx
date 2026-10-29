import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { css, cx } from '@emotion/css'
import { useData } from '../context/DataContext'
import { COMPANY_SIZES, COMPANY_SIZE_LABEL, type Company, type CompanySize } from '../types'
import { normalizeText } from '../lib/normalize'
import { SingleTagField } from '../components/TagPicker'
import { Modal } from '../components/Modal'
import { btn, btnPrimary, btnSmall, card, field, formGrid, input, muted, page, pageHeader, row, table, tableMiddle, tableWrap, unknown } from '../styles/ui'

/** 欄どうしの間の薄い区切り線 */
const divider = css`
  border: none;
  border-top: 1px solid var(--c-border);
  margin: 4px 0;
`

const clickableRow = css`
  cursor: pointer;
  &:hover td {
    background: var(--c-primary-weak);
  }
`

export function CompaniesPage() {
  const { db, people, saveCompany, notify } = useData()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState('')
  const editingId = params.get('id')
  const [draft, setDraft] = useState<Company | null>(null)

  const tagsById = useMemo(() => new Map(db.tags.map((t) => [t.id, t])), [db.tags])
  const list = useMemo(() => {
    const key = normalizeText(q)
    return db.companies.filter((c) => !key || normalizeText(c.name).includes(key)).sort((a, b) => a.name.localeCompare(b.name, 'ja'))
  }, [db.companies, q])

  const open = (c: Company) => { setDraft(structuredClone(c)); setParams({ id: c.id }) }
  const close = () => { setDraft(null); setParams({}) }

  // URL で指定された会社を開く
  const target = editingId ? db.companies.find((c) => c.id === editingId) : undefined
  if (target && draft?.id !== target.id) setDraft(structuredClone(target))
  const current = editingId ? draft : null

  const tagName = (id: string | null) => (id ? tagsById.get(id)?.name : null)

  return (
    <div className={page}>
      <div className={pageHeader}>
        <h1>会社一覧</h1>
      </div>
      <p className={muted}>会社は名刺の登録・CSV インポートのときに会社名から自動で作られます（所在地は名刺の住所）。業種・規模・地域は「編集」から足せます。業種・地域は名刺の「課題・希望」にある業種・地域タグの判定に使います。</p>

      <div className={cx(card, row)}>
        <input className={input} style={{ flex: '1 1 200px' }} placeholder="会社名で検索" value={q} onChange={(e) => setQ(e.target.value)} />
        <span className={muted}>{list.length} 社</span>
      </div>

      <div className={tableWrap}>
        <table className={cx(table, tableMiddle)}>
          <thead><tr><th>会社名</th><th>業種</th><th>規模</th><th>地域</th><th>人数</th><th /></tr></thead>
          <tbody>
            {list.map((c) => (
              <tr key={c.id} className={clickableRow} onClick={() => navigate(`/companies/${c.id}`)} title="所属の名刺を見る">
                <td><Link to={`/companies/${c.id}`} onClick={(e) => e.stopPropagation()}><strong>{c.name}</strong></Link></td>
                <td>{tagName(c.industryTagId) ?? <span className={unknown}>不明</span>}</td>
                <td>{c.size ? COMPANY_SIZE_LABEL[c.size] : <span className={unknown}>不明</span>}</td>
                <td>{tagName(c.regionTagId) ?? <span className={unknown}>不明</span>}</td>
                <td>{people.filter((p) => p.companyId === c.id).length}</td>
                <td><button className={cx(btn, btnSmall)} onClick={(e) => { e.stopPropagation(); open(c) }}>編集</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {current && (
        <Modal
          title="会社を編集"
          wide
          onClose={close}
          footer={<>
            <button className={btn} onClick={close}>キャンセル</button>
            <button className={btnPrimary} disabled={!current.name.trim()} onClick={async () => {
              await saveCompany({ ...current, name: current.name.trim() })
              close()
              notify('保存しました')
            }}>保存</button>
          </>}
        >
          <div className={formGrid}>
            <label className={field}><span>会社名 *</span><input className={input} value={current.name} onChange={(e) => setDraft({ ...current, name: e.target.value })} /></label>
            <SingleTagField label="業種" category="industry" value={current.industryTagId} onChange={(id) => setDraft({ ...current, industryTagId: id })} />
            <label className={field}>
              <span>従業員規模</span>
              <select className={input} value={current.size ?? ''} onChange={(e) => setDraft({ ...current, size: (e.target.value || null) as CompanySize | null })}>
                <option value="">不明</option>
                {COMPANY_SIZES.map((s) => <option key={s} value={s}>{COMPANY_SIZE_LABEL[s]}</option>)}
              </select>
            </label>
            <SingleTagField label="地域" category="region" value={current.regionTagId} onChange={(id) => setDraft({ ...current, regionTagId: id })} />
            <label className={field} style={{ gridColumn: 'span 2' }}><span>所在地</span><input className={input} value={current.address ?? ''} onChange={(e) => setDraft({ ...current, address: e.target.value || null })} /></label>
          </div>
          <hr className={divider} />
          <div className={muted}>
            所属する人: {people.filter((p) => p.companyId === current.id).map((p, i) => <span key={p.id}>{i > 0 && '、'}<Link to={`/people/${p.id}`}>{p.name}</Link></span>)}
          </div>
        </Modal>
      )}
    </div>
  )
}
