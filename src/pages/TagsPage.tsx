import { useMemo, useState } from 'react'
import { cx } from '@emotion/css'
import { useData } from '../context/DataContext'
import { TAG_CATEGORY_LABEL, type Tag, type TagCategory } from '../types'
import { normalizeText, tagKeys } from '../lib/normalize'
import { ConfirmModal, Modal } from '../components/Modal'
import { alertError, btn, btnPrimary, btnSmall, card, field, input, muted, page, pageHeader, pillTab, pillTabActive, pillTabs, row, table, tableWrap } from '../styles/ui'

const CATS = Object.keys(TAG_CATEGORY_LABEL) as TagCategory[]


export function TagsPage({ embedded = false }: { embedded?: boolean }) {
  const { db, addTag, updateTag, mergeTag, deleteTag, tagUsage, notify } = useData()
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<TagCategory>('industry')
  const [editing, setEditing] = useState<Tag | null>(null)
  const [aliasText, setAliasText] = useState('')
  const [editError, setEditError] = useState<string | null>(null)
  const [merging, setMerging] = useState<{ sourceId: string; targetId: string } | null>(null)
  const [deleting, setDeleting] = useState<Tag | null>(null)
  const [newName, setNewName] = useState('')
  const [newCat, setNewCat] = useState<TagCategory>('industry')
  const [newAliases, setNewAliases] = useState('')

  const list = useMemo(() => {
    const key = normalizeText(q)
    return db.tags
      .filter((t) => t.category === cat)
      .filter((t) => !key || tagKeys(t).some((k) => k.includes(key)))
      .sort((a, b) => a.name.localeCompare(b.name, 'ja'))
  }, [db.tags, q, cat])

  const sortedTags = [...db.tags].sort((a, b) => a.name.localeCompare(b.name, 'ja'))

  const splitAliases = (s: string) => [...new Set(s.split(/[,、\n]/).map((x) => x.trim()).filter(Boolean))]

  return (
    <div className={page}>
      {!embedded && <div className={pageHeader}><h1>タグ辞書</h1></div>}
      <p className={muted}>正規名と別名（表記ゆれ）を登録すると、マッチングで同じものとして扱います。比較は大文字小文字・空白・記号・全角半角をそろえて行います。</p>

      <section className={card}>
        <h2>タグを追加</h2>
        <form className={row} onSubmit={async (e) => {
          e.preventDefault()
          const r = await addTag({ name: newName, category: newCat, aliases: splitAliases(newAliases) })
          if (typeof r === 'string') notify(r)
          else { notify(`「${r.name}」を追加しました`); setNewName(''); setNewAliases('') }
        }}>
          <select className={input} style={{ width: 'auto' }} value={newCat} onChange={(e) => setNewCat(e.target.value as TagCategory)}>
            {CATS.map((c) => <option key={c} value={c}>{TAG_CATEGORY_LABEL[c]}</option>)}
          </select>
          <input className={input} style={{ flex: '1 1 160px' }} placeholder="正規名" value={newName} onChange={(e) => setNewName(e.target.value)} required />
          <input className={input} style={{ flex: '2 1 220px' }} placeholder="別名（読点・カンマ区切り）" value={newAliases} onChange={(e) => setNewAliases(e.target.value)} />
          <button className={btnPrimary} type="submit">追加</button>
        </form>
      </section>

      <div className={cx(card, row)}>
        <input className={input} style={{ flex: '1 1 200px' }} placeholder={`${TAG_CATEGORY_LABEL[cat]}のタグを正規名・別名で検索`} value={q} onChange={(e) => setQ(e.target.value)} />
        <span className={muted}>{list.length} 件</span>
      </div>

      <div className={row} style={{ flexWrap: 'nowrap', alignItems: 'center' }}>
        <div className={pillTabs} role="tablist" aria-label="分類">
          {CATS.map((c) => (
            <button key={c} role="tab" aria-selected={cat === c} className={cx(pillTab, cat === c && pillTabActive)} onClick={() => { setCat(c); setNewCat(c) }}>
              {TAG_CATEGORY_LABEL[c]}<span>{db.tags.filter((t) => t.category === c).length}</span>
            </button>
          ))}
        </div>
        <button className={btn} style={{ marginLeft: 'auto', flexShrink: 0 }} onClick={() => setMerging({ sourceId: '', targetId: '' })}>タグを統合</button>
      </div>

      <div className={tableWrap}>
        <table className={table}>
          <thead><tr><th>正規名</th><th>別名</th><th>使用数</th><th /></tr></thead>
          <tbody>
            {list.length === 0 && <tr><td colSpan={4} className={muted}>この分類のタグはありません。</td></tr>}
            {list.map((t) => (
              <tr key={t.id}>
                <td><strong>{t.name}</strong></td>
                <td className={muted}>{t.aliases.join('、') || '—'}</td>
                <td>{tagUsage(t.id)}</td>
                <td>
                  <div className={row} style={{ flexWrap: 'nowrap' }}>
                    <button className={cx(btn, btnSmall)} onClick={() => { setEditing({ ...t }); setAliasText(t.aliases.join('、')); setEditError(null) }}>編集</button>
                    <button className={cx(btn, btnSmall)} onClick={() => setDeleting(t)}>削除</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <Modal
          title="タグを編集"
          onClose={() => setEditing(null)}
          footer={<>
            <button className={btn} onClick={() => setEditing(null)}>キャンセル</button>
            <button className={btnPrimary} onClick={async () => {
              const err = await updateTag({ ...editing, name: editing.name.trim(), aliases: splitAliases(aliasText) })
              if (err) setEditError(err)
              else { setEditing(null); notify('保存しました') }
            }}>保存</button>
          </>}
        >
          {editError && <div className={alertError}>{editError}</div>}
          <label className={field}><span>正規名</span><input className={input} value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></label>
          <label className={field}>
            <span>分類</span>
            <select className={input} value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value as TagCategory })}>
              {CATS.map((c) => <option key={c} value={c}>{TAG_CATEGORY_LABEL[c]}</option>)}
            </select>
          </label>
          <label className={field}><span>別名（読点・カンマ・改行区切り）</span><textarea className={input} style={{ minHeight: 80 }} value={aliasText} onChange={(e) => setAliasText(e.target.value)} /></label>
        </Modal>
      )}

      {merging && (
        <Modal
          title="タグを統合"
          onClose={() => setMerging(null)}
          footer={<>
            <button className={btn} onClick={() => setMerging(null)}>キャンセル</button>
            <button className={btnPrimary} disabled={!merging.sourceId || !merging.targetId || merging.sourceId === merging.targetId} onClick={async () => {
              const target = db.tags.find((t) => t.id === merging.targetId)!
              await mergeTag(merging.sourceId, merging.targetId)
              setMerging(null)
              notify(`「${target.name}」に統合しました`)
            }}>統合する</button>
          </>}
        >
          <p>統合元のタグとその別名は統合先の別名になり、名刺・会社に付いた統合元のタグは統合先に置き換わります。統合元は辞書から消えます。</p>
          <label className={field}>
            <span>統合元（消えるタグ）</span>
            <select className={input} value={merging.sourceId} onChange={(e) => setMerging({ ...merging, sourceId: e.target.value })}>
              <option value="">選んでください</option>
              {sortedTags.filter((t) => t.id !== merging.targetId).map((t) => <option key={t.id} value={t.id}>{t.name}（{TAG_CATEGORY_LABEL[t.category]}・{tagUsage(t.id)} か所）</option>)}
            </select>
          </label>
          <label className={field}>
            <span>統合先（残すタグ）</span>
            <select className={input} value={merging.targetId} onChange={(e) => setMerging({ ...merging, targetId: e.target.value })}>
              <option value="">選んでください</option>
              {sortedTags.filter((t) => t.id !== merging.sourceId).map((t) => <option key={t.id} value={t.id}>{t.name}（{TAG_CATEGORY_LABEL[t.category]}・{tagUsage(t.id)} か所）</option>)}
            </select>
          </label>
        </Modal>
      )}

      {deleting && (
        <ConfirmModal
          title="タグを削除"
          danger
          confirmLabel="削除する"
          message={tagUsage(deleting.id) > 0
            ? <>「{deleting.name}」は {tagUsage(deleting.id)} か所で使われているため削除できません。一覧上の「タグを統合」を使ってください。</>
            : <>「{deleting.name}」を削除します。</>}
          onCancel={() => setDeleting(null)}
          onConfirm={async () => {
            const err = await deleteTag(deleting.id)
            setDeleting(null)
            notify(err ?? '削除しました')
          }}
        />
      )}
    </div>
  )
}
