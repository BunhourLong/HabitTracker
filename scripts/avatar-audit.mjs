// Avatar audit: client-side validation + the storage policy, attacked through the
// public API with the publishable key only (what any browser user has). Usage:
//   node --env-file=.env scripts/avatar-audit.mjs <emailA> <emailB> <password>
import { createClient } from '@supabase/supabase-js'
import { validateAvatar } from '../src/lib/validateAvatar.js'

const [emailA, emailB, password] = process.argv.slice(2)
const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_ANON_KEY
const client = () => createClient(url, key, { auth: { persistSession: false } })

let failed = 0
const check = (label, ok, detail = '') => {
  if (!ok) failed++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`)
}

// A tiny valid 1x1 PNG, and helpers to build files of any size/type.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
)
const MB = 1024 * 1024
const fileOf = (bytes, type, name) => new File([new Uint8Array(bytes)], name, { type })

// 1. Client-side validation (UX layer)
console.log('— client-side validation —')
check('5 MB PNG is refused client-side', !!validateAvatar(fileOf(5 * MB, 'image/png', 'big.png')), validateAvatar(fileOf(5 * MB, 'image/png', 'big.png')))
check('PDF is refused client-side', !!validateAvatar(fileOf(1000, 'application/pdf', 'cv.pdf')), validateAvatar(fileOf(1000, 'application/pdf', 'cv.pdf')))
check('SVG is refused client-side', !!validateAvatar(fileOf(1000, 'image/svg+xml', 'x.svg')))
check('empty file is refused client-side', !!validateAvatar(fileOf(0, 'image/png', 'empty.png')))
check('exactly 1 MB PNG is accepted', validateAvatar(fileOf(MB, 'image/png', 'ok.png')) === null)
check('1 MB + 1 byte is refused', !!validateAvatar(fileOf(MB + 1, 'image/png', 'over.png')))

// 2. Storage policy + bucket limits (security layer)
console.log('— storage policy (server) —')
const a = client()
const b = client()
await a.auth.signInWithPassword({ email: emailA, password })
await b.auth.signInWithPassword({ email: emailB, password })
const idA = (await a.auth.getUser()).data.user.id
const idB = (await b.auth.getUser()).data.user.id
const avatarsA = a.storage.from('avatars')
const avatarsB = b.storage.from('avatars')
const opts = { upsert: true, contentType: 'image/png' }

const up1 = await avatarsA.upload(`${idA}/avatar`, PNG, opts)
check('A can upload into their own folder', !up1.error, up1.error?.message)
const up2 = await avatarsA.upload(`${idA}/avatar`, PNG, opts)
check('A can re-upload (upsert overwrites)', !up2.error, up2.error?.message)
const { data: listA } = await avatarsA.list(idA)
check('re-upload replaced the file, no duplicates', listA?.length === 1, `${listA?.length} file(s) in ${idA}/`)

const big = await avatarsA.upload(`${idA}/avatar`, Buffer.alloc(5 * MB), opts)
check('5 MB upload that skips the client check is refused by the bucket', !!big.error, big.error?.message)
const html = await avatarsA.upload(`${idA}/avatar`, Buffer.from('<script>alert(1)</script>'), { upsert: true, contentType: 'text/html' })
check('text/html upload is refused by the bucket', !!html.error, html.error?.message)

const intoB = await avatarsA.upload(`${idB}/avatar`, PNG, opts)
check("A cannot upload into B's folder", !!intoB.error, intoB.error?.message)
const root = await avatarsA.upload('avatar.png', PNG, opts)
check('A cannot upload to the bucket root', !!root.error, root.error?.message)
const overwrite = await avatarsB.upload(`${idA}/avatar`, PNG, opts)
check("B cannot overwrite A's avatar", !!overwrite.error, overwrite.error?.message)
const del = await avatarsB.remove([`${idA}/avatar`])
check("B cannot delete A's avatar", !del.error && del.data.length === 0, del.error?.message ?? `${del.data.length} removed`)
const listByB = await avatarsB.list(idA)
check("B cannot list A's folder", (listByB.data ?? []).length === 0)

const anonUp = await client().storage.from('avatars').upload(`${idA}/avatar`, PNG, opts)
check('signed-out visitor cannot upload', !!anonUp.error, anonUp.error?.message)

const publicUrl = avatarsA.getPublicUrl(`${idA}/avatar`).data.publicUrl
const res = await fetch(publicUrl)
check("A's avatar is readable by public URL (public bucket)", res.ok, `HTTP ${res.status}`)

// 3. profiles.avatar_url (RLS)
console.log('— profiles table (RLS) —')
const saveA = await a.from('profiles').upsert({ id: idA, avatar_url: `${publicUrl}?v=audit` })
check('A can save their avatar_url', !saveA.error, saveA.error?.message)
const readByB = await b.from('profiles').select('avatar_url').eq('id', idA)
check("B cannot read A's profile", readByB.data?.length === 0)
const hijack = await b.from('profiles').update({ avatar_url: 'https://evil.example/x.png' }).eq('id', idA).select()
check("B cannot change A's avatar_url", hijack.data?.length === 0, hijack.error?.message)
const spoof = await b.from('profiles').insert({ id: idA, avatar_url: 'https://evil.example/x.png' })
check('B cannot create a profile row for A', !!spoof.error, spoof.error?.message)

await Promise.all([a.auth.signOut(), b.auth.signOut()])
console.log(failed ? `\n${failed} check(s) FAILED` : '\nAll avatar checks passed')
