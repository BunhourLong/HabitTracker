// Dev-only test crash for the error boundaries. Add ?crash=<section> to the URL
// (nav, avatar, stats or habits; repeat the param for several) and that section
// throws while rendering. Remove the param and click "Try again" to recover.
// Production builds never include this code.
export function crashTest(section) {
  if (!import.meta.env.DEV) return
  if (new URLSearchParams(window.location.search).getAll('crash').includes(section)) {
    throw new Error(`Test crash in the "${section}" section`)
  }
}
