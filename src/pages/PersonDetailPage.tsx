import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { css, cx } from '@emotion/css'
import { useData } from '../context/DataContext'
import { IMPORTANCE_LABEL, VISIBILITY_LABEL } from '../types'
import { buildMatchContext, findProvidersFor, findSeekersFor } from '../lib/match'
import { findDuplicates, formatDateTime } from '../lib/util'
import { StatusBadge, TagChip } from '../components/Badges'
import { MatchList } from '../components/MatchList'
import { ConfirmModal } from '../components/Modal'
import { alertWarn, btn, btnDanger, btnPrimary, card, dl, grid2, muted, page, pageHeader, row, unknown } from '../styles/ui'

/** 未登録のカード（グレーにして操作できなくする） */
const cardOff = css`
  background: var(--c-surface-2);
  box-shadow: none;
  opacity: 0.6;
  pointer-events: none;
  user-select: none;
`
/** カードの中の区切り線と小見出し（登録内容 → 候補） */
const divider = css`
  border: none;
  border-top: 1px solid var(--c-border);
  margin: 16px 0 12px;
`
const subHead = css`
  font-size: var(--fs);
  margin: 0 0 10px;
`

function V({ v }: { v: string | null | undefined }) {
  return v ? <>{v}</> : <span className={unknown}>不明</span>
}

export function PersonDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { db, people, profilesById, deletePerson, mergePeople, notify, me, myPrefs } = useData()
  const [confirm, setConfirm] = useState<null | { kind: 'delete' } | { kind: 'merge'; dropId: string }>(null)

  const person = people.find((p) => p.id === id)
  const ctx = useMemo(() => buildMatchContext(db.tags, db.companies, db.introductions), [db.tags, db.companies, db.introductions])
  const peopleById = useMemo(() => new Map(people.map((p) => [p.id, p])), [people])
  const minScore = myPrefs?.minMatchScore ?? 0

  const providers = useMemo(() => (person ? findProvidersFor(person, people, ctx).filter((r) => r.score >= minScore) : []), [person, people, ctx, minScore])
  const seekers = useMemo(() => (person ? findSeekersFor(person, people, ctx).filter((r) => r.score >= minScore) : []), [person, people, ctx, minScore])
  const duplicates = useMemo(() => (person ? findDuplicates(person, people, db.companies) : []), [person, people, db.companies])

  if (!person) return <div className={page}><p>名刺が見つかりません（削除されたか、見る権限がありません）。</p><Link to="/people">一覧へ</Link></div>

  const company = person.companyId ? db.companies.find((c) => c.id === person.companyId) : undefined
  const tag = (tid: string) => ctx.tagsById.get(tid)
  const intros = db.introductions.filter((i) => i.providerId === person.id || i.seekerId === person.id)
  // 未登録の欄はカードごと非活性（グレー）にする
  const hasOffering = person.offering.tagIds.length > 0 || !!person.offering.description
  const hasNeeds = person.needs.length > 0 || !!person.needsNote
  const canEdit = me?.role === 'admin' || person.ownerId === me?.id || person.visibility === 'company'

  return (
    <div className={page}>
      <div className={pageHeader}>
        <div>
          <div className={muted}>{person.kana ?? 'ふりがな不明'}</div>
          <h1>{person.name}</h1>
          <div>{company ? <Link to={`/companies/${company.id}`}>{company.name}</Link> : <span className={unknown}>会社不明</span>}{person.title && ` / ${person.title}`}</div>
        </div>
        <div className={row}>
          {canEdit && <Link className={btnPrimary} to={`/people/${person.id}/edit`}>編集</Link>}
          {canEdit && <button className={btnDanger} onClick={() => setConfirm({ kind: 'delete' })}>削除</button>}
        </div>
      </div>

      {duplicates.length > 0 && (
        <div className={alertWarn}>
          <strong>重複しているかもしれない名刺</strong>
          {duplicates.map((d) => (
            <div key={d.person.id} className={row}>
              <Link to={`/people/${d.person.id}`}>{d.person.name}</Link>（{d.reason}）
              {canEdit && <button className={btn} onClick={() => setConfirm({ kind: 'merge', dropId: d.person.id })}>この名刺に統合する</button>}
            </div>
          ))}
        </div>
      )}

      <div className={grid2}>
        <section className={card}>
          <h2>連絡先</h2>
          <dl className={dl}>
            <dt>部署</dt><dd><V v={person.department} /></dd>
            <dt>役職</dt><dd><V v={person.title} /></dd>
            <dt>メール</dt><dd>{person.email ? <a href={`mailto:${person.email}`}>{person.email}</a> : <V v={null} />}</dd>
            <dt>電話</dt><dd><V v={person.phone} /></dd>
            <dt>住所</dt><dd><V v={person.address ?? company?.address} /></dd>
            <dt>会社HP</dt><dd>{person.url ? <a href={person.url} target="_blank" rel="noreferrer">{person.url}</a> : <V v={null} />}</dd>
          </dl>
        </section>
        <section className={card}>
          <h2>交換の記録</h2>
          <dl className={dl}>
            <dt>交換日</dt><dd><V v={person.exchangedOn} /></dd>
            <dt>場所・イベント</dt><dd><V v={person.exchangedAt} /></dd>
            <dt>紹介者</dt><dd><V v={person.referrer} /></dd>
            <dt>持ち主</dt><dd><V v={profilesById.get(person.ownerId)?.name} /></dd>
            <dt>見える範囲</dt><dd>{VISIBILITY_LABEL[person.visibility]}</dd>
            <dt>メモ</dt><dd style={{ whiteSpace: 'pre-wrap' }}><V v={person.memo} /></dd>
            <dt>更新</dt><dd className={muted}>{formatDateTime(person.updatedAt)}（{profilesById.get(person.updatedBy)?.name ?? '不明'}）</dd>
          </dl>
        </section>
      </div>

      {(person.cardFrontUrl || person.cardBackUrl) && (
        <section className={card}>
          <h2>名刺画像</h2>
          <div className={row} style={{ alignItems: 'flex-start' }}>
            {[person.cardFrontUrl, person.cardBackUrl].filter(Boolean).map((u, i) => <img key={i} src={u!} alt={i === 0 ? '表' : '裏'} className={css`max-width: min(360px, 100%); border: 1px solid var(--c-border); border-radius: var(--radius-sm);`} />)}
          </div>
        </section>
      )}

      <div className={grid2}>
        <section className={cx(card, !hasOffering && cardOff)} aria-disabled={!hasOffering}>
          <h2>事業内容・得意領域</h2>
          <div className={row}>
            {person.offering.tagIds.map((t) => <TagChip key={t} tag={tag(t)} />)}
            {person.offering.tagIds.length === 0 && <span className={muted}>未登録</span>}
          </div>
          {person.offering.description && <p style={{ whiteSpace: 'pre-wrap' }}>{person.offering.description}</p>}
          <hr className={divider} />
          <h3 className={subHead}>この人の得意領域を求めている人</h3>
          <MatchList results={seekers} direction="seeker" peopleById={peopleById} emptyText="候補はありません（事業内容・得意領域のタグを登録すると出ます）。" />
        </section>
        <section className={cx(card, !hasNeeds && cardOff)} aria-disabled={!hasNeeds}>
          <h2>課題・希望</h2>
          {person.needs.map((n) => (
            <div key={n.id} className={row} style={{ marginBottom: 4 }}>
              <TagChip tag={tag(n.tagId)} />
              <span className={muted}>{IMPORTANCE_LABEL[n.importance]}{n.dueDate && ` ・ 期限 ${n.dueDate}`}{n.note && ` ・ ${n.note}`}</span>
            </div>
          ))}
          {person.needs.length === 0 && <span className={muted}>未登録</span>}
          {person.needsNote && <p style={{ whiteSpace: 'pre-wrap' }}>{person.needsNote}</p>}
          <hr className={divider} />
          <h3 className={subHead}>この人の課題に合う人</h3>
          <MatchList results={providers} direction="provider" peopleById={peopleById} emptyText="候補はありません（課題・希望のタグを登録すると出ます）。" />
        </section>
      </div>
      <p className={muted}>マッチ率 {minScore} 以上を表示（設定で変えられます）。同じ会社の人・見送り済みの組み合わせは出ません。</p>

      <section className={card}>
        <h2>この人が関わる紹介</h2>
        {intros.length === 0 ? <p className={muted}>まだありません。</p> : intros.map((i) => (
          <div key={i.id} className={row} style={{ marginBottom: 6 }}>
            <StatusBadge status={i.status} />
            <Link to={`/introductions?edit=${i.id}`}>{i.providerName} → {i.seekerName}</Link>
            <span className={muted}>{formatDateTime(i.updatedAt)}</span>
          </div>
        ))}
      </section>

      {confirm?.kind === 'delete' && (
        <ConfirmModal
          title="名刺を削除"
          danger
          confirmLabel="削除する"
          message={<>「{person.name}」を削除します。一覧・マッチ候補から外れます。紹介の記録は名前を残したまま「削除済み」と表示されます。</>}
          onCancel={() => setConfirm(null)}
          onConfirm={async () => { setConfirm(null); await deletePerson(person.id); notify('削除しました'); navigate('/people') }}
        />
      )}
      {confirm?.kind === 'merge' && (
        <ConfirmModal
          title="重複の統合"
          confirmLabel="統合する"
          message={<>「{peopleById.get(confirm.dropId)?.name}」をこの名刺（{person.name}）に統合します。空欄の項目・タグ・メモ・紹介の記録をこちらに寄せ、統合元は削除済みになります。</>}
          onCancel={() => setConfirm(null)}
          onConfirm={async () => { const d = confirm.dropId; setConfirm(null); await mergePeople(person.id, d); notify('統合しました') }}
        />
      )}
    </div>
  )
}
