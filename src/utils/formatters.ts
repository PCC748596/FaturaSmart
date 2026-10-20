export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

export function formatDate(dateString: string): string {
  if (!dateString) return '-';
  // Handles YYYY-MM-DD or ISO strings
  const parts = dateString.split('T')[0].split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateString;
}

export function formatShortDate(dateString: string): string {
  if (!dateString) return '-';
  const parts = dateString.split('T')[0].split('-');
  if (parts.length === 3) {
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const monthIndex = parseInt(parts[1], 10) - 1;
    return `${parts[2]} ${monthNames[monthIndex] || parts[1]}`;
  }
  return dateString;
}

export function calculateDaysRemaining(dueDateStr: string): number {
  if (!dueDateStr) return 0;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const parts = dueDateStr.split('T')[0].split('-');
  if (parts.length !== 3) return 0;

  const due = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  const diffTime = due.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function getDueStatusLabel(daysRemaining: number, isPaid: boolean): {
  label: string;
  badgeClass: string;
  type: 'paid' | 'overdue' | 'today' | 'upcoming';
} {
  if (isPaid) {
    return {
      label: 'Fatura Paga',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
      type: 'paid'
    };
  }

  if (daysRemaining < 0) {
    const pastDays = Math.abs(daysRemaining);
    return {
      label: `Venceu há ${pastDays} ${pastDays === 1 ? 'dia' : 'dias'}`,
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800 font-semibold animate-pulse',
      type: 'overdue'
    };
  }

  if (daysRemaining === 0) {
    return {
      label: 'Vence Hoje!',
      badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/80 dark:text-amber-200 dark:border-amber-700 font-bold',
      type: 'today'
    };
  }

  if (daysRemaining === 1) {
    return {
      label: 'Vence amanhã',
      badgeClass: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800 font-medium',
      type: 'upcoming'
    };
  }

  return {
    label: `Vence em ${daysRemaining} dias`,
    badgeClass: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800',
    type: 'upcoming'
  };
}

export const CATEGORY_COLORS: Record<string, string> = {
  // Grandes Marketplaces & E-commerce (separação dedicada)
  'Compras Internet': '#8B5CF6', // Roxo Violeta para Compras Internet
  'Mercado Livre': '#EAB308', // Amarelo Dourado Oficial Mercado Livre
  'Amazon': '#F97316', // Laranja Oficial Amazon
  'Shopee': '#EE4D2D', // Coral Avermelhado Oficial Shopee
  'Shein': '#EC4899', // Pink Magenta Oficial Shein
  'Compras & Eletrônicos': '#8B5CF6', // Roxo Violeta para outras compras de eletrônicos/lojas

  // Categorias Essenciais de Consumo
  'Alimentação': '#10B981', // Verde Esmeralda (Supermercados, Feiras, Restaurantes)
  'Transporte': '#3B82F6', // Azul (Uber, Combustível, Pedágio)
  'Serviços & Assinaturas': '#6366F1', // Índigo (Streaming, Telefonia, Softwares)
  'Saúde & Farmácia': '#F43F5E', // Rosa Avermelhado (Farmácias, Planos de Saúde)
  'Lazer & Viagem': '#06B6D4', // Ciano (Passagens, Hotéis, Cinema)
  'Educação & Tecnologia': '#A855F7', // Púrpura (Cursos, Faculdades, Livros)
  'Moradia & Contas': '#14B8A6', // Verde-Água / Teal (Contas, Condomínio, Reformas)
  'Outros': '#64748B' // Ardósia Neutro
};

export function getCategoryColor(category: string): string {
  if (CATEGORY_COLORS[category]) return CATEGORY_COLORS[category];
  
  // Suporte a prefixos como "Compras: Mercado Livre" ou "Compras - Amazon"
  const normalized = category.toLowerCase();
  if (normalized.includes('mercado livre') || normalized.includes('mercadolivre') || normalized.includes('mercado pago')) return '#EAB308';
  if (normalized.includes('amazon')) return '#F97316';
  if (normalized.includes('shopee')) return '#EE4D2D';
  if (normalized.includes('shein')) return '#EC4899';
  if (normalized.includes('compras') || normalized.includes('eletrônico')) return '#8B5CF6';

  return '#64748B';
}

export function downloadCalendarICS(cardName: string, amount: number, dueDate: string, barcode?: string) {
  const parts = dueDate.split('T')[0].split('-');
  if (parts.length !== 3) return;

  const year = parts[0];
  const month = parts[1].padStart(2, '0');
  const day = parts[2].padStart(2, '0');

  const formattedAmount = formatCurrency(amount);
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//FaturaSmart//Gestao de Cartoes//PT',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `DTSTART;VALUE=DATE:${year}${month}${day}`,
    `DTEND;VALUE=DATE:${year}${month}${day}`,
    `SUMMARY:💳 Vencimento Fatura: ${cardName} (${formattedAmount})`,
    `DESCRIPTION:Lembrete de pagamento da fatura do cartão ${cardName}. Valor: ${formattedAmount}. ${barcode ? `Código de barras: ${barcode}` : ''}`,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-PT9H',
    'ACTION:DISPLAY',
    'DESCRIPTION:Lembrete de Vencimento de Fatura de Cartão',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `fatura-${cardName.toLowerCase().replace(/\s+/g, '-')}-${dueDate}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
