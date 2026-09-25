// RLS audit: acts like a browser client (publishable key only) and tries to
// read/modify another user's rows. Usage:
//   node --env-file=.env scripts/rls-audit.mjs <emailA> <emailB> <password>
import { createClient } from '@supabase/supabase-js'

const [emailA, emailB, password] = process.argv.slice(2)
const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_ANON_KEY
const client = () => createClient(url, key, { auth: { persistSession: false } })

let failed = 0
const check = (label, ok, detail = '') => {
  if (!ok) failed++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`)
}

// 1. Anonymous visitor
const anon = client()
const anonRead = await anon.from('habits').select('id')
check('anon cannot read habits', (anonRead.data ?? []).length === 0, anonRead.error?.message ?? `${anonRead.data.length} rows`)

// 2. User A owns rows
const a = client()
await a.auth.signInWithPassword({ email: emailA, password })
const { data: aHabits } = await a.from('habits').select('id, name, daily_logs(id)')
check('user A sees own habits', aHabits.length > 0, `${aHabits.length} habits`)
const victim = aHabits[0]

// 3. User B tries to reach A's rows
const b = client()
await b.auth.signInWithPassword({ email: emailB, password })
const { data: bUser } = await b.auth.getUser()

const bRead = await b.from('habits').select('id')
check('user B sees an EMPTY list (not an error)', !bRead.error && bRead.data.length === 0, bRead.error?.message ?? `${bRead.data.length} rows`)

const bReadById = await b.from('habits').select('id').eq('id', victim.id)
check("user B cannot read A's habit by id", bReadById.data.length === 0)

const bLogs = await b.from('daily_logs').select('id')
check("user B cannot read A's logs", bLogs.data.length === 0)

const bUpdate = await b.from('habits').update({ name: 'hacked' }).eq('id', victim.id).select()
check("user B cannot rename A's habit", bUpdate.data?.length === 0, bUpdate.error?.message)

const bDelete = await b.from('habits').delete().eq('id', victim.id).select()
check("user B cannot delete A's habit", bDelete.data?.length === 0, bDelete.error?.message)

const bSpoof = await b.from('habits').insert({ name: 'spoofed', user_id: (await a.auth.getUser()).data.user.id })
check('user B cannot insert a habit owned by A', !!bSpoof.error, bSpoof.error?.message)

const bLogOnA = await b.from('daily_logs').insert({ habit_id: victim.id, user_id: bUser.user.id })
check("user B cannot log against A's habit", !!bLogOnA.error, bLogOnA.error?.message)

// A's data is untouched
const { data: after } = await a.from('habits').select('id, name').eq('id', victim.id).single()
check("A's habit is unchanged", after?.name === victim.name, after?.name)

await Promise.all([a.auth.signOut(), b.auth.signOut()])
console.log(failed ? `\n${failed} check(s) FAILED` : '\nAll RLS checks passed')
process.exit(failed ? 1 : 0)
