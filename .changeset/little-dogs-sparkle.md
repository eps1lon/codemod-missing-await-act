---
"codemod-missing-await-act": minor
---

Add support for propagating through relative paths

The import config (from `--import-config-path`) can now contain imports to absolute
paths prefixed as file URLs.
File URLs will be matched against relative imports.
Given this import config

```js
import { render as render1 } from "file:///root/relative-paths/utils.js";
```

the import `import { render } from './utils'` in `/root/index.test.js` will be
considered as newly async and each call of `render` will be awaited.
