<div align="center">

<h1 style="border-bottom: none;">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="public/moniq-wordmark.svg">
    <source media="(prefers-color-scheme: light)" srcset="public/moniq-wordmark-dark.svg">
    <img src="public/moniq-wordmark.svg" alt="moniq" width="360">
  </picture>
</h1>

**A free, privacy-first personal finance tracker with manual transaction entry and a double-entry ledger — your data syncs only to your own Google Drive, never to a third-party server.**

[![CI](https://github.com/MakersCircle/moniq/actions/workflows/ci.yml/badge.svg)](https://github.com/MakersCircle/moniq/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/MakersCircle/moniq?style=social)](https://github.com/MakersCircle/moniq)

**[Try moniq →](https://moniq.donsabu.com)**

</div>

---

Most personal finance apps ask you to hand your bank credentials to a stranger's server, then guess (often wrong) at how to categorize your spending. moniq does neither. It's a web-based expense and budget tracker that writes straight to a spreadsheet inside *your own* Google Drive — no bank-account linking, no centralized database, no subscription. You enter transactions by hand, and a real double-entry accounting ledger runs quietly underneath a simple, fast UI.

## Why moniq

- **Your Drive is the database.** moniq provisions one spreadsheet inside a `moniq/` folder in your Google Drive and syncs to it. Uninstall the app and your transaction history is still just a spreadsheet you own — nothing to export, nothing held hostage.
- **Manual entry, on purpose.** No auto-categorization silently miscategorizing a purchase. You decide what each expense or income entry means, which is what actually builds financial awareness.
- **A real ledger, not a glorified list.** Every entry is balanced double-entry bookkeeping — debits and credits — while the UI just asks "income, expense, or transfer?"
- **Fully custom taxonomy.** No preset "banking app" categories. Define your own accounts, payment methods, and budget categories from scratch.
- **Local-first and fast.** Data lives in IndexedDB first; sync to Google Sheets happens quietly in the background. Installable as a PWA, works offline.

## Quickstart

```bash
git clone https://github.com/MakersCircle/moniq.git
cd moniq
npm install
cp .env.example .env   # add your own Google OAuth Client ID
npm run dev
```

New to the project? See [CONTRIBUTING.md](CONTRIBUTING.md) for the full Google Cloud Console setup and coding standards.

Just want to see it working? **[moniq.donsabu.com](https://moniq.donsabu.com)** has a "try demo mode" option — no Google sign-in required.

## Learn more

| | |
|---|---|
| [Product Vision](docs/product_vision.md) | The philosophy behind manual entry, privacy, and customization |
| [Design System](docs/design_system.md) | Colors, typography, and component conventions |
| [Changelog](docs/CHANGELOG.md) | What's shipped, version by version |

## Contributing

Bug reports, feature ideas, and pull requests are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md) to get set up.

## License

MIT — see [LICENSE](LICENSE).
