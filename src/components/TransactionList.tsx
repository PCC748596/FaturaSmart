import React, { useState, useMemo } from 'react';
import { Search, Download, Tag, Store, Layers } from 'lucide-react';
import { Invoice, CreditCard, Transaction } from '../types';
import { formatCurrency, formatDate, getCategoryColor } from '../utils/formatters';
import { MAIN_CATEGORIES, normalizeMainCategory, extractEstablishment } from '../utils/taxonomy';

interface TransactionListProps {
  invoices: Invoice[];
  cards: CreditCard[];
  selectedCardFilter: string | null;
  onViewInvoice: (invoiceId: string) => void;
}

interface EnrichedTransaction extends Transaction {
  invoiceId: string;
  cardName: string;
  cardColor: string;
  cardLast4: string;
  invoiceStatus: 'pending' | 'paid' | 'overdue';
  dueDate: string;
  establishment: string;
  mainCategory: string;
}

export const TransactionList: React.FC<TransactionListProps> = ({
  invoices,
  cards,
  selectedCardFilter,
  onViewInvoice
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'>('date-desc');

  // Flatten and enrich all transactions with normalized Category and Establishment
  const enrichedTransactions = useMemo(() => {
    const list: EnrichedTransaction[] = [];
    const cardMap = new Map(cards.map(c => [c.id, c]));

    invoices.forEach(inv => {
      // Apply card filter if set
      if (selectedCardFilter && inv.cardId !== selectedCardFilter) return;

      const card = cardMap.get(inv.cardId);

      inv.transactions.forEach(t => {
        const mainCategory = normalizeMainCategory(t.category, t.description);
        const establishment = t.establishment || extractEstablishment(t.description, mainCategory);

        list.push({
          ...t,
          mainCategory,
          category: mainCategory,
          subcategory: establishment,
          establishment,
          invoiceId: inv.id,
          cardName: card?.name || inv.issuer,
          cardColor: card?.color || '#6366F1',
          cardLast4: inv.cardLastDigits,
          invoiceStatus: inv.status,
          dueDate: inv.dueDate
        });
      });
    });

    return list;
  }, [invoices, cards, selectedCardFilter]);

  // Aggregate stats per category
  const categoryStats = useMemo(() => {
    const map: Record<string, { count: number; total: number }> = {};
    enrichedTransactions.forEach(t => {
      if (!map[t.mainCategory]) {
        map[t.mainCategory] = { count: 0, total: 0 };
      }
      map[t.mainCategory].count += 1;
      map[t.mainCategory].total += t.amount;
    });
    return map;
  }, [enrichedTransactions]);

  // Available establishments/subcategories for current category selection
  const availableSubcategories = useMemo(() => {
    const counts: Record<string, { count: number; total: number }> = {};

    enrichedTransactions.forEach(t => {
      if (selectedCategory === 'all' || t.mainCategory === selectedCategory) {
        const estab = t.establishment || 'Outros';
        if (!counts[estab]) {
          counts[estab] = { count: 0, total: 0 };
        }
        counts[estab].count += 1;
        counts[estab].total += t.amount;
      }
    });

    return Object.entries(counts)
      .map(([name, data]) => ({ name, count: data.count, total: data.total }))
      .sort((a, b) => b.count - a.count);
  }, [enrichedTransactions, selectedCategory]);

  // Filter and sort transactions
  const filteredTransactions = useMemo(() => {
    return enrichedTransactions.filter(t => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        !q ||
        t.description.toLowerCase().includes(q) ||
        t.mainCategory.toLowerCase().includes(q) ||
        t.establishment.toLowerCase().includes(q) ||
        t.cardName.toLowerCase().includes(q);

      const matchesCategory =
        selectedCategory === 'all' || t.mainCategory === selectedCategory;

      const matchesSubcategory =
        selectedSubcategory === 'all' || t.establishment === selectedSubcategory;

      const matchesStatus =
        selectedStatus === 'all' ||
        (selectedStatus === 'paid' && t.invoiceStatus === 'paid') ||
        (selectedStatus === 'pending' && t.invoiceStatus !== 'paid');

      return matchesSearch && matchesCategory && matchesSubcategory && matchesStatus;
    }).sort((a, b) => {
      if (sortBy === 'date-desc') return b.date.localeCompare(a.date);
      if (sortBy === 'date-asc') return a.date.localeCompare(b.date);
      if (sortBy === 'amount-desc') return b.amount - a.amount;
      if (sortBy === 'amount-asc') return a.amount - b.amount;
      return 0;
    });
  }, [enrichedTransactions, searchTerm, selectedCategory, selectedSubcategory, selectedStatus, sortBy]);

  const totalFilteredAmount = useMemo(() => {
    return filteredTransactions.reduce((acc, curr) => acc + curr.amount, 0);
  }, [filteredTransactions]);

  // Export to CSV with Category and Subcategory/Establishment
  const handleExportCSV = () => {
    const headers = [
      'Data',
      'Cartao',
      'Categoria',
      'Subcategoria_Estabelecimento',
      'Descricao_Original',
      'Parcela_Atual',
      'Total_Parcelas',
      'Valor_R$',
      'Status_Fatura',
      'Vencimento'
    ];
    const rows = filteredTransactions.map(t => [
      t.date,
      `"${t.cardName}"`,
      `"${t.mainCategory}"`,
      `"${t.establishment}"`,
      `"${t.description.replace(/"/g, '""')}"`,
      t.installmentCurrent || 1,
      t.installmentTotal || 1,
      t.amount.toFixed(2),
      t.invoiceStatus === 'paid' ? 'Pago' : 'Pendente',
      t.dueDate
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `faturasmart_despesas_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSelectCategory = (catName: string) => {
    setSelectedCategory(catName);
    setSelectedSubcategory('all'); // Reset subcategory filter when changing primary category
  };

  // Active category icon and color helper
  const activeCategoryMeta = MAIN_CATEGORIES.find(c => c.name === selectedCategory);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl mb-12">
      
      {/* Title & Stats */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 border-b border-slate-800 pb-5">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Tag className="w-5 h-5 text-indigo-400" />
            Lançamentos e Extrato Geral
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Filtros hierárquicos por <strong>Categoria</strong> e <strong>Subcategoria / Estabelecimento</strong>.
          </p>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <div className="px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-300">
            Total filtrado: <strong className="text-emerald-400 font-bold">{formatCurrency(totalFilteredAmount)}</strong>
          </div>
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center space-x-1.5 transition-colors font-medium"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* NÍVEL 1: SELETOR DE CATEGORIAS PRINCIPAIS                */}
      {/* ======================================================== */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            1. Categoria Principal
          </span>
          {selectedCategory !== 'all' && (
            <button
              onClick={() => handleSelectCategory('all')}
              className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
            >
              Limpar Categoria (Ver Todas)
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 pb-2">
          {/* Todas as Categorias */}
          <button
            onClick={() => handleSelectCategory('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              selectedCategory === 'all'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'bg-slate-800/70 text-slate-300 hover:bg-slate-800 border border-slate-700/60'
            }`}
          >
            <span>Todas</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-900/60 text-slate-300">
              {enrichedTransactions.length}
            </span>
          </button>

          {/* Categorias canônicas com contadores */}
          {MAIN_CATEGORIES.map(cat => {
            const stats = categoryStats[cat.name];
            const count = stats?.count || 0;
            if (count === 0 && selectedCategory !== cat.name) return null;

            const isSelected = selectedCategory === cat.name;

            return (
              <button
                key={cat.id}
                onClick={() => handleSelectCategory(cat.name)}
                style={{
                  borderColor: isSelected ? cat.color : undefined
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 border ${
                  isSelected
                    ? 'bg-slate-800 text-white shadow-md ring-1'
                    : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 border-slate-700/60'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.name}</span>
                <span
                  className="text-[10px] px-1.5 py-0.2 rounded-full font-mono"
                  style={{
                    backgroundColor: `${cat.color}25`,
                    color: cat.color
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ======================================================== */}
      {/* NÍVEL 2: SUBCATEGORIAS / ESTABELECIMENTOS                */}
      {/* ======================================================== */}
      <div className="mb-5 p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/90 shadow-inner">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center space-x-2">
            <Store className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
              2. Subcategoria / Estabelecimento
            </span>
            <span className="text-[11px] text-slate-400">
              {selectedCategory === 'all'
                ? '(Exibindo todos os estabelecimentos registrados)'
                : `(Filtrando dentro de "${selectedCategory}")`}
            </span>
          </div>

          {selectedSubcategory !== 'all' && (
            <button
              onClick={() => setSelectedSubcategory('all')}
              className="text-[11px] text-amber-400 hover:text-amber-300 font-medium"
            >
              Ver Todos os Estabelecimentos
            </button>
          )}
        </div>

        {/* Chips dos estabelecimentos mais frequentes */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setSelectedSubcategory('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              selectedSubcategory === 'all'
                ? 'bg-slate-700 text-white font-semibold'
                : 'bg-slate-800/70 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            Todos ({availableSubcategories.reduce((acc, curr) => acc + curr.count, 0)})
          </button>

          {availableSubcategories.slice(0, 10).map(sub => {
            const isSelected = selectedSubcategory === sub.name;
            const estabColor = getCategoryColor(sub.name);

            return (
              <button
                key={sub.name}
                onClick={() => setSelectedSubcategory(sub.name)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 border ${
                  isSelected
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500 font-bold shadow-sm'
                    : 'bg-slate-800/50 text-slate-300 hover:bg-slate-800 border-slate-700/60'
                }`}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: estabColor }}
                />
                <span className="truncate max-w-[150px]">{sub.name}</span>
                <span className="text-[10px] text-slate-400 font-mono">({sub.count})</span>
              </button>
            );
          })}

          {/* Dropdown caso existam mais estabelecimentos */}
          {availableSubcategories.length > 10 && (
            <div className="relative inline-block ml-1">
              <select
                value={selectedSubcategory}
                onChange={e => setSelectedSubcategory(e.target.value)}
                className="bg-slate-800 text-slate-200 text-xs rounded-lg px-2.5 py-1 border border-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="all">Mais estabelecimentos...</option>
                {availableSubcategories.map(sub => (
                  <option key={sub.name} value={sub.name}>
                    {sub.name} ({sub.count}x - {formatCurrency(sub.total)})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* BARRA DE PESQUISA, FILTROS SECUNDÁRIOS E ORDENAÇÃO      */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {/* Busca textual livre */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por descrição ou loja..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Dropdown de Categorias */}
        <div>
          <select
            value={selectedCategory}
            onChange={e => handleSelectCategory(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">Todas as Categorias</option>
            {MAIN_CATEGORIES.map(cat => (
              <option key={cat.id} value={cat.name}>
                {cat.icon} {cat.name} ({categoryStats[cat.name]?.count || 0})
              </option>
            ))}
          </select>
        </div>

        {/* Dropdown de Subcategorias / Estabelecimentos */}
        <div>
          <select
            value={selectedSubcategory}
            onChange={e => setSelectedSubcategory(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">
              {selectedCategory === 'all'
                ? 'Todos os Estabelecimentos'
                : `Todos os estabelecimentos de ${selectedCategory}`}
            </option>
            {availableSubcategories.map(sub => (
              <option key={sub.name} value={sub.name}>
                {sub.name} ({sub.count} compras)
              </option>
            ))}
          </select>
        </div>

        {/* Ordenação */}
        <div>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="date-desc">Data (Mais recente primeiro)</option>
            <option value="date-asc">Data (Mais antiga primeiro)</option>
            <option value="amount-desc">Valor (Maior para Menor)</option>
            <option value="amount-asc">Valor (Menor para Maior)</option>
          </select>
        </div>
      </div>

      {/* ======================================================== */}
      {/* TABELA DE LANÇAMENTOS COM ESTABELECIMENTO EM DESTAQUE    */}
      {/* ======================================================== */}
      <div className="overflow-x-auto rounded-2xl border border-slate-800">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-800/60 uppercase text-[10px] font-bold tracking-wider text-slate-400 border-b border-slate-800">
            <tr>
              <th className="py-3 px-4">Data</th>
              <th className="py-3 px-4">Cartão</th>
              <th className="py-3 px-4">Subcategoria / Estabelecimento</th>
              <th className="py-3 px-4">Categoria</th>
              <th className="py-3 px-4 text-center">Parcela</th>
              <th className="py-3 px-4 text-right">Valor</th>
              <th className="py-3 px-4 text-center">Fatura</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-slate-500">
                  Nenhuma transação encontrada para os filtros selecionados.
                </td>
              </tr>
            ) : (
              filteredTransactions.map((t, idx) => {
                const estabColor = getCategoryColor(t.establishment);
                const catColor = getCategoryColor(t.mainCategory);

                return (
                  <tr key={`${t.invoiceId}-${t.id}-${idx}`} className="hover:bg-slate-800/40 transition-colors">
                    {/* Data */}
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {formatDate(t.date)}
                    </td>

                    {/* Cartão */}
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: t.cardColor }}
                        />
                        <span className="font-semibold text-slate-200 truncate max-w-[110px]" title={t.cardName}>
                          {t.cardName}
                        </span>
                      </div>
                    </td>

                    {/* Estabelecimento / Subcategoria + Descrição Original */}
                    <td className="py-3 px-4 max-w-xs">
                      <div className="flex flex-col">
                        <div className="flex items-center space-x-1.5">
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: estabColor }}
                          />
                          <span className="font-bold text-slate-100 hover:text-indigo-300 transition-colors">
                            {t.establishment}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 truncate font-mono mt-0.5" title={t.description}>
                          {t.description}
                        </span>
                      </div>
                    </td>

                    {/* Categoria Principal */}
                    <td className="py-3 px-4">
                      <span
                        className="px-2.5 py-0.5 rounded-full text-[10px] font-medium inline-flex items-center gap-1"
                        style={{
                          backgroundColor: `${catColor}18`,
                          color: catColor
                        }}
                      >
                        {t.mainCategory}
                      </span>
                    </td>

                    {/* Parcela */}
                    <td className="py-3 px-4 text-center">
                      {t.installmentTotal && t.installmentTotal > 1 ? (
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px] border border-slate-700">
                          {t.installmentCurrent}/{t.installmentTotal}
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[10px]">À vista</span>
                      )}
                    </td>

                    {/* Valor */}
                    <td className="py-3 px-4 text-right font-bold text-slate-100 font-mono">
                      {formatCurrency(t.amount)}
                    </td>

                    {/* Fatura Status */}
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => onViewInvoice(t.invoiceId)}
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                          t.invoiceStatus === 'paid'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20'
                        }`}
                      >
                        {t.invoiceStatus === 'paid' ? 'Paga' : 'Pendente'}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-[11px] text-slate-500">
        <span>Exibindo {filteredTransactions.length} de {enrichedTransactions.length} transações</span>
        <span>{availableSubcategories.length} estabelecimentos identificados</span>
      </div>

    </div>
  );
};
