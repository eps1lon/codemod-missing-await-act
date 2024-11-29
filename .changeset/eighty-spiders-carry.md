---
"codemod-missing-await-act": patch
---

Support `React.act`

We previously didn't consider this method as newly async.

Even though it isn't `async` yet, we should start codemodding it as if it were.
We already codemodded `unstable_act` in the same way.
`unstable_act` is renamed to `act` in React 19, so we should be ready for this change.
