import { useState } from 'react'
import { css } from '@emotion/css'
import { useData } from '../context/DataContext'
import { MAIL_RECIPIENT_LABEL, type Person } from '../types'
import type { BreakdownItem } from '../lib/match'
import { buildIntroMail, buildMailto } from '../lib/mailTemplate'
import { btn, btnSmall, field, input, muted, row, textarea } from '../styles/ui'

/**
 * メールテンプレートを選んで、差し込み済みの件名・本文をコピーする欄。
 * アプリからは送らない（コピーするか、メールソフトで開く）。
 */
export function MailCopyBox({ seeker, provider, breakdown }: { seeker: Person | undefined; provider: Person | undefined; breakdown: BreakdownItem[] | null }) {
  const { db, me, myPrefs, notify } = useData()
  const templates = myPrefs?.emailTemplates ?? []
  const [templateId, setTemplateId] = useState<string | null>(null)
  const tpl = templates.find((t) => t.id === templateId) ?? templates[0]
  if (!tpl) return null

  const info = (p: Person | undefined) => p ? { name: p.name, email: p.email, title: p.title, companyName: db.companies.find((c) => c.id === p.companyId)?.name ?? '', needsNote: p.needsNote } : null
  const mail = buildIntroMail(tpl, { seeker: info(seeker), provider: info(provider), breakdown, senderName: me?.name ?? '' })

  const copy = async (text: string, label: string) => {
    try { await navigator.clipboard.writeText(text); notify(`${label}をコピーしました`) } catch { notify('コピーできませんでした。手で選んでコピーしてください') }
  }

  return (
    <div className={css`display: flex; flex-direction: column; gap: 8px; border: 1px solid var(--c-border); border-radius: var(--radius); padding: 12px 14px;`}>
      <div className={row} style={{ justifyContent: 'space-between' }}>
        <strong>メールの文面をコピー</strong>
        <div className={row}>
          <select className={input} style={{ width: 'auto' }} value={tpl.id} onChange={(e) => setTemplateId(e.target.value)} aria-label="テンプレート">
            {templates.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
          <button type="button" className={`${btn} ${btnSmall}`} onClick={() => copy(`件名: ${mail.subject}\n\n${mail.body}`, '件名と本文')}>件名と本文をコピー</button>
          <a className={`${btn} ${btnSmall}`} href={buildMailto(mail.to, mail.subject, mail.body)}>メールソフトで開く</a>
        </div>
      </div>
      <span className={muted}>宛先（{MAIL_RECIPIENT_LABEL[tpl.recipient]}）: {mail.to.join(', ') || 'メールアドレス不明'}</span>
      <label className={field}><span>件名</span><input className={input} readOnly value={mail.subject} onFocus={(e) => e.target.select()} /></label>
      <label className={field}><span>本文</span><textarea className={textarea} style={{ minHeight: 160 }} readOnly value={mail.body} /></label>
    </div>
  )
}
