import { CreditCard, Invoice } from '../types';

// Zero fictitious data: all cards and invoices will be created from imported invoices
export const INITIAL_CARDS: CreditCard[] = [];

export const INITIAL_INVOICES: Invoice[] = [];

export const STORAGE_KEYS = {
  CARDS: 'faturasmart_cards_v2',
  INVOICES: 'faturasmart_invoices_v2',
  NOTIFS: 'faturasmart_notif_pref_v2'
};

export function loadStoredCards(): CreditCard[] {
  try {
    // Clear legacy v1 mock data if present
    localStorage.removeItem('faturasmart_cards_v1');
    const raw = localStorage.getItem(STORAGE_KEYS.CARDS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse stored cards', e);
  }
  return INITIAL_CARDS;
}

export function saveStoredCards(cards: CreditCard[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.CARDS, JSON.stringify(cards));
  } catch (e) {
    console.error('Failed to save cards', e);
  }
}

export function loadStoredInvoices(): Invoice[] {
  try {
    // Clear legacy v1 mock data if present
    localStorage.removeItem('faturasmart_invoices_v1');
    const raw = localStorage.getItem(STORAGE_KEYS.INVOICES);
    if (raw) {
      const parsed: Invoice[] = JSON.parse(raw);
      // Ensure all transactions across all invoices have guaranteed globally unique IDs
      return parsed.map((inv, invIdx) => ({
        ...inv,
        transactions: (inv.transactions || []).map((tx, txIdx) => ({
          ...tx,
          id: `tx-${inv.id || invIdx}-${txIdx}`
        }))
      }));
    }
  } catch (e) {
    console.error('Failed to parse stored invoices', e);
  }
  return INITIAL_INVOICES;
}

export function saveStoredInvoices(invoices: Invoice[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));
  } catch (e) {
    console.error('Failed to save invoices', e);
  }
}

export function clearAllStoredData() {
  try {
    localStorage.removeItem(STORAGE_KEYS.CARDS);
    localStorage.removeItem(STORAGE_KEYS.INVOICES);
    localStorage.removeItem('faturasmart_cards_v1');
    localStorage.removeItem('faturasmart_invoices_v1');
  } catch (e) {
    console.error('Failed to clear storage', e);
  }
}
