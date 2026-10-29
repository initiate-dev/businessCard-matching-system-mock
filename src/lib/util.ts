import type { Company, Person, Profile } from '../types'
import { normalizeEmail, normalizeText } from './normalize'

export function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`
}

export function nowIso(): string {
  return new Date().toISOString()
}

/** 分からない値は「不明」と出す */
export function orUnknown(v: string | null | undefined): string {
  return v === null || v === undefined || v === '' ? '不明' : v
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

/** 初期パスワードを作る */
export function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  const arr = new Uint32Array(12)
  crypto.getRandomValues(arr)
  return [...arr].map((n) => chars[n % chars.length]).join('')
}

/** 名刺が見えるか（本番は RLS で同じ条件を書く） */
export function canSee(p: Person, me: Profile, profilesById: Map<string, Profile>): boolean {
  if (me.role === 'admin') return true
  if (p.visibility === 'company') return true
  if (p.ownerId === me.id) return true
  if (p.visibility === 'department') {
    const owner = profilesById.get(p.ownerId)
    return !!owner?.department && owner.department === me.department
  }
  return false
}

export interface DuplicateHit {
  person: Person
  reason: string
}

/** 同じメール・同じ氏名＋会社の名刺を探す */
export function findDuplicates(
  input: { id?: string; name: string; email: string | null; companyId: string | null },
  people: Person[],
  companies: Company[],
): DuplicateHit[] {
  const email = normalizeEmail(input.email)
  const name = normalizeText(input.name)
  const companyName = (id: string | null) => (id ? normalizeText(companies.find((c) => c.id === id)?.name ?? '') : '')
  const myCompany = companyName(input.companyId)
  const out: DuplicateHit[] = []
  for (const p of people) {
    if (p.deletedAt || p.id === input.id) continue
    if (email && normalizeEmail(p.email) === email) out.push({ person: p, reason: '同じメールアドレス' })
    else if (name && normalizeText(p.name) === name && myCompany && companyName(p.companyId) === myCompany) out.push({ person: p, reason: '同じ氏名＋会社' })
  }
  return out
}
