# Receipt Budget Assistant

[Live Demo on Vercel](https://hackathon-receipt.vercel.app/)

A smart, AI-powered web app to help you track spending, manage budgets, and get actionable insights from your receipts. Upload or photograph your receipts, and let Budgie (your mascot assistant) extract, categorize, and analyze your spending with the help of Google Cloud Vision, Anthropic AI, and Supabase.

---

## Features

- **Receipt OCR**: Upload images or take photos of receipts. Extracts text and itemizes purchases using Google Cloud Vision API.
- **Manual Entry**: Add spending items manually if you don't have a receipt.
- **Automatic Categorization**: Items are categorized for you, and you can adjust them as needed.
- **Budget Management**: Set, update, and track budgets for each category. Visualize your progress.
- **Spending Dashboard**: See your spending breakdown by category, with interactive charts and details.
- **AI-Powered Insights**: Get personalized, actionable budgeting tips from Budgie, powered by Anthropic AI.
- **Authentication**: Sign up or sign in with email/password or GitHub (via Supabase).

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/receipt-budget-app.git
cd receipt-budget-app
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env` file in the root directory with the following variables:

```env
# Google Cloud Vision API Key
GOOGLE_CLOUD_VISION_API_KEY=your_google_cloud_vision_api_key_here

# Anthropic API Key (for AI analysis)
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Supabase Configuration
REACT_APP_SUPABASE_URL=your_supabase_url_here
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

See [SETUP.md](SETUP.md) for detailed instructions on obtaining these keys.

### 4. Start the development server

```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Usage

1. **Sign up or sign in** (email/password or GitHub).
2. **Upload a receipt image** or take a photo. The app will extract and categorize items.
3. **Review and adjust** the extracted data as needed.
4. **Set budgets** for your categories and track your progress.
5. **View your dashboard** for a breakdown of spending and budgets.
6. **Get AI-powered tips** from Budgie to help you save and spend smarter.

---

## Tech Stack

- React
- Supabase (auth & database)
- Google Cloud Vision API (OCR)
- Anthropic AI (Claude)
- Chart.js (visualizations)

---

## Security Notes

- **Never commit your `.env` file** to version control.
- Restrict your API keys to specific domains/IPs when possible.
- Monitor your API usage to avoid unexpected charges.

---

## Troubleshooting

- See [SETUP.md](SETUP.md) for common issues and solutions.
- Check your environment variables and API key permissions.
- Review the browser console for errors.

---

## License

MIT
