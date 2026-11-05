import OpenAI from 'openai';
import { Item, ReceiptItemMatched, ShoppingReceiptRecord } from '../types/inventory';

const OPENAI_STORAGE_KEY = 'homestock_openai_api_key_v1';
const OPENAI_MODEL_KEY = 'homestock_openai_model_v1';

export const SUPPORTED_MODELS = [
  { id: 'gpt-5-nano', name: 'GPT-5 Nano (Ultra-fast & economical)' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini (Compact & responsive)' },
  { id: 'gpt-4o', name: 'GPT-4o (High precision)' }
];

export function getStoredOpenAIApiKey(): string {
  if (typeof window === 'undefined') return '';
  const fromStorage = localStorage.getItem(OPENAI_STORAGE_KEY) || '';
  if (fromStorage) return fromStorage.trim();
  const fromEnv = (import.meta.env.VITE_OPENAI_API_KEY as string) || '';
  return fromEnv.trim();
}

export function saveStoredOpenAIApiKey(key: string): void {
  if (typeof window === 'undefined') return;
  if (!key.trim()) {
    localStorage.removeItem(OPENAI_STORAGE_KEY);
  } else {
    localStorage.setItem(OPENAI_STORAGE_KEY, key.trim());
  }
}

export function getStoredOpenAIModel(): string {
  if (typeof window === 'undefined') return 'gpt-5-nano';
  return localStorage.getItem(OPENAI_MODEL_KEY) || 'gpt-5-nano';
}

export function saveStoredOpenAIModel(modelId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(OPENAI_MODEL_KEY, modelId);
}

export interface ReceiptScanResult {
  storeName: string;
  purchaseDate: string; // Formatted strictly as DD-MM-YYYY
  rawReceiptDate?: string; // What was actually printed on receipt, e.g. 28.10.26
  discountAmount: number;
  totalSpent: number;
  currency: string;
  notes: string;
  detectedItems: Array<{
    name: string;
    quantity: number;
    price?: number;
    categorySuggestion?: string;
  }>;
}

/**
 * Formats numeric amounts into Indonesian Rupiah (e.g. 45000 -> "Rp 45.000")
 */
export function formatRupiah(amount: number | undefined | null): string {
  const val = Math.round(Number(amount) || 0);
  return `Rp ${val.toLocaleString('id-ID')}`;
}

/**
 * Robust date parser and formatter that strictly normalizes any receipt date
 * (especially DD.MM.YY such as "28.10.26" or "28.10.2026") into DD-MM-YYYY ("28-10-2026")
 */
export function normalizeReceiptDateToDDMMYYYY(inputDate: string): string {
  if (!inputDate || !inputDate.trim()) {
    const today = new Date();
    const d = String(today.getDate()).padStart(2, '0');
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const y = today.getFullYear();
    return `${d}-${m}-${y}`;
  }

  const clean = inputDate.trim();

  // Pattern 1: dd.mm.yy or dd.mm.yyyy or dd/mm/yy or dd-mm-yy
  const dotSlashDashMatch = clean.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})$/);
  if (dotSlashDashMatch) {
    const p1 = Number(dotSlashDashMatch[1]);
    const p2 = Number(dotSlashDashMatch[2]);
    let yr = Number(dotSlashDashMatch[3]);

    if (yr < 100) {
      yr = 2000 + yr; // e.g. '26' becomes 2026
    }

    // Usually receipts format is Day.Month.Year: "28.10.26" -> Day=28, Month=10, Year=2026
    let day = p1;
    let month = p2;

    // If first number is <= 12 and second number is > 12, then it was mm/dd/yy
    if (p1 <= 12 && p2 > 12) {
      month = p1;
      day = p2;
    }

    const dStr = String(day).padStart(2, '0');
    const mStr = String(month).padStart(2, '0');
    return `${dStr}-${mStr}-${yr}`;
  }

  // Pattern 2: yyyy-mm-dd or yyyy.mm.dd (ISO format)
  const isoMatch = clean.match(/^(\d{4})[.\/-](\d{1,2})[.\/-](\d{1,2})$/);
  if (isoMatch) {
    const yr = isoMatch[1];
    const mStr = String(Number(isoMatch[2])).padStart(2, '0');
    const dStr = String(Number(isoMatch[3])).padStart(2, '0');
    return `${dStr}-${mStr}-${yr}`;
  }

  // Fallback: try Date.parse
  const parsed = new Date(clean);
  if (!isNaN(parsed.getTime())) {
    const d = String(parsed.getDate()).padStart(2, '0');
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const y = parsed.getFullYear();
    return `${d}-${m}-${y}`;
  }

  return clean;
}

/**
 * Call OpenAI (gpt-5-nano with automatic fallbacks) to extract structured receipt data
 */
export async function parseReceiptWithOpenAI(
  imageBase64: string,
  apiKey: string,
  existingItems: Item[],
  preferredModel: string = 'gpt-5-nano'
): Promise<ReceiptScanResult> {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('Please enter your OpenAI API key in the Receipt Scanner settings.');
  }

  const openai = new OpenAI({
    apiKey: apiKey.trim(),
    dangerouslyAllowBrowser: true // Client-side SPA execution
  });

  const knownInventoryNames = existingItems.map(i => i.itemName).join(', ');

  const systemPrompt = `You are an expert shopping receipt parsing AI.
Your job is to read images of shopping receipts and output strictly valid JSON matching this schema:
{
  "storeName": "Name of the store / supermarket (e.g. Indomaret, Alfamart, Superindo, Hypermart, Hero, Grand Lucky)",
  "purchaseDate": "DD-MM-YYYY format strictly (e.g. if the receipt says 28.10.26 or 28/10/26, the output MUST be '28-10-2026')",
  "rawReceiptDate": "Exact date string printed on receipt, e.g. '28.10.26'",
  "discountAmount": 0 (integer number in Rupiah, total savings/discounts/potongan deducted, e.g. 5000),
  "totalSpent": 0 (integer number in Rupiah, final total amount charged/bayar/total belanja, e.g. 45000),
  "currency": "Rp",
  "notes": "Brief summary of the shopping trip",
  "detectedItems": [
    {
      "name": "Standardized clean item name",
      "quantity": 1 (integer >= 1),
      "price": 0 (integer number in Rupiah per item or subtotal, e.g. 15000),
      "categorySuggestion": "Pantry & Groceries | Beverages & Coffee | Household & Cleaning | Paper Goods & Wraps | Personal Care & Bath | Health & First Aid | Pet Supplies | General Supplies"
    }
  ]
}

CRITICAL CURRENCY INSTRUCTIONS (INDONESIAN RUPIAH):
1. Currency is strictly Indonesian Rupiah (IDR / Rp).
2. Indonesian receipts use dots/periods as THOUSAND separators (e.g. '25.000' means 25000 Rupiah, NOT 25.00; '150.000' means 150000 Rupiah).
3. Always parse totalSpent, discountAmount, and prices as whole integer numbers in Rupiah without decimals (e.g. 25000, 150000, 4500).
4. Output "currency": "Rp".

CRITICAL DATE FORMAT INSTRUCTIONS:
1. The receipt printed date uses DD.MM.YY or DD.MM.YYYY format (day first, month second, year last).
   Example: If the receipt prints "28.10.26", this means 28 October 2026!
   Never flip day and month.
   If the two-digit year is "26", it is the year 2026 (NOT 2023).
   Output purchaseDate strictly formatted as: DD-MM-YYYY (e.g. "28-10-2026").
2. Extract every purchased item. Clean up abbreviated cashier labels.
3. Current database items: [${knownInventoryNames}].
4. Output ONLY pure raw JSON with no markdown wrapping and no code blocks.`;

  const formattedImageUrl = imageBase64.startsWith('data:')
    ? imageBase64
    : `data:image/jpeg;base64,${imageBase64}`;

  // Models to attempt: user's preferred model (default gpt-5-nano), then fallback to gpt-4o-mini, then gpt-4o
  const modelsToTry = Array.from(new Set([preferredModel, 'gpt-5-nano', 'gpt-4o-mini', 'gpt-4o']));

  let lastError: any = null;
  let rawText = '';

  for (const modelCandidate of modelsToTry) {
    try {
      const response = await openai.chat.completions.create({
        model: modelCandidate,
        temperature: 0.1,
        max_tokens: 2000,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract the store name, receipt date (format DD-MM-YYYY), discounts, total spent, and purchased items with quantities.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: formattedImageUrl,
                  detail: 'high'
                }
              }
            ]
          }
        ]
      });

      rawText = response.choices[0]?.message?.content?.trim() || '';
      if (rawText) {
        break; // Successfully got response
      }
    } catch (err: any) {
      lastError = err;
      console.warn(`Model ${modelCandidate} attempt notice:`, err?.message || err);
      // If error is invalid API key or quota exceeded, stop trying further models
      if (err?.status === 401 || err?.status === 429) {
        throw err;
      }
    }
  }

  if (!rawText) {
    throw lastError || new Error('No response received from OpenAI model.');
  }

  // Sanitize potential markdown block fences
  const jsonCleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();

  let parsed: any;
  try {
    parsed = JSON.parse(jsonCleaned);
  } catch (err) {
    console.error('Failed to parse OpenAI JSON output:', rawText);
    throw new Error('OpenAI returned invalid JSON format. Please try scanning again with clearer lighting.');
  }

  // Parse and normalize the date to guaranteed DD-MM-YYYY
  const normalizedDate = normalizeReceiptDateToDDMMYYYY(parsed.purchaseDate || parsed.rawReceiptDate || '');

  return {
    storeName: String(parsed.storeName || 'Grocery Store').trim(),
    purchaseDate: normalizedDate,
    rawReceiptDate: String(parsed.rawReceiptDate || '').trim(),
    discountAmount: Math.max(0, Math.round(Number(parsed.discountAmount) || 0)),
    totalSpent: Math.max(0, Math.round(Number(parsed.totalSpent) || 0)),
    currency: String(parsed.currency || 'Rp').trim() || 'Rp',
    notes: String(parsed.notes || '').trim(),
    detectedItems: Array.isArray(parsed.detectedItems)
      ? parsed.detectedItems.map((it: any) => ({
          name: String(it.name || 'Item').trim(),
          quantity: Math.max(1, Math.round(Number(it.quantity) || 1)),
          price: Math.max(0, Math.round(Number(it.price) || 0)),
          categorySuggestion: it.categorySuggestion || 'General Supplies'
        }))
      : []
  };
}

/**
 * Fuzzy matching helper between a receipt item name and existing inventory items
 */
export function matchReceiptItemToInventory(
  detectedName: string,
  existingItems: Item[]
): { matchedItem: Item | null; confidence: number } {
  const normDetected = detectedName.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();
  const detectedTokens = normDetected.split(/\s+/).filter(t => t.length > 2);

  let bestMatch: Item | null = null;
  let bestScore = 0;

  for (const item of existingItems) {
    const normItem = item.itemName.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();

    // Exact or direct inclusion match
    if (normItem === normDetected) {
      return { matchedItem: item, confidence: 1.0 };
    }
    if (normItem.includes(normDetected) || normDetected.includes(normItem)) {
      const score = 0.85;
      if (score > bestScore) {
        bestScore = score;
        bestMatch = item;
      }
    }

    // Token overlap match
    const itemTokens = normItem.split(/\s+/).filter(t => t.length > 2);
    if (detectedTokens.length > 0 && itemTokens.length > 0) {
      let matchingTokenCount = 0;
      for (const token of detectedTokens) {
        if (itemTokens.some(it => it.includes(token) || token.includes(it))) {
          matchingTokenCount++;
        }
      }
      const tokenScore = matchingTokenCount / Math.max(detectedTokens.length, itemTokens.length);
      if (tokenScore > bestScore && tokenScore >= 0.4) {
        bestScore = tokenScore;
        bestMatch = item;
      }
    }
  }

  return {
    matchedItem: bestScore >= 0.4 ? bestMatch : null,
    confidence: bestScore
  };
}
