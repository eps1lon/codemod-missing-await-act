# codemod-missing-await-act

## 0.2.0

### Minor Changes

- [#20](https://github.com/eps1lon/codemod-missing-await-act/pull/20) [`b22e5ff`](https://github.com/eps1lon/codemod-missing-await-act/commit/b22e5ff830a913096fbc5dc7b2b0d00cc41149c0) Thanks [@eps1lon](https://github.com/eps1lon)! - Codemod React Native Testing Library by default

- [#14](https://github.com/eps1lon/codemod-missing-await-act/pull/14) [`408a664`](https://github.com/eps1lon/codemod-missing-await-act/commit/408a664a7bf080736be21efa93064f5795086ef3) Thanks [@eps1lon](https://github.com/eps1lon)! - Warn when a newly-async function is exported

  This codemod can only propagate newly async methods within a file.
  Once a function is exported, we can't propagate that with a codemod.
  We'll later add support for configuring detection mechanisms.
  Once that is done, we'll instruct to rerun the codemod with updated configuration until no more warnings remain.

- [#16](https://github.com/eps1lon/codemod-missing-await-act/pull/16) [`9890da7`](https://github.com/eps1lon/codemod-missing-await-act/commit/9890da7958e56d2c9c82938402e44524fb407621) Thanks [@eps1lon](https://github.com/eps1lon)! - Allow config of method names

### Patch Changes

- [#19](https://github.com/eps1lon/codemod-missing-await-act/pull/19) [`4608966`](https://github.com/eps1lon/codemod-missing-await-act/commit/46089664066488632d837e6091b911ecc3dc1971) Thanks [@eps1lon](https://github.com/eps1lon)! - Skip `.d.mts` files

  We already skiped `.d.ts` and `.d.cts`.

- [#15](https://github.com/eps1lon/codemod-missing-await-act/pull/15) [`3fd0c4e`](https://github.com/eps1lon/codemod-missing-await-act/commit/3fd0c4e4d1263f3c7b9f3d380d6d5029047e5f0c) Thanks [@eps1lon](https://github.com/eps1lon)! - Stop codemodding declaration files

- [#12](https://github.com/eps1lon/codemod-missing-await-act/pull/12) [`8625705`](https://github.com/eps1lon/codemod-missing-await-act/commit/86257058b69661f111aa0145ac64b5136e1bec3f) Thanks [@eps1lon](https://github.com/eps1lon)! - Consider import aliases

  Previously, we didn't check if a call was from an import alias.
  For example, given `import { act as domAct } from '@testing-library/react'`, we didn't consider `domAct` to be `async` since we only looked for exports from `@testing-library/dom` with the name `act`.
  Now we properly map renames.

- [#18](https://github.com/eps1lon/codemod-missing-await-act/pull/18) [`e844aba`](https://github.com/eps1lon/codemod-missing-await-act/commit/e844aba4caaf0d2bc4ef68cda5bbdd9e1ec39088) Thanks [@eps1lon](https://github.com/eps1lon)! - Fix crash when import config used default imports

- [#17](https://github.com/eps1lon/codemod-missing-await-act/pull/17) [`fc70a45`](https://github.com/eps1lon/codemod-missing-await-act/commit/fc70a452547573764cfd9c9cb1366a8902c82dd2) Thanks [@eps1lon](https://github.com/eps1lon)! - Warn on newly async if exported direct

  E.g. `export function render() { act() }` used to not trigger warnings.
  Only on `export { render }`.
  Now `export ...` correctly triggers a warning if the exported value is now an async function.

## 0.1.0

### Minor Changes

- [#2](https://github.com/eps1lon/codemod-missing-await-act/pull/2) [`dc79d3c`](https://github.com/eps1lon/codemod-missing-await-act/commit/dc79d3c80554abc9e35e2abcbc17e0914519dd4a) Thanks [@eps1lon](https://github.com/eps1lon)! - Add APIs from React Testing Library

- [#9](https://github.com/eps1lon/codemod-missing-await-act/pull/9) [`3d98463`](https://github.com/eps1lon/codemod-missing-await-act/commit/3d9846348892277c33268ef8bff4cfac8ec869f5) Thanks [@eps1lon](https://github.com/eps1lon)! - Add support for Flow syntax

- [#8](https://github.com/eps1lon/codemod-missing-await-act/pull/8) [`e58f54b`](https://github.com/eps1lon/codemod-missing-await-act/commit/e58f54b587bc5088016d54021d4fbfb61dd30dfb) Thanks [@eps1lon](https://github.com/eps1lon)! - Restrict codemod to known modules

### Patch Changes

- [#4](https://github.com/eps1lon/codemod-missing-await-act/pull/4) [`19acfd5`](https://github.com/eps1lon/codemod-missing-await-act/commit/19acfd518812ff6aba2e0bdb30dd6b30a4451e9e) Thanks [@eps1lon](https://github.com/eps1lon)! - Fix parse errors when transform files containing JSX

- [#5](https://github.com/eps1lon/codemod-missing-await-act/pull/5) [`c1031ac`](https://github.com/eps1lon/codemod-missing-await-act/commit/c1031acec93fff8479ddd900929ef569c321e012) Thanks [@eps1lon](https://github.com/eps1lon)! - Add missing React Testing Library APIs

  `renderHook` was missing.

- [#11](https://github.com/eps1lon/codemod-missing-await-act/pull/11) [`15247fa`](https://github.com/eps1lon/codemod-missing-await-act/commit/15247fa18d029aaeda6c51afc3d45b40c4823f7a) Thanks [@eps1lon](https://github.com/eps1lon)! - Only add await to calls of newly async functions
