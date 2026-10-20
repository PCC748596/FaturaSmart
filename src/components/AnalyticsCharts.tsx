import React, { useState } from 'react';
import { BarChart3, PieChart, TrendingUp, CreditCard as CardIcon, ArrowUpRight, DollarSign, Wallet } from 'lucide-react';
import { Invoice, CreditCard, CategorySummary } from '../types';
import { formatCurrency, CATEGORY_COLORS, getCategoryColor } from '../utils/formatters';
import { MAIN_CATEGORIES, normalizeMainCategory, extractEstablishment } from '../utils/taxonomy';

interface AnalyticsChartsProps {
  invoices: Invoice[];
  cards: CreditCard[];
}

export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({ invoices, cards }) => {
  const [activeTab, setActiveTab] = useState<'monthly' | 'categories' | 'limits'>('monthly');

  // Compute monthly totals
  const monthlyMap: Record<string, { total: number; count: number; name: string; key: string }> = {};

  invoices.forEach(inv => {
    // Derive month key from dueDate or closingDate
    const dateRef = inv.dueDate || inv.closingDate;
    const parts = dateRef.split('-');
    const year = parts[0];
    const month = parts[1];
    const key = `${year}-${month}`;

    const monthNames: Record<string, string> = {
      '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Abr', '05': 'Mai', '06': 'Jun',
      '07': 'Jul', '08': 'Ago', '09': 'Set', '10': 'Out', '11': 'Nov', '12': 'Dez'
    };
    const label = `${monthNames[month] || month}/${year.slice(2)}`;

    if (!monthlyMap[key]) {
      monthlyMap[key] = {
        total: 0,
        count: 0,
        name: label,
        key,
        isProjected: !!inv.isProjected
      };
    } else if (!inv.isProjected) {
      // If a real invoice is present, real takes precedence
      monthlyMap[key].isProjected = false;
    }
    monthlyMap[key].total += inv.totalAmount;
    monthlyMap[key].count += inv.transactions.length;
  });

  const sortedMonths = Object.values(monthlyMap).sort((a, b) => a.key.localeCompare(b.key));
  const maxMonthlyAmount = Math.max(...sortedMonths.map(m => m.total), 1);

  // Compute category breakdown across all transactions using canonical taxonomy
  const categoryMap: Record<string, { amount: number; count: number }> = {};
  let totalSpending = 0;

  invoices.forEach(inv => {
    inv.transactions.forEach(t => {
      const mainCat = normalizeMainCategory(t.category, t.description);
      if (!categoryMap[mainCat]) {
        categoryMap[mainCat] = { amount: 0, count: 0 };
      }
      categoryMap[mainCat].amount += t.amount;
      categoryMap[mainCat].count += 1;
      totalSpending += t.amount;
    });
  });

  const categorySummaries: CategorySummary[] = Object.entries(categoryMap)
    .map(([category, data]) => ({
      category,
      amount: data.amount,
      count: data.count,
      percentage: totalSpending > 0 ? (data.amount / totalSpending) * 100 : 0,
      color: getCategoryColor(category)
    }))
    .sort((a, b) => b.amount - a.amount);

  // Subcategorias / Estabelecimentos de Compras Internet (Amazon, Mercado Livre, Shopee, Shein, etc.)
  const targetMarketplaces = [
    { key: 'Mercado Livre', label: 'Mercado Livre', color: '#EAB308', icon: '🛒' },
    { key: 'Amazon', label: 'Amazon', color: '#F97316', icon: '📦' },
    { key: 'Shopee', label: 'Shopee', color: '#EE4D2D', icon: '🛍️' },
    { key: 'Shein', label: 'Shein', color: '#EC4899', icon: '👗' },
    { key: 'AliExpress', label: 'AliExpress', color: '#FF5722', icon: '🌐' },
    { key: 'Demais Lojas', label: 'Outras Lojas / E-commerce', color: '#8B5CF6', icon: '⚡' }
  ];

  const shoppingStats = targetMarketplaces.map(m => {
    let amount = 0;
    let count = 0;

    invoices.forEach(inv => {
      inv.transactions.forEach(t => {
        const mainCat = normalizeMainCategory(t.category, t.description);
        if (mainCat === 'Compras Internet') {
          const estab = extractEstablishment(t.description, mainCat);
          if (m.key === 'Demais Lojas') {
            if (!['Mercado Livre', 'Amazon', 'Shopee', 'Shein', 'AliExpress'].includes(estab)) {
              amount += t.amount;
              count += 1;
            }
          } else if (estab === m.key) {
            amount += t.amount;
            count += 1;
          }
        }
      });
    });

    return {
      ...m,
      amount,
      count
    };
  });

  const totalShoppingAmount = shoppingStats.reduce((sum, item) => sum + item.amount, 0);
  const totalShoppingCount = shoppingStats.reduce((sum, item) => sum + item.count, 0);
  const cardCommitments = cards.map(card => {
    // Find current active pending invoice for this card
    const cardInvoices = invoices.filter(inv => inv.cardId === card.id);
    const pendingTotal = cardInvoices
      .filter(inv => inv.status === 'pending')
      .reduce((sum, inv) => sum + inv.totalAmount, 0);

    const availableLimit = Math.max(0, card.limitTotal - pendingTotal);
    const usagePercent = card.limitTotal > 0 ? Math.min(100, (pendingTotal / card.limitTotal) * 100) : 0;

    return {
      card,
      pendingTotal,
      availableLimit,
      usagePercent,
      invoicesCount: cardInvoices.length
    };
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl mb-8">
      {/* Header with Switcher Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 border-b border-slate-800 pb-5">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-400" />
            Análise e Gráficos Financeiros
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Evolução de despesas, categorização de consumo e comprometimento de limite bancário.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center space-x-1.5 p-1 bg-slate-800/80 rounded-xl border border-slate-700/60">
          <button
            onClick={() => setActiveTab('monthly')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'monthly'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Evolução Mensal
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'categories'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Por Categoria
          </button>
          <button
            onClick={() => setActiveTab('limits')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'limits'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Limites dos Cartões
          </button>
        </div>
      </div>

      {/* Tab 1: Monthly Evolution Chart */}
      {activeTab === 'monthly' && (
        <div>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-6">
            <span>Volume Total Faturado por Mês</span>
            <span className="flex items-center gap-1 text-emerald-400 font-medium">
              <TrendingUp className="w-3.5 h-3.5" /> Média de R${' '}
              {sortedMonths.length > 0
                ? (sortedMonths.reduce((a, b) => a + b.total, 0) / sortedMonths.length).toFixed(2)
                : '0.00'}
              /mês
            </span>
          </div>

          {/* Bar Chart Container */}
          {sortedMonths.length === 0 ? (
            <div className="h-56 flex flex-col items-center justify-center text-center text-slate-400 p-6 border-b border-slate-800">
              <BarChart3 className="w-10 h-10 text-slate-600 mb-2" />
              <p className="text-sm font-medium text-slate-300">Nenhuma fatura importada para exibição</p>
              <p className="text-xs text-slate-500 mt-1">Faça upload de faturas para acompanhar o histórico mensal.</p>
            </div>
          ) : (
            <div className="h-64 flex items-end justify-between gap-2 sm:gap-6 px-2 sm:px-6 pt-6 pb-2 border-b border-slate-800">
              {sortedMonths.map((m) => {
                // Determine proportional height relative to max monthly bill
                const heightPercent = Math.max(14, Math.min(100, Math.round((m.total / maxMonthlyAmount) * 100)));

                return (
                  <div key={m.key} className="flex-1 flex flex-col items-center group relative h-full">
                    {/* Hover Tooltip */}
                    <div className="absolute -top-8 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-slate-800 border border-slate-700 text-white text-[11px] font-semibold py-1 px-2.5 rounded-lg shadow-xl pointer-events-none whitespace-nowrap z-20 scale-95 group-hover:scale-100">
                      {m.name}: {formatCurrency(m.total)} {m.isProjected ? `(Projeção - ${m.count} parcelas)` : `(${m.count} lançamentos)`}
                    </div>

                    {/* Top value badge */}
                    <div className="text-[10px] font-semibold text-slate-400 mb-1.5 group-hover:text-indigo-300 transition-colors shrink-0 flex flex-col items-center">
                      <span>{formatCurrency(m.total)}</span>
                      {m.isProjected && (
                        <span className="text-[8px] px-1 rounded bg-violet-900/60 text-violet-300 font-bold border border-violet-700/50 mt-0.5">
                          Projeção
                        </span>
                      )}
                    </div>

                    {/* Bar track container with full vertical flex space */}
                    <div className="flex-1 w-full max-w-[48px] bg-slate-800/40 hover:bg-slate-800/70 rounded-t-xl overflow-hidden p-1 flex flex-col justify-end transition-colors border border-slate-800/80">
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className={`w-full rounded-t-lg transition-all duration-500 group-hover:brightness-125 shadow-lg relative ${
                          m.isProjected
                            ? 'bg-gradient-to-t from-violet-900 via-indigo-600 to-fuchsia-400 shadow-fuchsia-600/20'
                            : 'bg-gradient-to-t from-indigo-600 via-indigo-500 to-violet-400 shadow-indigo-600/30'
                        }`}
                      >
                        {/* Upper highlight cap for depth perception */}
                        <div
                          className={`absolute inset-x-0 top-0 h-1 rounded-t-lg ${
                            m.isProjected ? 'bg-fuchsia-200/70' : 'bg-violet-200/50'
                          }`}
                        />
                      </div>
                    </div>

                    {/* Month Label */}
                    <span className={`text-xs font-semibold mt-2 shrink-0 ${m.isProjected ? 'text-violet-300' : 'text-slate-300'}`}>
                      {m.name}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-4 flex items-center justify-between text-[11px] text-slate-500 px-2">
            <span>* Valores consolidados das faturas importadas.</span>
            <span>{invoices.length} faturas registradas</span>
          </div>
        </div>
      )}

      {/* Tab 2: Spending by Category & Marketplace Breakdown */}
      {activeTab === 'categories' && (
        <div className="space-y-6">
          {/* General Categories Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Donut / Visual summary */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center p-4 bg-slate-800/40 rounded-2xl border border-slate-800">
              <div className="relative w-44 h-44 flex items-center justify-center">
                {/* Circular SVG Donut */}
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="transparent"
                    stroke="#1E293B"
                    strokeWidth="12"
                  />
                  {(() => {
                    let accumulatedPercent = 0;
                    const circumference = 2 * Math.PI * 38;

                    return categorySummaries.map((cat, idx) => {
                      const strokeDasharray = `${(cat.percentage / 100) * circumference} ${circumference}`;
                      const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
                      accumulatedPercent += cat.percentage;

                      return (
                        <circle
                          key={idx}
                          cx="50"
                          cy="50"
                          r="38"
                          fill="transparent"
                          stroke={cat.color}
                          strokeWidth="12"
                          strokeDasharray={strokeDasharray}
                          strokeDashoffset={strokeDashoffset}
                          className="transition-all duration-700 hover:opacity-80"
                        />
                      );
                    });
                  })()}
                </svg>

                <div className="absolute text-center flex flex-col items-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Total Faturado</span>
                  <span className="text-sm font-extrabold text-white">{formatCurrency(totalSpending)}</span>
                  <span className="text-[10px] text-slate-500">{categorySummaries.length} categorias</span>
                </div>
              </div>
            </div>

            {/* Category List & Progress Bars */}
            <div className="lg:col-span-7 space-y-2 max-h-72 overflow-y-auto pr-1">
              {categorySummaries.map((cat, idx) => (
                <div key={idx} className="p-2 rounded-xl bg-slate-800/50 border border-slate-800/80 hover:border-slate-700 transition-colors">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <div className="flex items-center space-x-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="font-semibold text-slate-200">{cat.category}</span>
                      <span className="text-[11px] text-slate-500">({cat.count} compras)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-100">{formatCurrency(cat.amount)}</span>
                      <span className="text-slate-400 text-[11px] w-12 text-right">
                        {cat.percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* Progress track */}
                  <div className="w-full h-1.5 bg-slate-700/60 rounded-full overflow-hidden">
                    <div
                      style={{
                        width: `${Math.max(3, cat.percentage)}%`,
                        backgroundColor: cat.color
                      }}
                      className="h-full rounded-full transition-all duration-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* DEDICATED MARKETPLACE & ONLINE SHOPPING SEPARATION */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-800/90 via-slate-800/60 to-slate-900 border border-slate-700/80 shadow-inner">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-700/60">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-base border border-indigo-500/30">
                  🛍️
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    Compras Internet: Subcategorias & Estabelecimentos
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Separação detalhada de compras online: Amazon, Mercado Livre, Shein, Shopee, AliExpress e outras lojas.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 text-xs bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-700">
                <span className="text-slate-400">Total em Compras Internet:</span>
                <span className="font-bold text-amber-300">{formatCurrency(totalShoppingAmount)}</span>
                <span className="text-slate-500 text-[10px]">({totalShoppingCount} itens)</span>
              </div>
            </div>

            {/* Visual Multi-Segment Bar */}
            {totalShoppingAmount > 0 && (
              <div className="mb-4">
                <div className="w-full h-3 rounded-full bg-slate-950/80 flex overflow-hidden p-0.5 border border-slate-700">
                  {shoppingStats.map(m => {
                    const pct = totalShoppingAmount > 0 ? (m.amount / totalShoppingAmount) * 100 : 0;
                    if (pct <= 0) return null;
                    return (
                      <div
                        key={m.key}
                        style={{ width: `${pct}%`, backgroundColor: m.color }}
                        title={`${m.label}: ${formatCurrency(m.amount)} (${pct.toFixed(1)}%)`}
                        className="h-full transition-all duration-500 first:rounded-l-full last:rounded-r-full hover:opacity-85"
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Individual Cards for each Marketplace Subcategory */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {shoppingStats.map(m => {
                const shareOfShopping = totalShoppingAmount > 0 ? (m.amount / totalShoppingAmount) * 100 : 0;

                return (
                  <div
                    key={m.key}
                    className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-700/60 flex flex-col justify-between hover:border-slate-600 transition-colors"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm">{m.icon}</span>
                        <span
                          className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                          style={{
                            backgroundColor: `${m.color}20`,
                            color: m.color
                          }}
                        >
                          {shareOfShopping.toFixed(1)}% das compras
                        </span>
                      </div>
                      <div className="font-bold text-slate-100 text-xs mb-1 truncate" title={m.label}>
                        {m.label}
                      </div>
                      <div className="text-sm font-extrabold text-white">
                        {formatCurrency(m.amount)}
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
                      <span>{m.count} {m.count === 1 ? 'lançamento' : 'lançamentos'}</span>
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: m.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Credit Card Limits Usage */}
      {activeTab === 'limits' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cardCommitments.map(({ card, pendingTotal, availableLimit, usagePercent }) => {
            const isHighUsage = usagePercent > 70;

            return (
              <div
                key={card.id}
                className="p-5 rounded-2xl bg-slate-800/60 border border-slate-700/70 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <span
                        className="w-3.5 h-3.5 rounded-full"
                        style={{ backgroundColor: card.color }}
                      />
                      <span className="font-bold text-slate-100 text-sm">{card.name}</span>
                    </div>
                    <span className="text-xs text-slate-400 font-mono">•••• {card.last4}</span>
                  </div>

                  {/* Limit Usage Bar */}
                  <div className="my-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-400">Limite Utilizado</span>
                      <span className={`font-bold ${isHighUsage ? 'text-amber-400' : 'text-slate-200'}`}>
                        {usagePercent.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-700 rounded-full overflow-hidden p-0.5">
                      <div
                        style={{ width: `${Math.max(4, usagePercent)}%` }}
                        className={`h-full rounded-full transition-all duration-500 ${
                          isHighUsage
                            ? 'bg-gradient-to-r from-amber-500 to-rose-500'
                            : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Financial breakdown */}
                  <div className="grid grid-cols-2 gap-2 text-xs pt-2">
                    <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                      <div className="text-[10px] text-slate-500">Comprometido</div>
                      <div className="font-bold text-amber-300">{formatCurrency(pendingTotal)}</div>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                      <div className="text-[10px] text-slate-500">Disponível</div>
                      <div className="font-bold text-emerald-400">{formatCurrency(availableLimit)}</div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-700/60 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Limite Total:</span>
                  <span className="font-bold text-slate-200">{formatCurrency(card.limitTotal)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
