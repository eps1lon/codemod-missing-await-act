---
"codemod-missing-await-act": patch
---

Log escaped bindings even if code wasn't changed

E.g. `export const myAct = scope => React.act(scope)` is newly async,
but we didn't used to log it because the code didn't change.
Now we do log it as escaped and recommend running the codemod again.
