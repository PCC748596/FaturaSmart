export type CardBrand = 'Mastercard' | 'Visa' | 'Elo' | 'American Express' | 'Hipercard' | 'Outra';

export interface CreditCard {
  id: string;
  name: string;
  issuer: string;
  brand: CardBrand;
  last4: string;
  cardHolder: string;
  limitTotal: number;
  color: string;
  secondaryColor?: string;
  closingDay: number; // dia do mês (ex: 15)
  dueDay: number; // dia do mês (ex: 25)
}

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  description: string;
  amount: number;
  category: string;
  subcategory?: string;
  establishment?: string;
  installmentCurrent?: number;
  installmentTotal?: number;
}

export interface Invoice {
  id: string;
  cardId: string;
  issuer: string;
  cardBrand: CardBrand;
  cardLastDigits: string;
  cardHolder: string;
  period: string;
  closingDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  totalAmount: number;
  minimumPayment: number;
  status: 'pending' | 'paid' | 'overdue';
  isProjected?: boolean; // True se for fatura futura gerada por projeção de parcelas
  paidAt?: string;
  pixCode?: string;
  barcode?: string;
  invoiceSummary?: string;
  transactions: Transaction[];
  importedAt: string;
  fileName?: string;
}

export interface DueAlert {
  id: string;
  invoiceId: string;
  cardName: string;
  cardIssuer: string;
  cardColor: string;
  dueDate: string;
  daysRemaining: number;
  status: 'overdue' | 'today' | 'upcoming' | 'paid';
  totalAmount: number;
  barcode?: string;
  pixCode?: string;
}

export interface CategorySummary {
  category: string;
  amount: number;
  percentage: number;
  color: string;
  count: number;
}
