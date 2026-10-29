// 仮データ。実在の人・会社・名刺は入れない（会社名・氏名・メールはすべて架空）。
import type { Company, Importance, Introduction, IntroStatus, MockDb, Need, Offering, Person, Profile, Tag, TagCategory } from '../types'
import { defaultTemplates } from '../lib/mailTemplate'

export const DB_VERSION = 7

const T0 = '2026-09-01T09:00:00.000Z'

// ---- 利用者 ----
const profiles: Profile[] = [
  { id: 'u_dev', email: 'dev@example.com', name: '開発用 管理者', role: 'admin', department: '営業企画部', mustChangePassword: false, active: true, createdAt: T0 },
  { id: 'u_a', email: 'member-a@example.com', name: '利用者 A', role: 'member', department: '営業部', mustChangePassword: false, active: true, createdAt: T0 },
  { id: 'u_b', email: 'member-b@example.com', name: '利用者 B', role: 'member', department: '営業部', mustChangePassword: true, active: true, createdAt: T0 },
  { id: 'u_c', email: 'member-c@example.com', name: '利用者 C', role: 'member', department: '開発部', mustChangePassword: false, active: true, createdAt: T0 },
]

// ---- タグ辞書 ----
const tagDefs: [string, TagCategory, string, string[]][] = [
  ['t_mfg', 'industry', '製造業', ['製造', 'メーカー']],
  ['t_it', 'industry', 'IT・ソフトウェア', ['IT', 'ソフトウェア', 'SaaS']],
  ['t_retail', 'industry', '小売', ['リテール']],
  ['t_logi', 'industry', '物流', ['ロジスティクス', '運送']],
  ['t_food', 'industry', '飲食', ['外食', 'フード']],
  ['t_estate', 'industry', '不動産', []],
  ['t_med', 'industry', '医療・ヘルスケア', ['医療', 'ヘルスケア']],
  ['t_hiring', 'domain', '採用支援', ['採用', '人材採用', 'リクルーティング']],
  ['t_webdesign', 'domain', 'Webデザイン', ['ウェブデザイン', 'HP制作', 'ホームページ制作']],
  ['t_design', 'domain', 'デザイン', []],
  ['t_dx', 'domain', '業務効率化', ['DX', '業務改善']],
  ['t_finance', 'domain', '資金調達', ['ファイナンス', '融資']],
  ['t_global', 'domain', '海外展開', ['海外進出', '越境']],
  ['t_sales', 'domain', '営業代行', ['セールス代行']],
  ['t_marketing', 'domain', 'マーケティング', ['マーケ', '集客']],
  ['t_pr', 'domain', '広報・PR', ['PR', '広報']],
  ['t_logikaizen', 'domain', '物流改善', ['配送効率化']],
  ['t_subsidy', 'domain', '補助金申請', ['補助金', '助成金']],
  ['t_qc', 'domain', '品質管理', ['QC']],
  ['t_ai', 'tech', 'AI・機械学習', ['AI', '機械学習', 'ML']],
  ['t_cloud', 'tech', 'クラウド', ['AWS', 'Azure', 'GCP']],
  ['t_ec', 'tech', 'ECサイト構築', ['EC', 'ネットショップ', '通販サイト']],
  ['t_app', 'tech', 'モバイルアプリ', ['アプリ開発', 'iOS', 'Android']],
  ['t_iot', 'tech', 'IoT', []],
  ['t_sec', 'tech', 'セキュリティ', ['情報セキュリティ', 'サイバーセキュリティ']],
  ['t_tokyo', 'region', '東京', ['東京都']],
  ['t_osaka', 'region', '大阪', ['大阪府']],
  ['t_fukuoka', 'region', '福岡', ['福岡県']],
  ['t_hokkaido', 'region', '北海道', []],
  ['t_aichi', 'region', '愛知', ['愛知県', '名古屋']],
]
const tags: Tag[] = tagDefs.map(([id, category, name, aliases]) => ({ id, category, name, aliases }))

let seq = 0
const need = (tagId: string, importance: Importance, dueDate: string | null = null, note: string | null = null): Need => ({ id: `n_${++seq}`, tagId, importance, dueDate, note })

// ---- 会社 ----
const companies: Company[] = [
  { id: 'c1', name: 'サンプル精工株式会社', industryTagId: 't_mfg', size: 's50_299', regionTagId: 't_aichi', address: '愛知県架空市サンプル町1-1' },
  { id: 'c2', name: 'テスト・デジタル合同会社', industryTagId: 't_it', size: 's10_49', regionTagId: 't_tokyo', address: '東京都架空区テスト2-3-4' },
  { id: 'c3', name: '架空ロジ株式会社', industryTagId: 't_logi', size: 's300_999', regionTagId: 't_osaka', address: '大阪府架空市ダミー5-6' },
  { id: 'c4', name: 'ダミーデザイン工房', industryTagId: null, size: 's1_9', regionTagId: 't_fukuoka', address: null },
  { id: 'c5', name: '例示フーズ株式会社', industryTagId: 't_food', size: 's50_299', regionTagId: 't_hokkaido', address: '北海道架空市れいじ7-8' },
  { id: 'c6', name: 'モック人材サービス株式会社', industryTagId: null, size: 's10_49', regionTagId: 't_tokyo', address: '東京都架空区モック9-9' },
  { id: 'c7', name: 'サンプル不動産パートナーズ', industryTagId: 't_estate', size: 's10_49', regionTagId: 't_tokyo', address: null },
  { id: 'c8', name: '仮称メディカルラボ株式会社', industryTagId: 't_med', size: 's50_299', regionTagId: 't_osaka', address: '大阪府架空市かしょう3-1' },
  { id: 'c9', name: 'テストコンサルティング', industryTagId: null, size: 's1_9', regionTagId: 't_tokyo', address: null },
  { id: 'c10', name: '架空セキュリティ研究所', industryTagId: 't_it', size: 's10_49', regionTagId: 't_fukuoka', address: '福岡県架空市けんきゅう1-2' },
  { id: 'c11', name: 'サンプルEC開発株式会社', industryTagId: 't_it', size: 's10_49', regionTagId: 't_osaka', address: null },
]

// 会社ごとの事業内容・課題。仮データを短く書くためのもので、下でその会社の人の名刺に入れる
// （マッチングは名刺どうしで行い、会社には事業内容・課題を持たせない）
const companyProfiles: Record<string, { offering: Offering; needs: Need[] }> = {
  c1: { offering: { tagIds: ['t_qc'], description: '精密部品の切削加工。少量多品種に強い。' }, needs: [need('t_dx', 'required'), need('t_iot', 'preferred'), need('t_hiring', 'any')] },
  c2: { offering: { tagIds: ['t_dx', 't_cloud', 't_app'], description: '中小企業向けの業務システム受託開発。' }, needs: [need('t_hiring', 'preferred')] },
  c3: { offering: { tagIds: ['t_logikaizen'], description: '関西圏の共同配送、倉庫の運営代行。' }, needs: [need('t_sec', 'preferred')] },
  c4: { offering: { tagIds: ['t_webdesign', 't_pr'], description: 'コーポレートサイト、採用サイトの制作。' }, needs: [] },
  c5: { offering: { tagIds: [], description: '道産食材の加工・卸。' }, needs: [need('t_ec', 'required', '2027-03-31'), need('t_marketing', 'preferred'), need('t_global', 'any')] },
  c6: { offering: { tagIds: ['t_hiring', 't_sales'], description: '製造業・IT 向けの人材紹介、営業代行。' }, needs: [] },
  c7: { offering: { tagIds: [], description: null }, needs: [need('t_webdesign', 'required'), need('t_marketing', 'preferred')] },
  c8: { offering: { tagIds: [], description: '臨床検査の受託。' }, needs: [need('t_ai', 'preferred'), need('t_sec', 'required'), need('t_subsidy', 'any')] },
  c9: { offering: { tagIds: ['t_subsidy', 't_finance', 't_global'], description: '中小企業の資金繰り、補助金の申請支援、海外進出の支援。' }, needs: [] },
  c10: { offering: { tagIds: ['t_sec', 't_cloud'], description: '脆弱性診断、クラウドの設定監査。' }, needs: [need('t_marketing', 'preferred')] },
  c11: { offering: { tagIds: ['t_ec', 't_webdesign'], description: 'Shopify などでのネットショップ構築と運用代行、集客支援。' }, needs: [] },
}

type PersonSeed = Partial<Person> & Pick<Person, 'id' | 'name' | 'companyId'>
const person = (s: PersonSeed): Person => ({
  kana: null, department: null, title: null, email: null, phone: null, address: null, url: null,
  cardFrontUrl: null, cardBackUrl: null, exchangedOn: null, exchangedAt: null, referrer: null, memo: null,
  visibility: 'company', ownerId: 'u_dev', offering: { tagIds: [], description: null }, needs: [], needsNote: null,
  createdBy: s.ownerId ?? 'u_dev', updatedBy: s.ownerId ?? 'u_dev', createdAt: T0, updatedAt: T0, deletedAt: null,
  ...s,
})

const people: Person[] = [
  person({ id: 'p1', name: '山田 太郎', kana: 'やまだ たろう', companyId: 'c1', department: '生産技術部', title: '部長', email: 'yamada@sample-seiko.example', phone: '000-0000-0001', exchangedOn: '2026-06-12', exchangedAt: '架空ものづくり展 2026', memo: '展示会のブースで名刺交換。', needsNote: '工場のペーパーレス化を検討中。検品の目視作業も減らしたい。', needs: [need('t_ai', 'preferred', null, '検品の画像判定'), need('t_aichi', 'preferred')] }),
  person({ id: 'p2', name: '佐藤 花子', kana: 'さとう はなこ', companyId: 'c2', department: '開発部', title: '代表', email: 'sato@test-digital.example', exchangedOn: '2026-05-20', exchangedAt: '架空 IT 交流会', offering: { tagIds: ['t_ai'], description: '画像認識の PoC 実績あり。' }, ownerId: 'u_a' }),
  person({ id: 'p3', name: '鈴木 一郎', kana: 'すずき いちろう', companyId: 'c3', department: '情報システム部', title: '課長', email: 'suzuki@kakuu-logi.example', exchangedOn: '2026-07-01', referrer: '利用者 A', needs: [need('t_cloud', 'preferred')], ownerId: 'u_a', visibility: 'department' }),
  person({ id: 'p4', name: '高橋 さくら', kana: 'たかはし さくら', companyId: 'c4', title: 'デザイナー', email: 'takahashi@dummy-design.example', exchangedOn: '2026-04-15', exchangedAt: '福岡 架空クリエイター会', ownerId: 'u_c' }),
  person({ id: 'p5', name: '田中 次郎', kana: 'たなか じろう', companyId: 'c5', department: '営業企画室', title: '室長', email: 'tanaka@reiji-foods.example', exchangedOn: '2026-08-03', needsNote: '来春までに自社 EC を立ち上げたい。道産食材の通販と、将来は海外向けも。' }),
  person({ id: 'p6', name: '伊藤 美咲', kana: 'いとう みさき', companyId: 'c6', department: 'コンサルティング部', title: 'マネージャー', email: 'ito@mock-jinzai.example', exchangedOn: '2026-03-10', offering: { tagIds: ['t_hiring'], description: '製造業の技術職採用が得意。' }, ownerId: 'u_a' }),
  person({ id: 'p7', name: '渡辺 健', kana: 'わたなべ けん', companyId: 'c7', title: '代表取締役', email: 'watanabe@sample-fudosan.example', exchangedOn: '2026-09-02', exchangedAt: '架空商工会 交流会', needs: [need('t_tokyo', 'any')] }),
  person({ id: 'p8', name: '中村 優子', kana: 'なかむら ゆうこ', companyId: 'c8', department: '経営企画部', title: '部長', email: 'nakamura@kasho-medical.example', exchangedOn: '2026-07-22', needs: [need('t_dx', 'preferred'), need('t_osaka', 'preferred')], visibility: 'private', ownerId: 'u_c' }),
  person({ id: 'p9', name: '小林 誠', kana: 'こばやし まこと', companyId: 'c9', title: '中小企業診断士', email: 'kobayashi@test-consulting.example', exchangedOn: '2026-02-18' }),
  person({ id: 'p10', name: '加藤 真一', kana: 'かとう しんいち', companyId: 'c10', department: '診断事業部', title: '主任研究員', email: 'kato@kakuu-sec.example', exchangedOn: '2026-06-30', exchangedAt: '架空セキュリティカンファレンス', ownerId: 'u_c' }),
  person({ id: 'p11', name: '吉田 あおい', kana: 'よしだ あおい', companyId: 'c11', department: 'ソリューション部', title: 'ディレクター', email: 'yoshida@sample-ec.example', exchangedOn: '2026-08-25', offering: { tagIds: ['t_marketing'], description: 'EC の集客、SNS 運用。' } }),
  person({ id: 'p12', name: '山本 大輔', kana: 'やまもと だいすけ', companyId: 'c2', department: '営業部', title: '営業', email: 'yamamoto@test-digital.example', exchangedOn: '2026-05-20', exchangedAt: '架空 IT 交流会', ownerId: 'u_a' }),
  person({ id: 'p13', name: '松本 直子', kana: 'まつもと なおこ', companyId: null, title: 'フリーランス', email: 'matsumoto@freelance.example', exchangedOn: null, offering: { tagIds: ['t_pr', 't_marketing'], description: 'BtoB の広報、プレスリリース作成。' }, memo: '会社名は不明。' }),
  person({ id: 'p14', name: '井上 拓海', kana: null, companyId: 'c1', department: '人事部', title: null, email: null, exchangedOn: '2026-06-12', exchangedAt: '架空ものづくり展 2026', needs: [need('t_hiring', 'required', '2026-12-31', '技術職 3 名')] }),
]

// 会社の事業内容・課題を、その会社の人の名刺に足す（同じタグの課題は重要度の高いほう）
const WEIGHT: Record<Importance, number> = { required: 3, preferred: 2, any: 1 }
for (const p of people) {
  const cp = p.companyId ? companyProfiles[p.companyId] : undefined
  if (!cp) continue
  p.offering = {
    tagIds: [...new Set([...p.offering.tagIds, ...cp.offering.tagIds])],
    description: [p.offering.description, cp.offering.description].filter(Boolean).join('\n') || null,
  }
  for (const n of cp.needs) {
    const cur = p.needs.find((x) => x.tagId === n.tagId)
    if (!cur) p.needs.push({ ...n, id: `n_${++seq}` })
    else if (WEIGHT[n.importance] > WEIGHT[cur.importance]) cur.importance = n.importance
  }
}

const intro = (id: string, providerId: string, seekerId: string, statuses: IntroStatus[], extra: Partial<Introduction> = {}): Introduction => {
  const name = (pid: string) => people.find((p) => p.id === pid)!.name
  const history = statuses.map((to, i) => ({ id: `h_${id}_${i}`, from: i === 0 ? null : statuses[i - 1], to, changedBy: 'u_dev', changedAt: new Date(Date.parse(T0) + (i + 1) * 86400000 * 3).toISOString(), note: null }))
  return {
    id, providerId, seekerId, providerName: name(providerId), seekerName: name(seekerId),
    status: statuses[statuses.length - 1], history, assigneeId: 'u_dev', providerConsent: 'obtained', seekerConsent: 'obtained',
    scoreAtCreation: null, memo: null, createdBy: 'u_dev', createdAt: history[0].changedAt, updatedAt: history[history.length - 1].changedAt,
    ...extra,
  }
}

const introductions: Introduction[] = [
  intro('i1', 'p2', 'p1', ['candidate', 'proposing', 'introduced', 'negotiating'], { scoreAtCreation: 82, memo: '検品 AI の PoC で打ち合わせ予定。' }),
  intro('i2', 'p6', 'p14', ['candidate', 'proposing'], { scoreAtCreation: 100, seekerConsent: 'unknown', assigneeId: 'u_a' }),
  intro('i3', 'p4', 'p7', ['candidate', 'proposing', 'declined'], { scoreAtCreation: 70, memo: '地域が合わず見送り。' }),
  intro('i4', 'p9', 'p5', ['candidate', 'proposing', 'introduced', 'negotiating', 'won'], { scoreAtCreation: 45 }),
]

export function createSeedDb(): MockDb {
  return structuredClone({
    version: DB_VERSION,
    profiles,
    passwords: { u_dev: 'password', u_a: 'password', u_b: 'password', u_c: 'password' },
    preferences: profiles.map((p) => ({ userId: p.id, emailTemplates: defaultTemplates(), minMatchScore: 30 })),
    tags,
    companies,
    people,
    introductions,
  })
}
