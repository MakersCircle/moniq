---
trigger: always_on
---

Consult `docs/product_vision.md` to understand the ideology and scope of this product.

Review `docs/design_system.md` before making structural or aesthetic changes.

If a particular change is important enough, update all docs/* accordingly.

After every meaningful implementation, update the existing `[Unreleased]` section of `docs/CHANGELOG.md`; group related iterations, fixes, and tweaks into a single cohesive entry instead of creating duplicates, and describe the final outcome rather than the implementation process. Only bump the version and finalize `[Unreleased]` when explicitly requested or when a significant milestone is reached, using `npm version patch|minor|major` as appropriate.

Only use the **Conventional Commits** format for all commit messages (e.g., `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, `perf:`, `style:`) to ensure clarity and support automated tools.
