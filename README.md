# 🪙 moniq

A **privacy-first, manual-entry personal finance tracker** that lives entirely in your browser and syncs securely to your own Google Drive. No centralized database, no bank API scraping, and absolute control over your financial typography.

![Moniq Dashboard](docs/assets/banner.png) <!-- Update this path once a banner is created -->

## 🌟 Why moniq?

Traditional finance apps try to do too much: they scrape your bank credentials, attempt to auto-categorize your spending (and usually fail), and lock your data into their proprietary, centralized databases.

Moniq is different:
- **Zero Lock-in**: Your data acts as your backend. Moniq creates a clean Google Sheet inside a `moniq` folder in your private Google Drive and securely syncs your JSON ledger there.
- **Manual > Automated**: Build financial awareness by manually logging income, expenses, and transfers exactly how you want.
- **Limitless Customization**: No hardcoded banks. Create your ultimate taxonomy of custom Accounts (Sources), Payment Methods, and Category Heads.
- **Blazing Fast**: Because logic runs locally via `zustand` and `indexedDB`, the app is instantaneous. It silently writes to Google Sheets in the background so you never see a loading spinner.

## 🚀 Getting Started

To run `moniq` locally on your machine:

### Prerequisites
1. Node.js (v18+)
2. A Google Cloud Platform account (to generate an OAuth Client ID).

### 1. Google OAuth Setup
1. Go to your [Google Cloud Console](https://console.cloud.google.com).
2. Create a project and enable the **Google Sheets API** and **Google Drive API**.
3. Under **Credentials**, create an **OAuth 2.0 Web Application Client ID**.
4. Set the Authorized JavaScript Origins to `http://localhost:5174` (or your deployment URL).
5. Copy the Client ID.

### 2. Local Installation
```bash
git clone https://github.com/YOUR_USERNAME/moniq.git
cd moniq
npm install
```

### 3. Environment Variables
Copy the example environment file and insert your Google Client ID:
```bash
cp .env.example .env
```
Open `.env` and set `VITE_GOOGLE_CLIENT_ID=your-client-id`.

### 4. Run the App
```bash
npm run dev
```

Visit `http://localhost:5174`. Log in with your Google account, and `moniq` will automatically provision your database inside your Google Drive!

## 📚 Documentation
For detailed insights into how this software was designed:
- [Product Vision](docs/product_vision.md)
- [Architecture & DB Schema](docs/architecture.md)
- [Design System](docs/design_system.md)
- [Future Roadmap](docs/roadmap.md)

## 🤝 Contributing
Contributions, issues, and feature requests are welcome! See our [Contributing Guide](CONTRIBUTING.md) to get started.

## 📄 License
This codebase is MIT Licensed. See [LICENSE](LICENSE) for details.
