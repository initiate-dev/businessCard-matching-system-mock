// マッチ率の計算。AI は使わず、決まったルールだけで計算する（同じ入力なら常に同じ結果）。
//
// ルール
// - 求める側の「課題・希望」タグごとに、提供側の「事業内容・得意領域」を見る
//   - 同じタグがある → 一致（1 点）
//   - タグ名・別名がもう一方を含む、または提供側の自由記述にタグ名・別名が出てくる → 部分一致（0.5 点）
//   - それ以外 → 不一致（0 点）
// - 業種・地域の分類のタグは、提供側の会社の業種・地域でも判定する
//   （一致すれば一致。相手の会社の値が未登録なら「不明」（0.5 点））
// - 重みは 必須 3 / 希望 2 / どちらでも 1。マッチ率 = 得点の重み付き平均 × 100
// - 必須の項目が 1 つでも不一致なら 0.6 倍にする
// - 地域以外のタグが 1 つも一致・部分一致しない組み合わせは候補に出さない（地域が同じだけでは紹介しない）
// - 除外: 本人どうし・同じ会社どうし・見送り済みの組み合わせ・削除済みの人

import type { Company, ID, Importance, Introduction, Need, Person, Tag, TagCategory } from '../types'
import { IMPORTANCE_LABEL } from '../types'
import { normalizeText, tagKeys } from './normalize'

export const IMPORTANCE_WEIGHT: Record<Importance, number> = { required: 3, preferred: 2, any: 1 }
export const REQUIRED_MISS_FACTOR = 0.6

export type MatchResultKind = 'match' | 'partial' | 'miss' | 'unknown'

export const MATCH_RESULT_LABEL: Record<MatchResultKind, string> = {
  match: '一致',
  partial: '部分一致',
  miss: '不一致',
  unknown: '不明',
}

const CREDIT: Record<MatchResultKind, number> = { match: 1, partial: 0.5, unknown: 0.5, miss: 0 }

export interface BreakdownItem {
  kind: 'tag'
  /** どの課題・希望の判定か */
  needId: ID
  /** 一致・部分一致の根拠になった提供側のタグ */
  matchedTagIds: ID[]
  /** 画面に出す文言（例: 課題「業務効率化」、地域「東京」） */
  label: string
  /** タグ名そのもの */
  tagName: string
  category: TagCategory
  importance: Importance
  result: MatchResultKind
  /** 一致の根拠（どのタグ・記述で一致したか） */
  reason: string | null
}

export interface MatchResult {
  providerId: ID
  seekerId: ID
  score: number
  breakdown: BreakdownItem[]
  matchCount: number
  partialCount: number
  missCount: number
  requiredTotal: number
  requiredMet: number
}

export interface MatchContext {
  tagsById: Map<ID, Tag>
  companiesById: Map<ID, Company>
  /** `${providerId}:${seekerId}` 見送り済み */
  declinedPairs: Set<string>
}

export function buildMatchContext(tags: Tag[], companies: Company[], intros: Introduction[]): MatchContext {
  return {
    tagsById: new Map(tags.map((t) => [t.id, t])),
    companiesById: new Map(companies.map((c) => [c.id, c])),
    declinedPairs: new Set(intros.filter((i) => i.status === 'declined').map((i) => `${i.providerId}:${i.seekerId}`)),
  }
}

/** 提供できること（タグと自由記述） */
export function effectiveOffering(p: Person): { tagIds: Set<ID>; description: string } {
  return { tagIds: new Set(p.offering.tagIds), description: p.offering.description ?? '' }
}

/** 求めていること。並び順を一定にする（重要度の高い順） */
export function effectiveNeeds(p: Person): Need[] {
  return [...p.needs].sort((a, b) => IMPORTANCE_WEIGHT[b.importance] - IMPORTANCE_WEIGHT[a.importance] || a.tagId.localeCompare(b.tagId))
}

type Judged = { result: MatchResultKind; reason: string | null; matchedTagIds: ID[] }

function judgeTag(needTag: Tag, offering: { tagIds: Set<ID>; description: string }, ctx: MatchContext): Judged {
  if (offering.tagIds.has(needTag.id)) return { result: 'match', reason: `タグ「${needTag.name}」`, matchedTagIds: [needTag.id] }
  const needKeys = tagKeys(needTag).filter((k) => k.length >= 2)
  // タグ名どうしの部分一致（例: 「デザイン」と「Webデザイン」）
  for (const id of [...offering.tagIds].sort()) {
    const t = ctx.tagsById.get(id)
    if (!t) continue
    const keys = tagKeys(t).filter((k) => k.length >= 2)
    if (needKeys.some((nk) => keys.some((k) => k.includes(nk) || nk.includes(k)))) {
      return { result: 'partial', reason: `タグ「${t.name}」`, matchedTagIds: [t.id] }
    }
  }
  // 自由記述にタグ名・別名が出てくる
  const desc = normalizeText(offering.description)
  const hitWord = [needTag.name, ...needTag.aliases].find((w) => { const k = normalizeText(w); return k.length >= 2 && desc.includes(k) })
  if (hitWord) return { result: 'partial', reason: `事業内容の記述に「${hitWord}」`, matchedTagIds: [] }
  return { result: 'miss', reason: null, matchedTagIds: [] }
}

const NEED_LABEL_PREFIX: Record<TagCategory, string> = { industry: '業種', region: '地域', domain: '課題', tech: '課題', other: '課題' }

/** 課題・希望のタグ 1 つを判定する。業種・地域のタグは相手の会社の値も見る */
function judgeNeed(n: Need, tag: Tag, provider: Person, offering: { tagIds: Set<ID>; description: string }, ctx: MatchContext): BreakdownItem {
  const base = { kind: 'tag' as const, needId: n.id, label: `${NEED_LABEL_PREFIX[tag.category]}「${tag.name}」`, tagName: tag.name, category: tag.category, importance: n.importance }
  if (tag.category === 'industry' || tag.category === 'region') {
    const company = provider.companyId ? ctx.companiesById.get(provider.companyId) : undefined
    const companyValue = tag.category === 'industry' ? company?.industryTagId : company?.regionTagId
    const what = tag.category === 'industry' ? '業種' : '地域'
    if (offering.tagIds.has(tag.id)) return { ...base, result: 'match', reason: `タグ「${tag.name}」`, matchedTagIds: [tag.id] }
    if (companyValue === tag.id) return { ...base, result: 'match', reason: `会社の${what}が「${tag.name}」`, matchedTagIds: [] }
    if (!companyValue) return { ...base, result: 'unknown', reason: `相手の会社の${what}が未登録`, matchedTagIds: [] }
    const actual = ctx.tagsById.get(companyValue)?.name
    return { ...base, result: 'miss', reason: actual ? `会社の${what}は「${actual}」` : null, matchedTagIds: [] }
  }
  return { ...base, ...judgeTag(tag, offering, ctx) }
}

/** 求める側の課題・希望すべてについて、提供側が該当するかを判定する（除外条件は見ない） */
export function compareNeeds(seeker: Person, provider: Person, ctx: MatchContext): BreakdownItem[] {
  const offering = effectiveOffering(provider)
  const out: BreakdownItem[] = []
  for (const n of effectiveNeeds(seeker)) {
    const tag = ctx.tagsById.get(n.tagId)
    if (tag) out.push(judgeNeed(n, tag, provider, offering, ctx))
  }
  return out
}

/** 内訳からマッチ率などを計算する */
export function summarize(breakdown: BreakdownItem[]): Omit<MatchResult, 'providerId' | 'seekerId' | 'breakdown'> {
  let total = 0
  let got = 0
  for (const b of breakdown) {
    const w = IMPORTANCE_WEIGHT[b.importance]
    total += w
    got += w * CREDIT[b.result]
  }
  const required = breakdown.filter((b) => b.importance === 'required')
  let score = total === 0 ? 0 : (got / total) * 100
  if (required.some((b) => b.result === 'miss')) score *= REQUIRED_MISS_FACTOR
  return {
    score: Math.round(score),
    matchCount: breakdown.filter((b) => b.result === 'match').length,
    partialCount: breakdown.filter((b) => b.result === 'partial').length,
    missCount: breakdown.filter((b) => b.result === 'miss').length,
    requiredTotal: required.length,
    requiredMet: required.filter((b) => b.result === 'match').length,
  }
}

/** 除外する組み合わせか */
export function isExcludedPair(seeker: Person, provider: Person, ctx: MatchContext): boolean {
  if (seeker.id === provider.id) return true
  if (seeker.deletedAt || provider.deletedAt) return true
  if (seeker.companyId && seeker.companyId === provider.companyId) return true
  if (ctx.declinedPairs.has(`${provider.id}:${seeker.id}`)) return true
  return false
}

/** seeker（求める側）の課題に provider（提供側）がどれだけ合うか */
export function scorePair(seeker: Person, provider: Person, ctx: MatchContext): MatchResult | null {
  if (isExcludedPair(seeker, provider, ctx)) return null
  if (seeker.needs.length === 0) return null
  const offering = effectiveOffering(provider)
  if (offering.tagIds.size === 0 && !offering.description) return null

  const breakdown = compareNeeds(seeker, provider, ctx)
  // 地域が同じだけでは候補にしない
  const tagHits = breakdown.filter((b) => b.category !== 'region' && (b.result === 'match' || b.result === 'partial')).length
  if (tagHits === 0) return null

  return { providerId: provider.id, seekerId: seeker.id, breakdown, ...summarize(breakdown) }
}

function sortResults(rs: MatchResult[], key: 'providerId' | 'seekerId'): MatchResult[] {
  return rs.sort((a, b) => b.score - a.score || a[key].localeCompare(b[key]))
}

/** この人の課題に合う人（この人 = 求める側） */
export function findProvidersFor(seeker: Person, people: Person[], ctx: MatchContext): MatchResult[] {
  const rs = people.map((p) => scorePair(seeker, p, ctx)).filter((r): r is MatchResult => r !== null)
  return sortResults(rs, 'providerId')
}

/** この人の得意領域を求めている人（この人 = 提供側） */
export function findSeekersFor(provider: Person, people: Person[], ctx: MatchContext): MatchResult[] {
  const rs = people.map((p) => scorePair(p, provider, ctx)).filter((r): r is MatchResult => r !== null)
  return sortResults(rs, 'seekerId')
}

/** 全員の総当たり（件数が増えたら対象の絞り込みかサーバー側への移動を検討する） */
export function findAllMatches(people: Person[], ctx: MatchContext): MatchResult[] {
  const out: MatchResult[] = []
  for (const s of people) for (const p of people) {
    const r = scorePair(s, p, ctx)
    if (r) out.push(r)
  }
  return out.sort((a, b) => b.score - a.score || a.seekerId.localeCompare(b.seekerId) || a.providerId.localeCompare(b.providerId))
}

export function importanceLabel(i: Importance): string {
  return IMPORTANCE_LABEL[i]
}
