# Contributing to moniq

First off, thank you for considering contributing to `moniq`! We want this project to be welcoming and accessible.

## Project Architecture
`moniq` is a privacy-first, backend-less application built with React, TypeScript, and Vite. We do not use a centralized database. Instead, user data is synced securely to their own Google Drive (via Google Sheets API).

Please read our [Product Vision](docs/product_vision.md) and [Architecture](docs/architecture.md) documentation before proposing structural changes.

## Development Setup
1. Fork and clone the repository.
2. Run `npm install`
3. Copy `.env.example` to `.env` and add your Google OAuth Client ID.
4. Run `npm run dev` to start the local development server.

## Pull Request Process
1. Ensure your code strictly adheres to the [Design System](docs/design_system.md).
2. Create a clean branch (`feat/your-feature` or `fix/issue-description`).
3. Run `npm run build` locally to verify there are absolutely no TypeScript compilation errors.
4. Open a Pull Request referencing the issue you are fixing or the feature you are adding from our [Roadmap](docs/roadmap.md).
