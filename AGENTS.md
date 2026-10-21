# Agent guidance

This file applies to the whole repository. Before starting any work, especially adding features or editing existing code, read [CONTRIBUTING.md](CONTRIBUTING.md) for the project architecture, coding conventions, development setup, testing guidance, and pull request process.

- Read [docs/product_vision.md](docs/product_vision.md) to understand the product's scope and principles.
- Read [docs/design_system.md](docs/design_system.md) before making structural or visual changes.
- Use subtle, purposeful micro-motion to make meaningful UI state changes such as expanding, collapsing, and selecting feel clear and comfortable. Follow the motion patterns in the design system and respect reduced-motion preferences; avoid motion that adds delay without improving feedback.
- Preserve the local-first data model and Google Sheets sync behavior when changing persistence.
- Update relevant files in `docs/` when a change affects their guidance or described behavior.
- When changing a feature or component, review its planned cases in `docs/testing/`. Add the relevant small, focused unit, component, or browser tests alongside the implementation when practical; update the feature-to-test matrix and case document, and record any larger remaining cases as gaps to pick up later.
- After every meaningful implementation, update the existing `[Unreleased]` section of [docs/CHANGELOG.md](docs/CHANGELOG.md). Group related changes into one cohesive entry that describes the final outcome.
- Only bump the version and finalize `[Unreleased]` when explicitly requested or when a significant milestone is reached. Use `npm version patch|minor|major` as appropriate.
- Use Conventional Commits for commit messages, such as `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, `perf:`, or `style:`.
