---
"codemod-missing-await-act": patch
---

Warn on newly async if exported direct

E.g. `export function render() { act() }` used to not trigger warnings.
Only on `export { render }`.
Now `export ...` correctly triggers a warning if the exported value is now an async function.
