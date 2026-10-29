// ドメインモデルの型。本番では DB スキーマ（enum・子テーブル・ビュー）をここから導出する。
// 分からない値は null にして画面で「不明」と出す（既定値で埋めない）。

export type ID = string

/** ISO 8601 の日付（YYYY-MM-DD） */
export type DateString = string
/** ISO 8601 の日時 */
export type DateTimeString = string

// ---- ユーザー ----

export type Role = 'admin' | 'member'

export interface Profile {
  id: ID
  email: string
  name: string
  role: Role
  department: string | null
  /** 初回ログイン時にパスワード変更を強制する（本番は app_metadata、service_role のみ書ける） */
  mustChangePassword: boolean
  /** 無効化（退職など）。名刺は引き継ぎ先に移す */
  active: boolean
  createdAt: DateTimeString
}

/** 紹介メールの宛先 */
export type MailRecipient = 'both' | 'seeker' | 'provider'

export const MAIL_RECIPIENT_LABEL: Record<MailRecipient, string> = {
  both: '両方',
  seeker: '求める側だけ',
  provider: '提供側だけ',
}

export interface EmailTemplate {
  id: ID
  /** 一覧で見分けるための名前 */
  title: string
  recipient: MailRecipient
  subject: string
  body: string
}

export type PeopleView = 'grid' | 'list'

export interface UserPreferences {
  userId: ID
  /** 紹介メールのテンプレート（1 つ以上。先頭が既定） */
  emailTemplates: EmailTemplate[]
  /** マッチ候補に出す最低マッチ率 */
  minMatchScore: number
  /** 名刺一覧の表示（カード / リスト）。未設定ならカード */
  peopleView?: PeopleView
}

// ---- タグ辞書 ----

export type TagCategory = 'industry' | 'domain' | 'tech' | 'region' | 'other'

export const TAG_CATEGORY_LABEL: Record<TagCategory, string> = {
  industry: '業種',
  domain: '領域',
  tech: '技術',
  region: '地域',
  other: 'その他',
}

export interface Tag {
  id: ID
  /** 正規名 */
  name: string
  /** 別名（表記ゆれ） */
  aliases: string[]
  category: TagCategory
}

// ---- 会社 ----

export type CompanySize = 's1_9' | 's10_49' | 's50_299' | 's300_999' | 's1000_'

export const COMPANY_SIZES: CompanySize[] = ['s1_9', 's10_49', 's50_299', 's300_999', 's1000_']

export const COMPANY_SIZE_LABEL: Record<CompanySize, string> = {
  s1_9: '1〜9人',
  s10_49: '10〜49人',
  s50_299: '50〜299人',
  s300_999: '300〜999人',
  s1000_: '1000人以上',
}

export interface Company {
  id: ID
  name: string
  /** 業種タグ */
  industryTagId: ID | null
  size: CompanySize | null
  /** 地域タグ */
  regionTagId: ID | null
  address: string | null
}

// ---- 提供できること / 求めていること ----

/** 事業内容・得意領域（提供できること） */
export interface Offering {
  tagIds: ID[]
  description: string | null
}

export type Importance = 'required' | 'preferred' | 'any'

export const IMPORTANCE_LABEL: Record<Importance, string> = {
  required: '必須',
  preferred: '希望',
  any: 'どちらでも',
}

/** 課題・希望（求めていること）の 1 項目 */
export interface Need {
  id: ID
  tagId: ID
  importance: Importance
  dueDate: DateString | null
  note: string | null
}

// ---- 人（名刺） ----

/** 名刺の見える範囲 */
export type Visibility = 'company' | 'department' | 'private'

export const VISIBILITY_LABEL: Record<Visibility, string> = {
  company: '社内全員',
  department: '登録者の部署',
  private: '登録者のみ',
}

export interface Person {
  id: ID
  name: string
  kana: string | null
  companyId: ID | null
  department: string | null
  title: string | null
  email: string | null
  phone: string | null
  address: string | null
  url: string | null
  /** 名刺画像（モックでは data URL） */
  cardFrontUrl: string | null
  cardBackUrl: string | null
  exchangedOn: DateString | null
  exchangedAt: string | null
  referrer: string | null
  memo: string | null
  visibility: Visibility
  /** 名刺の持ち主（退職時は引き継ぎ先に変える） */
  ownerId: ID
  offering: Offering
  needs: Need[]
  /** 課題・希望の自由記述（背景・事情など）。マッチ率の計算には使わない */
  needsNote: string | null
  createdBy: ID
  updatedBy: ID
  createdAt: DateTimeString
  updatedAt: DateTimeString
  /** 論理削除 */
  deletedAt: DateTimeString | null
}

// ---- 紹介 ----

export type IntroStatus = 'candidate' | 'proposing' | 'introduced' | 'negotiating' | 'won' | 'declined'

export const INTRO_STATUSES: IntroStatus[] = ['candidate', 'proposing', 'introduced', 'negotiating', 'won', 'declined']

export const INTRO_STATUS_LABEL: Record<IntroStatus, string> = {
  candidate: '候補',
  proposing: '打診中',
  introduced: '紹介済',
  negotiating: '商談化',
  won: '成約',
  declined: '見送り',
}

/** 紹介を打診する前の本人同意 */
export type Consent = 'unknown' | 'obtained' | 'not_required'

export const CONSENT_LABEL: Record<Consent, string> = {
  unknown: '未確認',
  obtained: '同意あり',
  not_required: '不要',
}

export interface StatusChange {
  id: ID
  from: IntroStatus | null
  to: IntroStatus
  changedBy: ID
  changedAt: DateTimeString
  note: string | null
}

export interface Introduction {
  id: ID
  providerId: ID
  seekerId: ID
  /** 削除後も表示できるよう名前を控えておく */
  providerName: string
  seekerName: string
  status: IntroStatus
  history: StatusChange[]
  assigneeId: ID | null
  providerConsent: Consent
  seekerConsent: Consent
  /** 作成時のマッチ率（参考） */
  scoreAtCreation: number | null
  memo: string | null
  createdBy: ID
  createdAt: DateTimeString
  updatedAt: DateTimeString
}

// ---- モック DB 全体 ----

export interface MockDb {
  version: number
  profiles: Profile[]
  /** モック専用。本番は Supabase Auth が持つ */
  passwords: Record<ID, string>
  preferences: UserPreferences[]
  tags: Tag[]
  companies: Company[]
  people: Person[]
  introductions: Introduction[]
}
