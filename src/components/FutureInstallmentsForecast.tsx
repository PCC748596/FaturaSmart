import React, { useState, useMemo } from 'react';
import {
  CalendarRange,
  Clock,
  TrendingDown,
  ArrowRight,
  CreditCard as CardIcon,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ChevronDown,
  Layers,
  Sparkles,
  ShoppingBag
} from 'lucide-react';
import { Invoice, CreditCard } from '../types';
import { formatCurrency, formatDate, getCategoryColor } from '../utils/formatters';
import {
  calculateInstallmentProjections,
  buildProjectedInvoices,
  ProjectedMonthSummary
} from '../utils/installmentProjector';

interface FutureInstallmentsForecastProps {
  invoices: Invoice[];
  cards: CreditCard[];
  onApplyProjectedInvoices?: (projectedInvoices: Invoice[]) => void;
  onRemoveProjectedInvoices?: () => void;
}

export const FutureInstallmentsForecast: React.FC<FutureInstallmentsForecastProps> = ({
  invoices,
  cards,
  onApplyProjectedInvoices,
  onRemoveProjectedInvoices
}) => {
  const [selectedCardId, setSelectedCardId] = useState<string>('all');
  const [activeMonthKey, setActiveMonthKey] = useState<string | null>(null);

  // Check if projected invoices are currently incorporated in the system
  const hasProjectedInvoicesInState = useMemo(() => {
    return invoices.some(inv => inv.isProjected);
  }, [invoices]);

  // Compute projections
  const monthlyProjections = useMemo(() => {
    return calculateInstallmentProjections(invoices, cards);
  }, [invoices, cards]);

  // Filter projections by card if selected
  const filteredProjections = useMemo(() => {
    if (selectedCardId === 'all') return monthlyProjections;

    return monthlyProjections
      .map(month => {
        const matchingItems = month.items.filter(item => item.cardId === selectedCardId);
        const cardTotal = matchingItems.reduce((acc, curr) => acc + curr.amount, 0);

        return {
          ...month,
          totalCommittedAmount: Math.round(cardTotal * 100) / 100,
          installmentsCount: matchingItems.length,
          items: matchingItems,
          byCard: month.byCard.filter(c => c.cardId === selectedCardId)
        };
      })
      .filter(month => month.installmentsCount > 0);
  }, [monthlyProjections, selectedCardId]);

  // Overall totals across the entire projection horizon
  const grandTotalFutureCommitted = useMemo(() => {
    return filteredProjections.reduce((sum, m) => sum + m.totalCommittedAmount, 0);
  }, [filteredProjections]);

  const uniqueActivePurchasesCount = useMemo(() => {
    const parentIds = new Set<string>();
    filteredProjections.forEach(m => {
      m.items.forEach(item => parentIds.add(item.parentTransactionId));
    });
    return parentIds.size;
  }, [filteredProjections]);

  // Set initial active month
  const currentActiveMonth = useMemo(() => {
    if (filteredProjections.length === 0) return null;
    if (activeMonthKey) {
      const found = filteredProjections.find(m => m.monthKey === activeMonthKey);
      if (found) return found;
    }
    return filteredProjections[0];
  }, [filteredProjections, activeMonthKey]);

  // Handler to toggle projected invoices into the real system state
  const handleToggleSystemProjection = () => {
    if (hasProjectedInvoicesInState) {
      if (onRemoveProjectedInvoices) {
        onRemoveProjectedInvoices();
      }
    } else {
      if (onApplyProjectedInvoices) {
        const futureInvoices = buildProjectedInvoices(invoices, cards);
        onApplyProjectedInvoices(futureInvoices);
      }
    }
  };

  if (filteredProjections.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl mb-8 text-center text-slate-400">
        <CalendarRange className="w-10 h-10 text-slate-600 mx-auto mb-2" />
        <h4 className="text-sm font-bold text-slate-200">Nenhum parcelamento ativo detectado</h4>
        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
          As faturas importadas atualmente não contêm compras parceladas com prestações pendentes para os próximos meses.
        </p>
      </div>
    );
  }

  const maxMonthValue = Math.max(...filteredProjections.map(m => m.totalCommittedAmount), 1);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl mb-8">
      
      {/* Header with KPI and System Integration Action */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-violet-600/20 text-violet-400 flex items-center justify-center border border-violet-500/30">
              <CalendarRange className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-bold text-white">
              Projeção de Parcelamentos & Faturas Futuras
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Previsão consolidada mês a mês dos valores já contratados que serão lançados nas próximas faturas.
          </p>
        </div>

        {/* Global Action & Integration Button */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Card filter dropdown */}
          {cards.length > 1 && (
            <select
              value={selectedCardId}
              onChange={e => setSelectedCardId(e.target.value)}
              className="bg-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2 border border-slate-700 focus:outline-none focus:border-indigo-500 font-medium"
            >
              <option value="all">Todos os Cartões</option>
              {cards.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} (•••• {c.last4})
                </option>
              ))}
            </select>
          )}

          {/* Sync Button */}
          <button
            onClick={handleToggleSystemProjection}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 border shadow-sm ${
              hasProjectedInvoicesInState
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/40 hover:bg-rose-500/10 hover:text-rose-300 hover:border-rose-500/40'
                : 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white border-violet-500/40 shadow-indigo-600/20'
            }`}
          >
            {hasProjectedInvoicesInState ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Projeções Ativas nas Faturas (Clique p/ Ocultar)</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Incorporar Faturas Futuras no Sistema</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Top 3 Strategic Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-6">
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            Total Comprometido em Parcelas
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-300">
            {formatCurrency(grandTotalFutureCommitted)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Soma de todas as parcelas restantes já contratadas
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <ShoppingBag className="w-3.5 h-3.5 text-indigo-400" />
            Compras Parceladas Ativas
          </div>
          <div className="text-xl sm:text-2xl font-black text-indigo-300">
            {uniqueActivePurchasesCount} compras
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Desdobradas em {filteredProjections.reduce((acc, curr) => acc + curr.installmentsCount, 0)} prestações futuras
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <CalendarRange className="w-3.5 h-3.5 text-emerald-400" />
            Horizonte de Previsão
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-400">
            {filteredProjections.length} {filteredProjections.length === 1 ? 'mês à frente' : 'meses à frente'}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            De {filteredProjections[0]?.shortName} até {filteredProjections[filteredProjections.length - 1]?.shortName}
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* TIMELINE DE MESES FUTUROS (HORIZONTAL SCROLL)           */}
      {/* ======================================================== */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2.5">
          <span className="font-semibold text-slate-300 flex items-center gap-1">
            <span>📅 Faturas Futuras Programadas</span>
            <span className="text-slate-500 font-normal">(Clique em um mês para detalhar as compras)</span>
          </span>
          <span className="text-[11px] text-slate-500">
            * Curva decrescente natural conforme parcelas são quitadas
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
          {filteredProjections.map(month => {
            const isSelected = currentActiveMonth?.monthKey === month.monthKey;
            const barHeightPct = Math.max(16, Math.round((month.totalCommittedAmount / maxMonthValue) * 100));

            return (
              <button
                key={month.monthKey}
                onClick={() => setActiveMonthKey(month.monthKey)}
                className={`p-3 rounded-2xl text-left transition-all border flex flex-col justify-between relative overflow-hidden group ${
                  isSelected
                    ? 'bg-slate-800 border-indigo-500 shadow-lg shadow-indigo-600/20 ring-1 ring-indigo-500'
                    : 'bg-slate-950/60 hover:bg-slate-800/60 border-slate-800'
                }`}
              >
                {/* Visual mini bar track */}
                <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden mb-2">
                  <div
                    style={{ width: `${barHeightPct}%` }}
                    className={`h-full rounded-full transition-all duration-300 ${
                      isSelected
                        ? 'bg-gradient-to-r from-indigo-500 to-violet-400'
                        : 'bg-slate-600 group-hover:bg-indigo-400'
                    }`}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className={`font-bold ${isSelected ? 'text-indigo-300' : 'text-slate-300'}`}>
                      {month.shortName}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {month.installmentsCount} {month.installmentsCount === 1 ? 'parc.' : 'parc.'}
                    </span>
                  </div>

                  <div className="text-sm font-extrabold text-white font-mono">
                    {formatCurrency(month.totalCommittedAmount)}
                  </div>
                </div>

                <div className="mt-2 pt-1.5 border-t border-slate-800/80 text-[10px] text-slate-500 flex items-center justify-between">
                  <span>Venc: {month.estimatedDueDate.split('-')[2]}/{month.estimatedDueDate.split('-')[1]}</span>
                  {isSelected && (
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ======================================================== */}
      {/* DETALHAMENTO DO MÊS SELECIONADO                          */}
      {/* ======================================================== */}
      {currentActiveMonth && (
        <div className="p-5 rounded-2xl bg-slate-950/90 border border-slate-800/90 shadow-inner">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-base font-bold text-white">
                  Compras Programadas para {currentActiveMonth.periodName}
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30 font-mono">
                  {currentActiveMonth.installmentsCount} parcelas
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Vencimento previsto em {formatDate(currentActiveMonth.estimatedDueDate)}.
              </p>
            </div>

            <div className="flex items-center space-x-3 text-xs bg-slate-900 px-3.5 py-2 rounded-xl border border-slate-800">
              <span className="text-slate-400">Total desta Fatura:</span>
              <strong className="text-base font-extrabold text-amber-300 font-mono">
                {formatCurrency(currentActiveMonth.totalCommittedAmount)}
              </strong>
            </div>
          </div>

          {/* Cards Breakdown Summary */}
          {currentActiveMonth.byCard.length > 1 && (
            <div className="flex flex-wrap items-center gap-2 mb-4 pb-3 border-b border-slate-800/60 text-xs">
              <span className="text-slate-400 text-[11px]">Por cartão:</span>
              {currentActiveMonth.byCard.map(c => (
                <div
                  key={c.cardId}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 flex items-center space-x-1.5 text-[11px]"
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.cardColor }} />
                  <span className="text-slate-300 font-medium">{c.cardName}:</span>
                  <span className="font-bold text-white font-mono">{formatCurrency(c.amount)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Table / List of items for this future invoice */}
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900 uppercase text-[10px] font-bold text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Cartão</th>
                  <th className="py-2.5 px-3">Estabelecimento / Compra</th>
                  <th className="py-2.5 px-3">Categoria</th>
                  <th className="py-2.5 px-3 text-center">Parcela Prevista</th>
                  <th className="py-2.5 px-3 text-right">Valor da Parcela</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {currentActiveMonth.items.map((item, idx) => {
                  const estabColor = getCategoryColor(item.establishment);
                  const catColor = getCategoryColor(item.category);

                  return (
                    <tr key={`${item.id}-${idx}`} className="hover:bg-slate-900/60 transition-colors">
                      {/* Cartão */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center space-x-1.5">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: item.cardColor }}
                          />
                          <span className="font-semibold text-slate-200 truncate max-w-[110px]" title={item.cardName}>
                            {item.cardName}
                          </span>
                        </div>
                      </td>

                      {/* Estabelecimento & Descrição */}
                      <td className="py-2.5 px-3">
                        <div className="flex flex-col">
                          <div className="flex items-center space-x-1.5">
                            <span
                              className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ backgroundColor: estabColor }}
                            />
                            <span className="font-bold text-slate-100">
                              {item.establishment}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono truncate" title={item.originalDescription}>
                            {item.originalDescription}
                          </span>
                        </div>
                      </td>

                      {/* Categoria */}
                      <td className="py-2.5 px-3">
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                          style={{
                            backgroundColor: `${catColor}18`,
                            color: catColor
                          }}
                        >
                          {item.category}
                        </span>
                      </td>

                      {/* Parcela */}
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded bg-slate-900 text-indigo-300 font-mono text-[10px] border border-indigo-500/30 font-bold">
                          {item.projectedCurrent}/{item.totalInstallments}
                        </span>
                      </td>

                      {/* Valor */}
                      <td className="py-2.5 px-3 text-right font-bold text-slate-100 font-mono">
                        {formatCurrency(item.amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
