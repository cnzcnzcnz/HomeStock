# Stoku! — Household Inventory, Multi-Home Stock & Receipt Manager

**Stoku!** is a responsive web application for tracking household essentials across multiple homes, automating monthly restock lists, scanning grocery receipts with AI Vision, and collaborating with family members in real time.

It is localized for **Indonesian Rupiah (`Rp`)** totals and **`DD-MM-YYYY`** receipt dates, and works both **offline in your browser** (sandbox mode) and **synced in the cloud** with Google Sign-In.

---

## Key Features

- **Dynamic Multi-Home Inventory & Central Hub**
  - Track stock across multiple homes (`Home 1`, `Home 2`, `Home 3`, and any additional homes you create).
  - Click **Manage Homes** to rename existing homes, add new locations dynamically (e.g., *Villa*, *Office Pantry*, *Apartment*), designate which home acts as the **Central Hub**, or remove non-central homes (remaining units automatically return to the Central Hub).
  - Use **Pick from Central** to transfer units from your Central Hub to any branch home, with every transfer recorded in the history ledger.
- **4 Synchronized Views**
  - **Grid View**: Visual item cards with category badges, per-home stock split chips, `+1` / `-1` stock steppers, and quick home-to-home transfers.
  - **Items Table**: Sortable table with `Home Split`, `Target Monthly Stock`, `Current Stock`, and automatic `Restock Qty` calculations.
  - **Shopping List**: Automatically lists every item below its monthly target (`Target Monthly Stock - Current Stock > 0`), with check-off boxes, **Copy List**, **Print**, and one-click restock into your Central Hub.
  - **History & Receipts**: Cumulative KPI summary (`Receipts Scanned`, `Total Spent`, `Total Discounts Saved`, `Items Stocked` in `Rp`), searchable receipt breakdowns, and recent inter-home stock picks.
- **AI Receipt Scanner (`gpt-4o` Vision)**
  - Upload or capture a receipt photo to extract the store name, `DD-MM-YYYY` date, integer `Rp` discounts and totals, purchased quantities, and single-unit prices.
  - Review matched inventory items, choose the destination home (**Receive Into Home**), and increment stock in one click.
- **Instant Offline Mode & Optional Family Cloud Sync**
  - **Offline / Signed-Out**: Works out of the box using local browser storage (`localStorage`) with sample household items preloaded.
  - **Signed-In Family Sync**: Sign in with Google to sync inventory, dynamic home names, receipts, and transfers via Firebase Firestore, and invite family members via email or a 6-character household code.

---

## How to Use Stoku!

1. **Try It Immediately (No Account Needed)**
   - Open the app and browse the sample pantry items in **Grid View** or **Items Table**.
   - Use `+` / `-` buttons to adjust stock, or open **Shopping List** to see items needing restock.
2. **Customize Your Homes**
   - Click **Manage Homes** in the home filter bar to rename `Home 1`, `Home 2`, `Home 3`, add new homes, or change which home is your **Central Hub**.
   - Click **Pick from [Central Home]** whenever you move stock from your central pantry to another home.
3. **Scan a Shopping Receipt**
   - Click **Scan Receipt** in the top navigation bar.
   - Click **Model & Key** to paste your OpenAI API key (`sk-...`) if it isn't configured via environment variables.
   - Upload a receipt photo, review the extracted items and destination home, and click **Confirm & Increment Stock in Database**.
4. **Collaborate with Family (Optional)**
   - Click **Login** in the top-right corner to sign in with Google.
   - Click **Family** to share your household invite code or send an email invite so everyone in your household stays in sync.

---

## Running Locally

### Prerequisites
- **Node.js** (v18+ or v20+) and **npm**

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Development Server
```bash
npm run dev
```
Open `http://localhost:3000` in your browser. The app works immediately in local offline mode with no additional setup required.

---

## Optional Configuration

### A. AI Receipt Scanner (OpenAI API Key)
You can provide your OpenAI API key in either of two ways:
1. **In the App (Recommended for quick use):** Open **Scan Receipt → Model & Key**, select a model (`gpt-4o` default), paste your OpenAI key, and click **Save Settings**. It is stored locally in your browser.
2. **Via Environment File:** Copy `.env.example` to `.env.local` and set:
   ```env
   VITE_OPENAI_API_KEY="your-openai-api-key"
   ```

### B. Cloud Sync & Family Sharing (Firebase)
To enable Google Sign-In and shared Firestore synchronization across devices:
1. Create a Firebase project with **Authentication** (Google provider enabled) and **Cloud Firestore**.
2. Copy `.env.example` to `.env.local` and populate the `VITE_FIREBASE_*` variables (or copy `firebase-applet-config.example.json` to `firebase-applet-config.json` with your Firebase config).
3. Deploy the included security rules (`firestore.rules`) to your Firestore database.

> **Security Note:** `.env.local` and `firebase-applet-config.json` are excluded in `.gitignore` so personal credentials are not committed to Git.

---

## Useful Commands

| Command | Description |
| :--- | :--- |
| `npm run dev` | Start the local development server on port `3000` |
| `npm run build` | Build the production bundle into `dist/` |
| `npm run lint` | Run TypeScript typechecking (`tsc --noEmit`) |
| `npx --yes tsx --test src/utils/inventory.test.ts` | Run the automated inventory & receipt math test suite |

---

## Documentation

For detailed technical architecture, data models, Firestore security rules, and the change log, see [`DESIGN_SPEC.md`](./DESIGN_SPEC.md).
