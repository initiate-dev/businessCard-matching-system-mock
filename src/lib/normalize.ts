import type { Tag } from '../types'

/**
 * 比較用に文字列を正規化する。
 * 全角半角をそろえ（NFKC）、小文字にし、空白と記号を取り除く。
 */
export function normalizeText(s: string): string {
  return s
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]/gu, '')
}

/** タグの正規名と別名を正規化したもの */
export function tagKeys(tag: Tag): string[] {
  return [tag.name, ...tag.aliases].map(normalizeText).filter((k) => k.length > 0)
}

/** 入力された文字列に一致するタグ（正規名または別名）を探す */
export function resolveTag(input: string, tags: Tag[]): Tag | null {
  const key = normalizeText(input)
  if (!key) return null
  return tags.find((t) => tagKeys(t).includes(key)) ?? null
}

/** メールアドレスの比較用 */
export function normalizeEmail(s: string | null): string | null {
  if (!s) return null
  const v = s.normalize('NFKC').trim().toLowerCase()
  return v || null
}
