```bash
$ yarn test:manual-fixture bin/__tests__/__fixtures__/relative-paths --import-config import-config.js

4 unmodified
0 skipped
2 ok
Time elapsed: 0.256seconds
diff --git a/bin/__tests__/__fixtures__/relative-paths/foo/another-test.js b/bin/__tests__/__fixtures__/relative-paths/foo/another-test.js
index 0e8c648..cddf6b5 100644
--- a/bin/__tests__/__fixtures__/relative-paths/foo/another-test.js
+++ b/bin/__tests__/__fixtures__/relative-paths/foo/another-test.js
@@ -1,7 +1,7 @@
 import { render } from "../utils.js";

-test("should render", () => {
-       render();
+test("should render", async () => {
+       await render();
 });

 function test(description, fn) {
diff --git a/bin/__tests__/__fixtures__/relative-paths/some-test.js b/bin/__tests__/__fixtures__/relative-paths/some-test.js
index 450092c..c5e241a 100644
--- a/bin/__tests__/__fixtures__/relative-paths/some-test.js
+++ b/bin/__tests__/__fixtures__/relative-paths/some-test.js
@@ -1,7 +1,7 @@
 import { render } from "./utils";

-test("should render", () => {
-       render();
+test("should render", async () => {
+       await render();
 });

 function test(description, fn) {
```
