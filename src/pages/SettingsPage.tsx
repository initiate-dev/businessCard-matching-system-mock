import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { css, cx } from '@emotion/css'
import { useData } from '../context/DataContext'
import { DEFAULT_TEMPLATE, TEMPLATE_VARS, fillTemplate, newTemplate, originalOf } from '../lib/mailTemplate'
import { MAIL_RECIPIENT_LABEL, type EmailTemplate, type MailRecipient } from '../types'
import { ConfirmModal, Modal } from '../components/Modal'
import { PasswordForm } from './PasswordForm'
import { TagsPage } from './TagsPage'
import { btn, btnDanger, btnPrimary, card, chip, field, grid2, input, muted, page, pageHeader, pillTab, pillTabActive, pillTabs, row, tabActive, tabBar, tabBtn, textarea } from '../styles/ui'

const SAMPLE_VARS: Record<string, string> = {
  提供側氏名: '佐藤 花子', 提供側会社: 'テスト・デジタル合同会社', 提供側役職: '代表',
  求める側氏名: '山田 太郎', 求める側会社: 'サンプル精工株式会社', 求める側役職: '部長',
  一致した項目: '業務効率化、AI・機械学習', 差出人: '開発用 管理者',
}

type Tab = 'personal' | 'mail' | 'tags'

const TABS: { key: Tab; label: string }[] = [
  { key: 'personal', label: '個人設定' },
  { key: 'mail', label: 'メールテンプレート' },
  { key: 'tags', label: 'タグ辞書' },
]


export function SettingsPage() {
  const [params, setParams] = useSearchParams()
  const p = params.get('tab')
  const tab: Tab = p === 'tags' || p === 'mail' ? p : 'personal'
  return (
    <div className={page}>
      <div className={pageHeader}><h1>設定</h1></div>
      <div className={tabBar} role="tablist">
        {TABS.map((t) => (
          <button key={t.key} role="tab" aria-selected={tab === t.key} className={cx(tabBtn, tab === t.key && tabActive)} onClick={() => setParams(t.key === 'personal' ? {} : { tab: t.key })}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'tags' ? <TagsPage embedded /> : tab === 'mail' ? <MailTemplateSettings /> : <PersonalSettings />}
    </div>
  )
}

function PersonalSettings() {
  const { me, myPrefs, updateMyName, updatePreferences, resetDb, notify } = useData()
  const [name, setName] = useState(me?.name ?? '')
  const [minScore, setMinScore] = useState(myPrefs?.minMatchScore ?? 30)
  const [confirmReset, setConfirmReset] = useState(false)
  const [changingPw, setChangingPw] = useState(false)

  return (
    <div className={page}>
      <section className={card}>
        <h2>プロフィール</h2>
        <div className={css`display: flex; flex-direction: column; gap: 10px;`}>
          <label className={field}><span>名前（自分で変えられるのは名前だけです）</span><input className={input} value={name} onChange={(e) => setName(e.target.value)} /></label>
          <div className={muted}>メール: {me?.email} ／ 部署: {me?.department ?? '不明'} ／ 権限: {me?.role === 'admin' ? 'admin' : '一般'}</div>
          <div className={row}>
            <button className={btnPrimary} onClick={async () => { await updateMyName(name); notify('保存しました') }}>保存</button>
            <button className={btn} onClick={() => setChangingPw(true)}>パスワードを変更</button>
          </div>
        </div>
      </section>

      <section className={card}>
        <h2>マッチ候補の表示</h2>
        <div className={row}>
          <label className={row}>マッチ率
            <input className={input} style={{ width: 80 }} type="number" min={0} max={100} value={minScore} onChange={(e) => setMinScore(Number(e.target.value))} />
            以上を候補に出す
          </label>
          <button className={btn} onClick={async () => { await updatePreferences({ minMatchScore: Math.max(0, Math.min(100, minScore)) }); notify('保存しました') }}>保存</button>
        </div>
      </section>

      <section className={card}>
        <h2>モック用</h2>
        <p className={muted}>このモックはデータをブラウザ内（localStorage）に保存しています。初期データに戻すとログアウトします。</p>
        <button className={btnDanger} onClick={() => setConfirmReset(true)}>初期データに戻す</button>
      </section>

      {changingPw && (
        <Modal
          title="パスワードの変更"
          onClose={() => setChangingPw(false)}
          footer={<>
            <button className={btn} onClick={() => setChangingPw(false)}>キャンセル</button>
            <button className={btnPrimary} type="submit" form="change-password-form">変更する</button>
          </>}
        >
          <PasswordForm forced={false} formId="change-password-form" onDone={() => { setChangingPw(false); notify('パスワードを変更しました') }} />
        </Modal>
      )}

      {confirmReset && (
        <ConfirmModal title="初期データに戻す" danger confirmLabel="戻す" message="追加・変更したデータはすべて消えます。" onCancel={() => setConfirmReset(false)} onConfirm={() => { setConfirmReset(false); resetDb() }} />
      )}
    </div>
  )
}

/** 紹介メールのテンプレート（利用者ごとに複数。先頭が既定） */
function MailTemplateSettings() {
  const { myPrefs, updatePreferences, notify } = useData()
  const templates = myPrefs?.emailTemplates ?? [DEFAULT_TEMPLATE]
  const [selectedId, setSelectedId] = useState<string>(templates[0].id)
  const [deleting, setDeleting] = useState(false)
  const selected = templates.find((t) => t.id === selectedId) ?? templates[0]

  const add = async () => {
    const t = newTemplate(`新しいテンプレート ${templates.length + 1}`)
    await updatePreferences({ emailTemplates: [...templates, t] })
    setSelectedId(t.id)
    notify('テンプレートを追加しました')
  }

  return (
    <div className={page}>
      <div className={row} style={{ flexWrap: 'nowrap' }}>
        <div className={pillTabs} role="tablist" aria-label="テンプレート">
          {templates.map((t) => (
            <button key={t.id} role="tab" aria-selected={selected.id === t.id} className={cx(pillTab, selected.id === t.id && pillTabActive)} onClick={() => setSelectedId(t.id)}>
              {t.title || '（タイトルなし）'}
            </button>
          ))}
        </div>
        <button className={btn} style={{ marginLeft: 'auto', flexShrink: 0 }} onClick={add}>＋ テンプレートを追加</button>
      </div>

      {/* key で選んだテンプレートが変わったら入力欄を作り直す（未保存の変更は捨てる） */}
      <TemplateEditor
        key={selected.id}
        template={selected}
        isDefault={templates[0].id === selected.id}
        canDelete={templates.length > 1}
        onSave={async (t) => {
          await updatePreferences({ emailTemplates: templates.map((x) => (x.id === t.id ? t : x)) })
          notify('テンプレートを保存しました')
        }}
        onMakeDefault={async () => {
          await updatePreferences({ emailTemplates: [selected, ...templates.filter((x) => x.id !== selected.id)] })
          notify(`「${selected.title}」を既定にしました`)
        }}
        onDelete={() => setDeleting(true)}
      />

      {deleting && (
        <ConfirmModal
          title="テンプレートを削除"
          danger
          confirmLabel="削除する"
          message={<>「{selected.title}」を削除します。</>}
          onCancel={() => setDeleting(false)}
          onConfirm={async () => {
            setDeleting(false)
            const rest = templates.filter((x) => x.id !== selected.id)
            await updatePreferences({ emailTemplates: rest })
            setSelectedId(rest[0].id)
            notify('削除しました')
          }}
        />
      )}
    </div>
  )
}

function TemplateEditor({ template, isDefault, canDelete, onSave, onMakeDefault, onDelete }: {
  template: EmailTemplate
  isDefault: boolean
  canDelete: boolean
  onSave: (t: EmailTemplate) => Promise<void>
  onMakeDefault: () => Promise<void>
  onDelete: () => void
}) {
  const [title, setTitle] = useState(template.title)
  const [recipient, setRecipient] = useState<MailRecipient>(template.recipient)
  const [subject, setSubject] = useState(template.subject)
  const [body, setBody] = useState(template.body)
  const dirty = title !== template.title || recipient !== template.recipient || subject !== template.subject || body !== template.body

  return (
    <section className={card}>
      <div className={css`display: flex; flex-direction: column; gap: 10px;`}>
        <label className={field}>
          <span>タイトル{isDefault && '（既定。紹介メールの下書きで最初に選ばれます）'}</span>
          <input className={input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例: 紹介メール（丁寧）" />
        </label>
        <div>
          <span className={muted}>{'{{項目名}}'} の形で差し込めます。</span>
          <div className={row} style={{ marginTop: 6 }}>
            {TEMPLATE_VARS.map((v) => <span key={v.key} className={chip} title={v.label}>{`{{${v.key}}}`}</span>)}
          </div>
        </div>
        <div className={grid2}>
          <div className={css`display: flex; flex-direction: column; gap: 10px;`}>
            <label className={field}>
              <span>宛先</span>
              <select className={input} style={{ width: 'auto' }} value={recipient} onChange={(e) => setRecipient(e.target.value as MailRecipient)}>
                {(Object.keys(MAIL_RECIPIENT_LABEL) as MailRecipient[]).map((r) => <option key={r} value={r}>{MAIL_RECIPIENT_LABEL[r]}</option>)}
              </select>
            </label>
            <label className={field}><span>件名</span><input className={input} value={subject} onChange={(e) => setSubject(e.target.value)} /></label>
            <label className={field}><span>本文</span><textarea className={textarea} style={{ minHeight: 280 }} value={body} onChange={(e) => setBody(e.target.value)} /></label>
          </div>
          <div className={css`display: flex; flex-direction: column; gap: 6px;`}>
            <span className={muted}>プレビュー（サンプル値）</span>
            <strong>{fillTemplate(subject, SAMPLE_VARS)}</strong>
            <pre className={css`white-space: pre-wrap; margin: 0; padding: 12px; background: var(--c-surface-2); border-radius: var(--radius-sm); font-family: inherit;`}>{fillTemplate(body, SAMPLE_VARS)}</pre>
          </div>
        </div>
        <div className={row}>
          <button className={btnPrimary} disabled={!dirty || !title.trim()} onClick={() => onSave({ ...template, title: title.trim(), recipient, subject, body })}>保存</button>
          <button className={btn} onClick={() => { const o = originalOf(template.id); setRecipient(o.recipient); setSubject(o.subject); setBody(o.body) }}>元の文面に戻す</button>
          {!isDefault && <button className={btn} onClick={onMakeDefault}>既定にする</button>}
          {canDelete && <button className={btnDanger} style={{ marginLeft: 'auto' }} onClick={onDelete}>削除</button>}
          {dirty && <span className={muted}>未保存の変更があります（ほかのテンプレートに切り替えると消えます）</span>}
        </div>
      </div>
    </section>
  )
}
