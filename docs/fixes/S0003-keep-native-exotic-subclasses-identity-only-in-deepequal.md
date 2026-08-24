---
number: 3
title: Keep native exotic subclasses identity-only in deepEqual
status: resolved
retired: false
date: 2026-08-02
tags: [deep-equal, javascript, intrinsic-branding]
usage-effect: none
---

**Status:** Resolved

**Date:** 2026-08-02
**Symptom:** Distinct instances of a user-defined subclass of an unsupported native exotic could compare structurally equal instead of remaining identity-only.
**Affected:** `src/deep-equal/deep-equal.mjs:105`; `src/deep-equal/__tests__/deep-equal.test.mjs:60`
**Root cause:** The ordinary-object classifier inspected only the immediate prototype constructor, so a user-defined subclass constructor hid the native exotic prototype farther up the chain. Its broad source-text check could also mistake an ordinary constructor comment containing `[native code]` for an intrinsic.

## Investigation

1. Compared the implementation against the settled unsupported-exotic identity contract; direct ArrayBuffer, DataView, Error, weak collection, and promise instances were covered.
2. Exercised subclasses of ArrayBuffer and Error; both diverged because their immediate constructors are user-defined.
3. Ruled out forgeable `Symbol.toStringTag` dispatch as the cause; intrinsic brand checks correctly reject those impostors.
4. Checked the existing native-source heuristic and found its substring test also rejected ordinary constructor source that merely mentioned `[native code]`.

## Fix

Walk the prototype chain until Object.prototype, rejecting an exact native constructor source at any intermediate prototype. Add behavioral coverage for unsupported exotic subclasses and ordinary constructors containing native-code text.

**Commit:** `cee89a3`