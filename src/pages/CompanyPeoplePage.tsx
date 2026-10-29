import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { css } from '@emotion/css'
import { useData } from '../context/DataContext'
import { COMPANY_SIZE_LABEL } from '../types'
import { PersonCard } from '../components/PersonCard'
import { btn, btnPrimary, card, dl, muted, page, pageHeader, personGrid, row, unknown } from '../styles/ui'

/** 会社の情報と提供・課題は縦に並べる */
const stack = css`
  display: flex;
  flex-direction: column;
  gap: var(--gap);
`

const backLink = css`
  font-size: var(--fs);
  margin-bottom: 10px;
`

/** 会社に所属する名刺だけの画面 */
export function CompanyPeoplePage() {
  const { id } = useParams()
  const { db, people, profilesById } = useData()

  const company = db.companies.find((c) => c.id === id)
  const tagsById = useMemo(() => new Map(db.tags.map((t) => [t.id, t])), [db.tags])

  const members = useMemo(
    () => people
      .filter((p) => p.companyId === id)
      .sort((a, b) => (a.kana ?? a.name).localeCompare(b.kana ?? b.name, 'ja') || a.id.localeCompare(b.id)),
    [people, id],
  )

  if (!company) return <div className={page}><p>会社が見つかりません。</p><Link to="/companies">会社一覧へ</Link></div>

  const tagName = (tid: string | null) => (tid ? tagsById.get(tid)?.name : null)
  const v = (x: string | null | undefined) => (x ? x : <span className={unknown}>不明</span>)

  return (
    <div className={page}>
      <div className={pageHeader}>
        <div>
          <div className={backLink}><Link to="/companies">← 会社一覧に戻る</Link></div>
          <h1>{company.name}</h1>
        </div>
        <div className={row}>
          <Link className={btn} to={`/companies?id=${company.id}`}>会社を編集</Link>
          <Link className={btnPrimary} to="/people/new">名刺を登録</Link>
        </div>
      </div>

      <div className={stack}>
        <section className={card}>
          <h2>会社の情報</h2>
          <dl className={dl}>
            <dt>業種</dt><dd>{v(tagName(company.industryTagId))}</dd>
            <dt>従業員規模</dt><dd>{v(company.size ? COMPANY_SIZE_LABEL[company.size] : null)}</dd>
            <dt>地域</dt><dd>{v(tagName(company.regionTagId))}</dd>
            <dt>所在地</dt><dd>{v(company.address)}</dd>
          </dl>
        </section>
      </div>

      <h2 className={css`font-size: var(--fs-lg);`}>所属の名刺 <span className={muted}>{members.length} 件</span></h2>

      {members.length === 0
        ? <p className={muted}>この会社に所属する名刺はありません（見る権限のない名刺は出ません）。</p>
        : (
          <div className={personGrid}>
            {members.map((p) => <PersonCard key={p.id} person={p} company={company} tagsById={tagsById} owner={profilesById.get(p.ownerId)} />)}
          </div>
        )}
    </div>
  )
}
