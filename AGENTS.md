# Agent guidance

This file applies to the whole repository. Before starting any work, especially adding features or editing existing code, read [CONTRIBUTING.md](CONTRIBUTING.md) for the project architecture, coding conventions, development setup, testing guidance, and pull request process.

- Read [docs/product_vision.md](docs/product_vision.md) to understand the product's scope and principles.
- Read [docs/design_system.md](docs/design_system.md) before making structural or visual changes.
- Use subtle, purposeful micro-motion to make meaningful UI state changes such as expanding, collapsing, and selecting feel clear and comfortable. Follow the motion patterns in the design system and respect reduced-motion preferences; avoid motion that adds delay without improving feedback.
- Preserve the local-first data model and Google Sheets sync behavior when changing persistence.
- Update relevant files in `docs/` when a change affects their guidance or described behavior.
- Before implementing a feature or fix, identify the existing components and user-facing features it will touch. Review their entries in `docs/testing/e2e-feature-inventory.md`, `docs/testing/feature-coverage.md`, and the relevant case documents. Also identify test cases for every new behavior being planned; add missing inventory entries and planned cases before or alongside implementation.
- The testing documents contain a larger backlog of uncovered cases than should be tackled in one project-wide effort. Close that backlog incrementally as feature work reaches each area; do not attempt to implement every documented gap in one go.
- After implementation, review the planned cases for both the new behavior and all touched existing features. Implement applicable missing unit, component, or browser tests as part of the change where practical; do not leave a related planned case unimplemented just because it predates the change. Update the matrix with actual test evidence and status. Leave a gap documented only when it is outside the change's scope or cannot reasonably be tested, and explain why.
- After every meaningful implementation, update the existing `[Unreleased]` section of [docs/CHANGELOG.md](docs/CHANGELOG.md). Group related changes into one cohesive entry that describes the final outcome.
- Only bump the version and finalize `[Unreleased]` when explicitly requested or when a significant milestone is reached. Use `npm version patch|minor|major` as appropriate.
- Use Conventional Commits for commit messages, such as `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, `perf:`, or `style:`.
