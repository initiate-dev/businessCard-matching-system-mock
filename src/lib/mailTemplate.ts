import type { EmailTemplate } from '../types'
import type { BreakdownItem } from './match'
import { newId } from './util'

/** 差し込み項目 */
export const TEMPLATE_VARS: { key: string; label: string }[] = [
  { key: '提供側氏名', label: '提供側の氏名' },
  { key: '提供側会社', label: '提供側の会社名' },
  { key: '提供側役職', label: '提供側の役職' },
  { key: '求める側氏名', label: '求める側の氏名' },
  { key: '求める側会社', label: '求める側の会社名' },
  { key: '求める側役職', label: '求める側の役職' },
  { key: '一致した項目', label: '一致・部分一致したタグ（読点区切り）' },
  { key: '課題の詳細', label: '求める側の課題・希望の自由記述' },
  { key: '差出人', label: 'ログイン中の利用者の名前' },
]

/**
 * 最初から用意するテンプレート（利用者ごとにコピーして持つ）。
 * 紹介の流れに合わせて、打診（片方ずつ本人の意向を聞く）→ 紹介（両者をつなぐ）の 3 種類。
 */
export const DEFAULT_TEMPLATES: EmailTemplate[] = [
  {
    id: 'tpl_default',
    title: '紹介メール（両者あて）',
    recipient: 'both',
    subject: '【ご紹介】{{求める側会社}} {{求める側氏名}}様 × {{提供側会社}} {{提供側氏名}}様',
    body: `{{求める側会社}} {{求める側氏名}}様
{{提供側会社}} {{提供側氏名}}様

お世話になっております。{{差出人}}です。

本日はお二人をご紹介したくご連絡いたしました。

{{求める側氏名}}様が取り組まれている「{{一致した項目}}」について、
{{提供側氏名}}様がお力になれるのではと考えております。

お手数ですが、以降は直接ご連絡いただけますと幸いです。
どうぞよろしくお願いいたします。

{{差出人}}`,
  },
  {
    id: 'tpl_ask_seeker',
    title: '打診メール（求める側へ）',
    recipient: 'seeker',
    subject: '【ご相談】「{{一致した項目}}」についてご紹介できる方がいます',
    body: `{{求める側会社}} {{求める側氏名}}様

お世話になっております。{{差出人}}です。

以前お伺いした「{{一致した項目}}」の件で、
お力になれそうな方がいらっしゃるのでご連絡しました。

  {{提供側会社}} {{提供側役職}} {{提供側氏名}}様

ご興味がおありでしたら、お二人をおつなぎしたいと考えております。
ご紹介を進めてよろしいか、ご都合をお聞かせいただけますと幸いです。

どうぞよろしくお願いいたします。

{{差出人}}`,
  },
  {
    id: 'tpl_ask_provider',
    title: '打診メール（提供側へ）',
    recipient: 'provider',
    subject: '【ご相談】{{求める側会社}}様をご紹介してもよろしいでしょうか',
    body: `{{提供側会社}} {{提供側氏名}}様

お世話になっております。{{差出人}}です。

{{提供側氏名}}様のご経験を活かしていただけそうなお話があり、ご連絡しました。

  {{求める側会社}} {{求める側役職}} {{求める側氏名}}様
  取り組まれていること: {{一致した項目}}

先方も前向きでしたら、お二人をおつなぎしたいと考えております。
ご紹介してもよろしいか、お聞かせいただけますと幸いです。

どうぞよろしくお願いいたします。

{{差出人}}`,
  },
]

/** 既定（両者あての紹介メール） */
export const DEFAULT_TEMPLATE: EmailTemplate = DEFAULT_TEMPLATES[0]

/** 最初から用意するテンプレートのコピー */
export function defaultTemplates(): EmailTemplate[] {
  return structuredClone(DEFAULT_TEMPLATES)
}

/** 最初から用意したテンプレートなら、その元の文面（なければ両者あての文面） */
export function originalOf(id: string): EmailTemplate {
  return DEFAULT_TEMPLATES.find((t) => t.id === id) ?? DEFAULT_TEMPLATE
}

/** 新しいテンプレート（文面は両者あての紹介メールをひな形にする） */
export function newTemplate(title: string): EmailTemplate {
  return { ...DEFAULT_TEMPLATE, id: newId('tpl'), title }
}

/** 差し込み済みの紹介メール */
export interface FilledMail {
  to: string[]
  subject: string
  body: string
}

/**
 * テンプレートに 2 人の情報を差し込む。
 * 「一致した項目」は、地域・業種を除いた課題のうち一致・部分一致したタグ。
 */
export function buildIntroMail(tpl: EmailTemplate, args: {
  seeker: { name: string; email: string | null; title: string | null; companyName: string; needsNote?: string | null } | null
  provider: { name: string; email: string | null; title: string | null; companyName: string } | null
  breakdown: BreakdownItem[] | null
  senderName: string
}): FilledMail {
  const { seeker, provider, breakdown, senderName } = args
  const matched = (breakdown ?? [])
    .filter((b) => b.category !== 'region' && b.category !== 'industry' && (b.result === 'match' || b.result === 'partial'))
    .map((b) => b.tagName)
    .join('、')
  const vars: Record<string, string> = {
    提供側氏名: provider?.name ?? '', 提供側会社: provider?.companyName ?? '', 提供側役職: provider?.title ?? '',
    求める側氏名: seeker?.name ?? '', 求める側会社: seeker?.companyName ?? '', 求める側役職: seeker?.title ?? '',
    一致した項目: matched, 課題の詳細: seeker?.needsNote ?? '', 差出人: senderName,
  }
  const recipients = tpl.recipient === 'seeker' ? [seeker] : tpl.recipient === 'provider' ? [provider] : [seeker, provider]
  return {
    to: recipients.map((p) => p?.email).filter((e): e is string => !!e),
    subject: fillTemplate(tpl.subject, vars),
    body: fillTemplate(tpl.body, vars),
  }
}

export function fillTemplate(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (all, key: string) => (key in vars ? vars[key] : all))
}

export function buildMailto(to: string[], subject: string, body: string): string {
  return `mailto:${to.map(encodeURIComponent).join(',')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}
