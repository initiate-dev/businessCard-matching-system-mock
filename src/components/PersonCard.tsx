import { Link, useNavigate } from 'react-router-dom'
import { css, cx } from '@emotion/css'
import type { Company, Person, Profile, Tag } from '../types'
import { VISIBILITY_LABEL } from '../types'
import { TagChip } from './Badges'
import { card, muted, row, table, tableWrap, unknown } from '../styles/ui'

const personCard = css`
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: inherit;
  text-decoration: none !important;
  transition: border-color 0.15s;
  &:hover {
    border-color: var(--c-primary);
  }
`

export function PersonCard({ person: p, company, tagsById, owner }: {
  person: Person
  company: Company | undefined
  tagsById: Map<string, Tag>
  owner: Profile | undefined
}) {
  return (
    <Link to={`/people/${p.id}`} className={cx(card, personCard)}>
      <div className={muted}>{p.kana ?? <span className={unknown}>ふりがな不明</span>}</div>
      <strong style={{ fontSize: 16 }}>{p.name}</strong>
      <div>{company?.name ?? <span className={unknown}>会社不明</span>}</div>
      <div className={muted}>{[p.department, p.title].filter(Boolean).join(' / ') || '部署・役職不明'}</div>
      <div className={row} style={{ gap: 4 }}>
        {p.offering.tagIds.slice(0, 3).map((id) => <TagChip key={id} tag={tagsById.get(id)} suffix="提供" />)}
        {p.needs.slice(0, 3).map((n) => <TagChip key={n.id} tag={tagsById.get(n.tagId)} suffix="求" />)}
      </div>
      <div className={muted}>交換日 {p.exchangedOn ?? '不明'} ・ {owner?.name ?? '不明'} ・ {VISIBILITY_LABEL[p.visibility]}</div>
    </Link>
  )
}

const clickableRow = css`
  cursor: pointer;
  &:hover td {
    background: var(--c-primary-weak);
  }
`

/** 名刺のリスト表示（1 行 1 枚） */
export function PersonTable({ people, companiesById, tagsById, profilesById }: {
  people: Person[]
  companiesById: Map<string, Company>
  tagsById: Map<string, Tag>
  profilesById: Map<string, Profile>
}) {
  const navigate = useNavigate()
  return (
    <div className={tableWrap}>
      <table className={table}>
        <thead>
          <tr><th>氏名</th><th>会社</th><th>部署・役職</th><th>提供できること / 求めていること</th><th>交換日</th><th>持ち主</th><th>見える範囲</th></tr>
        </thead>
        <tbody>
          {people.map((p) => {
            const company = p.companyId ? companiesById.get(p.companyId) : undefined
            return (
              <tr key={p.id} className={clickableRow} onClick={() => navigate(`/people/${p.id}`)}>
                <td>
                  <Link to={`/people/${p.id}`} onClick={(e) => e.stopPropagation()}><strong>{p.name}</strong></Link>
                  <div className={muted}>{p.kana ?? 'ふりがな不明'}</div>
                </td>
                <td>{company?.name ?? <span className={unknown}>不明</span>}</td>
                <td>{[p.department, p.title].filter(Boolean).join(' / ') || <span className={unknown}>不明</span>}</td>
                <td>
                  <div className={row} style={{ gap: 4 }}>
                    {p.offering.tagIds.slice(0, 3).map((id) => <TagChip key={id} tag={tagsById.get(id)} suffix="提供" />)}
                    {p.needs.slice(0, 3).map((n) => <TagChip key={n.id} tag={tagsById.get(n.tagId)} suffix="求" />)}
                    {p.offering.tagIds.length + p.needs.length === 0 && <span className={muted}>未登録</span>}
                  </div>
                </td>
                <td style={{ whiteSpace: 'nowrap' }}>{p.exchangedOn ?? <span className={unknown}>不明</span>}</td>
                <td style={{ whiteSpace: 'nowrap' }}>{profilesById.get(p.ownerId)?.name ?? '不明'}</td>
                <td style={{ whiteSpace: 'nowrap' }}>{VISIBILITY_LABEL[p.visibility]}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
