---
"codemod-missing-await-act": patch
---

Consider import aliases

Previously, we didn't check if a call was from an import alias.
For example, given `import { act as domAct } from '@testing-library/react'`, we didn't consider `domAct` to be `async` since we only looked for exports from `@testing-library/dom` with the name `act`.
Now we properly map renames.
