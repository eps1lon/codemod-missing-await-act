```bash
$ yarn test:manual-fixture bin/__tests__/__fixtures__/relative-paths
Make sure to update import config to include the following files and their exports.
utils.js:
  - render
An import config considering the above files was generated in <NEW_IMPORT_CONFIG> . If these files are not necessarily imported as relative paths, you should add additional entries to the import config as explained in https://github.com/eps1lon/codemod-missing-await-act#custom-import-config.
After you adjusted above import config accordingly, run the codemod again with
`--import-config <NEW_IMPORT_CONFIG>`
```

`<NEW_IMPORT_CONFIG>` should contain

```js
import { render as render1 } from "file:///Users/sebbie/repos/codemod-missing-await-act/bin/__tests__/__fixtures__/relative-paths/utils.js";
```

Ultimately, starting with

```js
import { render as render1 } from "@testing-library/react";
```

in `bin/__tests__/__fixtures__/relative-paths/import-config.js` and then following the iterative approach, should result in the original, final result.
