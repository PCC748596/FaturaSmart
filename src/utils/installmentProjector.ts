import { Invoice, CreditCard, Transaction } from '../types';
import { normalizeMainCategory, extractEstablishment } from './taxonomy';

export interface ProjectedInstallmentItem {
  id: string;
  parentTransactionId: string;
  originalDescription: string;
  establishment: string;
  category: string;
  amount: number;
  projectedCurrent: number;
  totalInstallments: number;
  dueDate: string;
  monthKey: string;
  periodName: string;
  cardId: string;
  cardName: string;
  cardColor: string;
}

export interface ProjectedMonthSummary {
  monthKey: string; // YYYY-MM
  periodName: string; // e.g. "Fevereiro 2026"
  shortName: string; // e.g. "Fev/26"
  estimatedDueDate: string;
  totalCommittedAmount: number;
  installmentsCount: number;
  items: ProjectedInstallmentItem[];
  byCard: {
    cardId: string;
    cardName: string;
    cardColor: string;
    amount: number;
    count: number;
  }[];
}

const MONTH_NAMES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const MONTH_SHORT_PT = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
];

/**
 * Calculates a future date by adding N months to a reference YYYY-MM-DD
 */
function addMonthsToDate(dateStr: string, monthsToAdd: number): { dateStr: string; monthKey: string; periodName: string; shortName: string } {
  const parts = dateStr.split('-');
  let year = parseInt(parts[0], 10);
  let monthIndex = parseInt(parts[1], 10) - 1; // 0-based
  const day = parts[2] || '10';

  monthIndex += monthsToAdd;
  year += Math.floor(monthIndex / 12);
  monthIndex = ((monthIndex % 12) + 12) % 12;

  const monthFormatted = String(monthIndex + 1).padStart(2, '0');
  const monthKey = `${year}-${monthFormatted}`;
  const periodName = `${MONTH_NAMES_PT[monthIndex]} ${year}`;
  const shortName = `${MONTH_SHORT_PT[monthIndex]}/${String(year).slice(2)}`;

  // Clamp day for shorter months (e.g. Feb 30 -> Feb 28)
  const maxDays = new Date(year, monthIndex + 1, 0).getDate();
  const clampedDay = String(Math.min(parseInt(day, 10), maxDays)).padStart(2, '0');

  return {
    dateStr: `${year}-${monthFormatted}-${clampedDay}`,
    monthKey,
    periodName,
    shortName
  };
}

/**
 * Computes future installment projections from existing invoices
 */
export function calculateInstallmentProjections(
  invoices: Invoice[],
  cards: CreditCard[]
): ProjectedMonthSummary[] {
  // Only look at genuine (non-projected) invoices to avoid recursive projections
  const realInvoices = invoices.filter(inv => !inv.isProjected);
  const cardMap = new Map(cards.map(c => [c.id, c]));

  // Month-grouped map
  const monthMap: Record<string, {
    periodName: string;
    shortName: string;
    estimatedDueDate: string;
    items: ProjectedInstallmentItem[];
  }> = {};

  realInvoices.forEach(inv => {
    const card = cardMap.get(inv.cardId);
    const baseDueDate = inv.dueDate || `${inv.closingDate.slice(0, 7)}-15`;

    inv.transactions.forEach(t => {
      const cur = t.installmentCurrent || 1;
      const total = t.installmentTotal || 1;

      // Has future installments to be billed?
      if (total > 1 && cur < total) {
        const remaining = total - cur;
        const mainCategory = normalizeMainCategory(t.category, t.description);
        const establishment = t.establishment || extractEstablishment(t.description, mainCategory);

        for (let step = 1; step <= remaining; step++) {
          const projectedCur = cur + step;
          const { dateStr, monthKey, periodName, shortName } = addMonthsToDate(baseDueDate, step);

          if (!monthMap[monthKey]) {
            monthMap[monthKey] = {
              periodName,
              shortName,
              estimatedDueDate: dateStr,
              items: []
            };
          }

          monthMap[monthKey].items.push({
            id: `proj-${t.id || 'tx'}-p${projectedCur}-${monthKey}`,
            parentTransactionId: t.id,
            originalDescription: t.description,
            establishment,
            category: mainCategory,
            amount: t.amount,
            projectedCurrent: projectedCur,
            totalInstallments: total,
            dueDate: dateStr,
            monthKey,
            periodName,
            cardId: inv.cardId,
            cardName: card?.name || inv.issuer,
            cardColor: card?.color || '#6366F1'
          });
        }
      }
    });
  });

  // Convert to sorted array
  const sortedMonths = Object.keys(monthMap).sort().map(monthKey => {
    const data = monthMap[monthKey];
    const totalAmount = data.items.reduce((sum, item) => sum + item.amount, 0);

    // Group items by card
    const cardGroup: Record<string, { cardName: string; cardColor: string; amount: number; count: number }> = {};
    data.items.forEach(item => {
      if (!cardGroup[item.cardId]) {
        cardGroup[item.cardId] = {
          cardName: item.cardName,
          cardColor: item.cardColor,
          amount: 0,
          count: 0
        };
      }
      cardGroup[item.cardId].amount += item.amount;
      cardGroup[item.cardId].count += 1;
    });

    const byCard = Object.entries(cardGroup).map(([cardId, cardData]) => ({
      cardId,
      cardName: cardData.cardName,
      cardColor: cardData.cardColor,
      amount: cardData.amount,
      count: cardData.count
    }));

    return {
      monthKey,
      periodName: data.periodName,
      shortName: data.shortName,
      estimatedDueDate: data.estimatedDueDate,
      totalCommittedAmount: Math.round(totalAmount * 100) / 100,
      installmentsCount: data.items.length,
      items: data.items.sort((a, b) => b.amount - a.amount),
      byCard
    };
  });

  return sortedMonths;
}

/**
 * Builds full projected Invoice objects for future months
 */
export function buildProjectedInvoices(
  invoices: Invoice[],
  cards: CreditCard[]
): Invoice[] {
  const summaries = calculateInstallmentProjections(invoices, cards);
  const cardMap = new Map(cards.map(c => [c.id, c]));
  const realInvoices = invoices.filter(inv => !inv.isProjected);

  const projectedInvoices: Invoice[] = [];

  summaries.forEach(summary => {
    // For each card with installments in this future month
    summary.byCard.forEach(c => {
      const card = cardMap.get(c.cardId);
      const cardItems = summary.items.filter(item => item.cardId === c.cardId);
      const cardTotal = cardItems.reduce((acc, curr) => acc + curr.amount, 0);

      // Check if a real invoice already exists for this card and month
      const alreadyHasRealInvoice = realInvoices.some(
        inv => inv.cardId === c.cardId && (inv.dueDate.slice(0, 7) === summary.monthKey || inv.period === summary.periodName)
      );

      if (alreadyHasRealInvoice) {
        return; // Don't duplicate if user already uploaded real invoice for this month
      }

      const dueDay = card?.dueDay ? String(card.dueDay).padStart(2, '0') : '15';
      const closingDay = card?.closingDay ? String(card.closingDay).padStart(2, '0') : '08';

      const projectedDueDate = `${summary.monthKey}-${dueDay}`;
      const projectedClosingDate = `${summary.monthKey}-${closingDay}`;

      const transactions: Transaction[] = cardItems.map((item, idx) => ({
        id: `tx-proj-${c.cardId}-${summary.monthKey}-${idx + 1}`,
        date: projectedClosingDate,
        description: item.originalDescription,
        amount: item.amount,
        category: item.category,
        installmentCurrent: item.projectedCurrent,
        installmentTotal: item.totalInstallments,
        establishment: item.establishment,
        subcategory: item.establishment
      }));

      projectedInvoices.push({
        id: `inv-projected-${c.cardId}-${summary.monthKey}`,
        cardId: c.cardId,
        issuer: card?.issuer || 'Cartão de Crédito',
        cardBrand: card?.brand || 'Visa',
        cardLastDigits: card?.last4 || '0000',
        cardHolder: card?.cardHolder || 'Titular',
        period: summary.periodName,
        closingDate: projectedClosingDate,
        dueDate: projectedDueDate,
        totalAmount: Math.round(cardTotal * 100) / 100,
        minimumPayment: Math.round(cardTotal * 0.15 * 100) / 100,
        status: 'pending',
        isProjected: true,
        invoiceSummary: `Fatura futura projetada para ${summary.periodName} baseada em ${transactions.length} compras parceladas já contratadas.`,
        transactions,
        importedAt: new Date().toISOString()
      });
    });
  });

  return projectedInvoices;
}
