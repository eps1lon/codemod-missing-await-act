---
"codemod-missing-await-act": minor
---

Warn when a newly-async function is exported

This codemod can only propagate newly async methods within a file.
Once a function is exported, we can't propagate that with a codemod.
We'll later add support for configuring detection mechanisms.
Once that is done, we'll instruct to rerun the codemod with updated configuration until no more warnings remain.
