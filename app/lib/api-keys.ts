export interface ApiKeyEntry {
  id: string;
  label: string;
  key: string;
  addedAt: number;
}

export type KeyStore = Record<string, ApiKeyEntry[]>;

export const STORAGE_KEY = "provider_api_keys";

export const PROVIDERS = [
  {
    id: "groq",
    name: "Groq",
    color: "#f59e0b",
    desc: "LLaMA 3, Qwen, Gemma models",
    placeholder: "gsk_...",
    hint: "Get your free API key at",
    url: "https://console.groq.com/keys",
    urlLabel: "console.groq.com → API Keys",
  },
  {
    id: "google",
    name: "Google AI",
    color: "#4285f4",
    desc: "Gemini 2.5 Flash & Pro",
    placeholder: "AIza...",
    hint: "Get your free API key at",
    url: "https://aistudio.google.com/app/apikey",
    urlLabel: "aistudio.google.com → Get API Key",
  },
];

export function loadKeys(): KeyStore {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}"); } catch { return {}; }
}

export function saveKeys(store: KeyStore) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function maskKey(key: string): string {
  if (key.length <= 8) return "••••••••";
  return key.slice(0, 4) + "•".repeat(Math.min(key.length - 8, 8)) + key.slice(-4);
}
