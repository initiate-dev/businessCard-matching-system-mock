import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { css, cx } from '@emotion/css'
import { useData } from '../context/DataContext'
import { CONSENT_LABEL, INTRO_STATUSES, INTRO_STATUS_LABEL, type Consent, type ID, type Introduction, type IntroStatus, type Person } from '../types'
import { buildMatchContext, compareNeeds, summarize } from '../lib/match'
import { formatDateTime } from '../lib/util'
import { NeedComparison } from './NeedComparison'
import { MailCopyBox } from './MailCopyBox'
import { Modal } from './Modal'
import { btn, btnPrimary, chip, dl, field, input, muted, pillTab, pillTabActive, pillTabs, tabActive, tabBar, tabBtn, textarea } from '../styles/ui'

type Props =
  /** 「紹介候補にする」: まだ登録していない組み合わせ */
  | { mode: 'create'; providerId: ID; seekerId: ID; onClose: () => void }
  /** 紹介管理の「編集」: 登録済みの紹介 */
  | { mode: 'edit'; intro: Introduction; onClose: () => void }

type View = 'detail' | 'mail' | 'history'

/**
 * 紹介のモーダル。新規（紹介候補にする）と編集（紹介管理）で同じ見た目にする。
 * 新規は「紹介候補に登録」を押したときだけ紹介管理に追加し、編集は「変更を保存」で反映する。
 */
export function IntroPreviewModal(props: Props) {
  const { onClose } = props
  const intro = props.mode === 'edit' ? props.intro : null
  const providerId = intro ? intro.providerId : (props as Extract<Props, { mode: 'create' }>).providerId
  const seekerId = intro ? intro.seekerId : (props as Extract<Props, { mode: 'create' }>).seekerId

  const { db, me, profilesById, createIntroduction, changeIntroStatus, updateIntroduction, notify } = useData()
  const [seekerConsent, setSeekerConsent] = useState<Consent>(intro?.seekerConsent ?? 'unknown')
  const [providerConsent, setProviderConsent] = useState<Consent>(intro?.providerConsent ?? 'unknown')
  const [memo, setMemo] = useState(intro?.memo ?? '')
  const [status, setStatus] = useState<IntroStatus>(intro?.status ?? 'candidate')
  const [assigneeId, setAssigneeId] = useState<ID | null>(intro ? intro.assigneeId : (me?.id ?? null))
  const [view, setView] = useState<View>('detail')
  const [error, setError] = useState<string | null>(null)

  const ctx = useMemo(() => buildMatchContext(db.tags, db.companies, []), [db.tags, db.companies])
  const provider = db.people.find((p) => p.id === providerId && !p.deletedAt)
  const seeker = db.people.find((p) => p.id === seekerId && !p.deletedAt)
  const breakdown = provider && seeker ? compareNeeds(seeker, provider, ctx) : null
  const companyName = (p?: Person) => db.companies.find((c) => c.id === p?.companyId)?.name ?? '不明'

  const head = (label: string, name: string, p: Person | undefined, consent: Consent, setConsent: (c: Consent) => void) => (
    <>
      <h2>{label}</h2>
      <dl className={dl}>
        <dt>氏名</dt><dd>{p ? <Link to={`/people/${p.id}`} onClick={onClose}>{p.name}</Link> : <>{name} <span className={chip}>削除済み</span></>}</dd>
        <dt>会社</dt><dd>{companyName(p)}</dd>
        <dt>メール</dt><dd>{p?.email ?? '不明'}</dd>
        <dt>本人の同意</dt>
        <dd>
          <select className={input} style={{ width: 'auto' }} value={consent} onChange={(e) => setConsent(e.target.value as Consent)}>
            {(Object.keys(CONSENT_LABEL) as Consent[]).map((c) => <option key={c} value={c}>{CONSENT_LABEL[c]}</option>)}
          </select>
        </dd>
      </dl>
    </>
  )

  const register = async () => {
    const score = breakdown ? summarize(breakdown).score : null
    const res = await createIntroduction(providerId, seekerId, score, { status, providerConsent, seekerConsent, memo: memo.trim() || null })
    if (typeof res === 'string') { setError(res); return }
    if (assigneeId !== res.assigneeId) await updateIntroduction(res.id, { assigneeId })
    notify('紹介管理に追加しました')
    onClose()
  }

  const save = async () => {
    if (!intro) return
    if (status !== intro.status) await changeIntroStatus(intro.id, status, null)
    await updateIntroduction(intro.id, { seekerConsent, providerConsent, memo: memo.trim() || null, assigneeId })
    notify('保存しました')
    onClose()
  }

  const dirty = !intro || status !== intro.status || seekerConsent !== intro.seekerConsent || providerConsent !== intro.providerConsent
    || (memo.trim() || null) !== intro.memo || assigneeId !== intro.assigneeId

  const views: [View, string][] = intro ? [['detail', '紹介内容'], ['mail', 'メール文面'], ['history', '履歴']] : [['detail', '紹介内容'], ['mail', 'メール文面']]

  return (
    <Modal
      title={intro ? `紹介を編集（${intro.seekerName} ← ${intro.providerName}）` : '紹介候補にする'}
      wide
      onClose={onClose}
      footer={<>
        <button className={btn} onClick={onClose}>キャンセル</button>
        {intro
          ? <button className={btnPrimary} disabled={!dirty} onClick={save}>変更を保存</button>
          : <button className={btnPrimary} disabled={!provider || !seeker} onClick={register}>紹介候補に登録</button>}
      </>}
    >
      {/* 表示の切り替え */}
      <div className={tabBar} role="tablist" aria-label="表示">
        {views.map(([k, label]) => (
          <button key={k} type="button" role="tab" aria-selected={view === k} className={cx(tabBtn, view === k && tabActive)} onClick={() => setView(k)}>
            {label}
          </button>
        ))}
      </div>

      {/* ステータス（どの表示でも選べる） */}
      <div className={pillTabs} role="tablist" aria-label="ステータス">
        {INTRO_STATUSES.map((s) => (
          <button key={s} type="button" role="tab" aria-selected={status === s} className={cx(pillTab, status === s && pillTabActive)} onClick={() => setStatus(s)}>
            {INTRO_STATUS_LABEL[s]}
          </button>
        ))}
      </div>
      {error && <div style={{ color: 'var(--c-danger)' }}>{error}</div>}

      {view === 'detail' && (
        <>
          <NeedComparison
            seekerHead={head('求める側', intro?.seekerName ?? '', seeker, seekerConsent, setSeekerConsent)}
            providerHead={head('提供側', intro?.providerName ?? '', provider, providerConsent, setProviderConsent)}
            seeker={seeker}
            provider={provider}
            breakdown={breakdown}
            tagsById={ctx.tagsById}
            scoreAtCreation={intro?.scoreAtCreation ?? null}
            hideCreationScore={!intro}
          />
          <label className={field}>
            <span>担当者</span>
            <select className={input} style={{ width: 'auto' }} value={assigneeId ?? ''} onChange={(e) => setAssigneeId(e.target.value || null)}>
              <option value="">未設定</option>
              {db.profiles.filter((p) => p.active || p.id === assigneeId).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <label className={field}><span>メモ（任意）</span><textarea className={textarea} value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="紹介しようと思った理由など" /></label>
        </>
      )}

      {view === 'mail' && <MailCopyBox seeker={seeker} provider={provider} breakdown={breakdown} />}

      {view === 'history' && intro && (
        <ol className={css`margin: 0; padding-left: 1.2em; display: flex; flex-direction: column; gap: 6px;`}>
          {[...intro.history].reverse().map((h) => (
            <li key={h.id}>
              {h.from ? `${INTRO_STATUS_LABEL[h.from]} → ` : ''}<strong>{INTRO_STATUS_LABEL[h.to]}</strong>
              <span className={muted}> {formatDateTime(h.changedAt)} ・ {profilesById.get(h.changedBy)?.name ?? '不明'}</span>
              {h.note && <div className={muted}>{h.note}</div>}
            </li>
          ))}
        </ol>
      )}

      <p className={muted} style={{ margin: 0 }}>
        {intro
          ? (status !== intro.status ? `「変更を保存」を押すと、ステータスが「${INTRO_STATUS_LABEL[intro.status]}」から「${INTRO_STATUS_LABEL[status]}」に変わり、履歴に残ります。` : '')
          : `「紹介候補に登録」を押すと、紹介管理に「${INTRO_STATUS_LABEL[status]}」として追加されます。`}
        {status === 'declined' && (!intro || intro.status !== 'declined') && '見送りにした組み合わせはマッチ候補に出なくなります。'}
      </p>
    </Modal>
  )
}
