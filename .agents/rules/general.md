---
trigger: always_on
---

Consult `docs/product_vision.md` to understand the ideology and scope of this product.

Review `docs/architecture.md` and `docs/design_system.md` before making structural or aesthetic changes.

After completing feature implementations, check `docs/roadmap.md` and update it accordingly.

If a particular change is important enough, update all docs/* accordingly.

Document all changes in the `[Unreleased]` section of `docs/CHANGELOG.md` immediately after implementation. Bump the project version in `package.json` and finalize the changelog version only when a significant set of changes or a key milestone has been reached.

Use the **Conventional Commits** format for all commit messages (e.g., `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, `perf:`, `style:`) to ensure clarity and support automated tools.