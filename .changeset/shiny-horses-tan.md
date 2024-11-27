---
"codemod-missing-await-act": minor
---

Summarize follow-up items when codemod finished

When newly async functions are exported, the codemod will not automatically update
all references.
However, we now summarize at the end which files are impacted and generate an import
config that can be used to update the remaining references if these are imported
via relative imports.
However, if these exports are imported via package specifiers or other path aliases,
users need to manually adjust the import sources which is explained in the README.
