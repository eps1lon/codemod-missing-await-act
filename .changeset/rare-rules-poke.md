---
"codemod-missing-await-act": minor
---

Handle factories of newly async functions

For example, in `const makeRender = () => () => render(...)`,
`makeRender` is considered factory of a newly async function.

We make sure that the `await` is added in the right places e.g.

```diff
const render = makeRender()

-render()
+await render()
```
