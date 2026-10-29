import { css } from '@emotion/css'
import type { Importance, Need, Offering } from '../types'
import { IMPORTANCE_LABEL } from '../types'
import { useData } from '../context/DataContext'
import { newId } from '../lib/util'
import { TagChip } from './Badges'
import { TagPicker } from './TagPicker'
import { btn, btnSmall, field, input, muted, row, tableWrap, table, textarea } from '../styles/ui'

const IMPORTANCES: Importance[] = ['required', 'preferred', 'any']

export function OfferingEditor({ value, onChange }: { value: Offering; onChange: (v: Offering) => void }) {
  const { db } = useData()
  const tagsById = new Map(db.tags.map((t) => [t.id, t]))
  return (
    <div className={css`display: flex; flex-direction: column; gap: 10px;`}>
      <div className={row}>
        {value.tagIds.length === 0 && <span className={muted}>タグはまだありません</span>}
        {value.tagIds.map((id) => (
          <TagChip key={id} tag={tagsById.get(id)} onRemove={() => onChange({ ...value, tagIds: value.tagIds.filter((x) => x !== id) })} />
        ))}
      </div>
      <TagPicker exclude={value.tagIds} onPick={(id) => onChange({ ...value, tagIds: [...value.tagIds, id] })} />
      <label className={field}>
        <span>自由記述（タグ名・別名が出てくると「部分一致」として扱います）</span>
        <textarea className={textarea} value={value.description ?? ''} onChange={(e) => onChange({ ...value, description: e.target.value || null })} />
      </label>
    </div>
  )
}

export function NeedsEditor({ value, onChange }: { value: Need[]; onChange: (v: Need[]) => void }) {
  const { db } = useData()
  const tagsById = new Map(db.tags.map((t) => [t.id, t]))
  const update = (id: string, patch: Partial<Need>) => onChange(value.map((n) => (n.id === id ? { ...n, ...patch } : n)))
  return (
    <div className={css`display: flex; flex-direction: column; gap: 10px;`}>
      {value.length > 0 && (
        <div className={tableWrap}>
          <table className={table}>
            <thead><tr><th>タグ</th><th>重要度</th><th>期限</th><th>メモ</th><th /></tr></thead>
            <tbody>
              {value.map((n) => (
                <tr key={n.id}>
                  <td><TagChip tag={tagsById.get(n.tagId)} /></td>
                  <td>
                    <select className={input} value={n.importance} onChange={(e) => update(n.id, { importance: e.target.value as Importance })}>
                      {IMPORTANCES.map((i) => <option key={i} value={i}>{IMPORTANCE_LABEL[i]}</option>)}
                    </select>
                  </td>
                  <td><input type="date" className={input} value={n.dueDate ?? ''} onChange={(e) => update(n.id, { dueDate: e.target.value || null })} /></td>
                  <td><input className={input} value={n.note ?? ''} onChange={(e) => update(n.id, { note: e.target.value || null })} /></td>
                  <td><button type="button" className={`${btn} ${btnSmall}`} onClick={() => onChange(value.filter((x) => x.id !== n.id))}>外す</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <span className={muted}>業種・地域のタグを入れると、相手の会社の業種・地域でも判定します（例: 地域「東京」＝東京の会社だと加点）。</span>
      <TagPicker
        exclude={value.map((n) => n.tagId)}
        placeholder="課題・希望のタグを追加"
        onPick={(tagId) => onChange([...value, { id: newId('n'), tagId, importance: 'preferred', dueDate: null, note: null }])}
      />
    </div>
  )
}

