import React, { useState, useEffect, useMemo } from 'react';
import { CreditCard, Invoice, DueAlert } from './types';
import {
  loadStoredCards,
  saveStoredCards,
  loadStoredInvoices,
  saveStoredInvoices,
  clearAllStoredData
} from './utils/initialData';
import { calculateDaysRemaining, formatCurrency } from './utils/formatters';
import { Header } from './components/Header';
import { DueAlertBanner } from './components/DueAlertBanner';
import { AnalyticsCharts } from './components/AnalyticsCharts';
import { CardManager } from './components/CardManager';
import { TransactionList } from './components/TransactionList';
import { InvoiceUploader } from './components/InvoiceUploader';
import { InvoiceDetailModal } from './components/InvoiceDetailModal';
import { NotificationSettingsModal } from './components/NotificationSettingsModal';
import { Wallet, ShieldCheck, ArrowUpRight, Clock, FileUp, Sparkles, PlusCircle, Trash2, Shield, Lock } from 'lucide-react';

export default function App() {
  const [cards, setCards] = useState<CreditCard[]>(() => loadStoredCards());
  const [invoices, setInvoices] = useState<Invoice[]>(() => loadStoredInvoices());
  const [selectedCardFilter, setSelectedCardFilter] = useState<string | null>(null);

  // Modals state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isNewCardOpen, setIsNewCardOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [viewingInvoiceId, setViewingInvoiceId] = useState<string | null>(null);

  // Sync to localStorage
  useEffect(() => {
    saveStoredCards(cards);
  }, [cards]);

  useEffect(() => {
    saveStoredInvoices(invoices);
  }, [invoices]);

  // Compute due date alerts
  const dueAlerts = useMemo<DueAlert[]>(() => {
    const cardMap = new Map(cards.map(c => [c.id, c]));

    return invoices.map(inv => {
      const card = cardMap.get(inv.cardId);
      const daysRemaining = calculateDaysRemaining(inv.dueDate);

      let status: 'overdue' | 'today' | 'upcoming' | 'paid' = 'upcoming';
      if (inv.status === 'paid') {
        status = 'paid';
      } else if (daysRemaining < 0) {
        status = 'overdue';
      } else if (daysRemaining === 0) {
        status = 'today';
      }

      return {
        id: `alert-${inv.id}`,
        invoiceId: inv.id,
        cardName: card?.name || inv.issuer,
        cardIssuer: inv.issuer,
        cardColor: card?.color || '#8B5CF6',
        dueDate: inv.dueDate,
        daysRemaining,
        status,
        totalAmount: inv.totalAmount,
        barcode: inv.barcode,
        pixCode: inv.pixCode
      };
    }).sort((a, b) => {
      if (a.status === 'paid' && b.status !== 'paid') return 1;
      if (b.status === 'paid' && a.status !== 'paid') return -1;
      return a.daysRemaining - b.daysRemaining;
    });
  }, [invoices, cards]);

  // Financial aggregates
  const pendingInvoices = useMemo(() => invoices.filter(i => i.status === 'pending'), [invoices]);
  const totalPendingAmount = useMemo(() => pendingInvoices.reduce((acc, curr) => acc + curr.totalAmount, 0), [pendingInvoices]);

  const totalGlobalLimit = useMemo(() => cards.reduce((acc, c) => acc + c.limitTotal, 0), [cards]);
  const totalAvailableLimit = Math.max(0, totalGlobalLimit - totalPendingAmount);

  // Handlers
  const handleInvoiceImported = (newInvoice: Invoice, newCardCreated?: CreditCard) => {
    if (newCardCreated) {
      setCards(prev => {
        // Prevent duplicate cards with same issuer and last 4
        const exists = prev.find(c => c.id === newCardCreated.id || (c.issuer === newCardCreated.issuer && c.last4 === newCardCreated.last4));
        if (exists) return prev;
        return [...prev, newCardCreated];
      });
    }
    setInvoices(prev => {
      const existingIdx = prev.findIndex(inv =>
        inv.id === newInvoice.id ||
        (inv.cardId === newInvoice.cardId && inv.dueDate === newInvoice.dueDate && inv.period === newInvoice.period)
      );

      if (existingIdx !== -1) {
        const copy = [...prev];
        copy[existingIdx] = newInvoice;
        return copy;
      }

      return [newInvoice, ...prev];
    });
  };

  const handleBatchInvoicesImported = (items: { invoice: Invoice; newCardCreated?: CreditCard }[]) => {
    if (!items || items.length === 0) return;

    // 1. Process all new cards without duplicate IDs or issuer+last4
    const newCardsToAppend: CreditCard[] = [];
    items.forEach(item => {
      if (item.newCardCreated) {
        const candidate = item.newCardCreated;
        const existsInCurrent = cards.some(c => c.id === candidate.id || (c.issuer.toLowerCase() === candidate.issuer.toLowerCase() && c.last4 === candidate.last4));
        const existsInNew = newCardsToAppend.some(c => c.id === candidate.id || (c.issuer.toLowerCase() === candidate.issuer.toLowerCase() && c.last4 === candidate.last4));
        if (!existsInCurrent && !existsInNew) {
          newCardsToAppend.push(candidate);
        }
      }
    });

    if (newCardsToAppend.length > 0) {
      setCards(prev => [...prev, ...newCardsToAppend]);
    }

    // 2. Process all invoices in batch
    setInvoices(prev => {
      let updated = [...prev];
      items.forEach(item => {
        const inv = item.invoice;
        const existingIdx = updated.findIndex(existing =>
          existing.id === inv.id ||
          (existing.cardId === inv.cardId && existing.dueDate === inv.dueDate && existing.period === inv.period)
        );
        if (existingIdx !== -1) {
          updated[existingIdx] = inv;
        } else {
          updated = [inv, ...updated];
        }
      });
      return updated;
    });
  };

  const handleMarkAsPaid = (invoiceId: string) => {
    setInvoices(prev =>
      prev.map(inv =>
        inv.id === invoiceId
          ? { ...inv, status: 'paid', paidAt: new Date().toISOString() }
          : inv
      )
    );
  };

  const handleToggleInvoiceStatus = (invoiceId: string) => {
    setInvoices(prev =>
      prev.map(inv => {
        if (inv.id !== invoiceId) return inv;
        const newStatus = inv.status === 'paid' ? 'pending' : 'paid';
        return {
          ...inv,
          status: newStatus,
          paidAt: newStatus === 'paid' ? new Date().toISOString() : undefined
        };
      })
    );
  };

  const handleDeleteInvoice = (invoiceId: string) => {
    setInvoices(prev => prev.filter(inv => inv.id !== invoiceId));
  };

  const handleAddCard = (newCard: CreditCard) => {
    setCards(prev => [...prev, newCard]);
  };

  const handleUpdateCard = (updatedCard: CreditCard) => {
    setCards(prev => prev.map(c => (c.id === updatedCard.id ? updatedCard : c)));
  };

  const handleDeleteCard = (cardId: string) => {
    setCards(prev => prev.filter(c => c.id !== cardId));
    if (selectedCardFilter === cardId) {
      setSelectedCardFilter(null);
    }
  };

  const handleResetAllData = () => {
    if (confirm('Deseja realmente limpar todos os dados cadastrados e redefinir a aplicação?')) {
      clearAllStoredData();
      setCards([]);
      setInvoices([]);
      setSelectedCardFilter(null);
    }
  };

  const activeViewingInvoice = useMemo(() => {
    return invoices.find(inv => inv.id === viewingInvoiceId) || null;
  }, [invoices, viewingInvoiceId]);

  const activeViewingCard = useMemo(() => {
    if (!activeViewingInvoice) return undefined;
    return cards.find(c => c.id === activeViewingInvoice.cardId);
  }, [cards, activeViewingInvoice]);

  const hasData = cards.length > 0 || invoices.length > 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased selection:bg-indigo-500 selection:text-white">

      {/* Top Header */}
      <Header
        alerts={dueAlerts}
        onOpenUpload={() => setIsUploadOpen(true)}
        onOpenNewCard={() => setIsNewCardOpen(true)}
        onOpenNotifications={() => setIsNotificationOpen(true)}
        totalPendingAmount={totalPendingAmount}
        totalCards={cards.length}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Clean Empty State when no data has been imported yet */}
        {!hasData && (
          <div className="py-12 sm:py-16 text-center max-w-2xl mx-auto">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-emerald-400 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-500/20">
              <FileUp className="w-10 h-10 text-white" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-3">
              Nenhuma fatura cadastrada
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed mb-8">
              Todos os dados fictícios foram removidos. Importe o arquivo <strong className="text-slate-200">.PDF</strong> da fatura do seu cartão de crédito (Itaú, Nubank, Bradesco, Santander ou outro) para gerar automaticamente seus gráficos, limites, alertas de vencimento e extrato.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mb-10">
              <button
                onClick={() => setIsUploadOpen(true)}
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center space-x-2 active:scale-95"
              >
                <FileUp className="w-5 h-5" />
                <span>Importar Minha Fatura (.PDF)</span>
              </button>

              <button
                onClick={() => setIsNewCardOpen(true)}
                className="w-full sm:w-auto px-5 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm border border-slate-700/80 transition-all flex items-center justify-center space-x-2"
              >
                <PlusCircle className="w-4 h-4 text-slate-400" />
                <span>Cadastrar Cartão Manualmente</span>
              </button>
            </div>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center mb-3">
                  <Lock className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-slate-200 mb-1">Suporte a Senha de PDF</h4>
                <p className="text-[11px] text-slate-400">
                  Desbloqueio seguro para faturas criptografadas (no Itaú são os 5 primeiros dígitos do seu CPF).
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3">
                  <Clock className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-slate-200 mb-1">Alertas de Vencimento</h4>
                <p className="text-[11px] text-slate-400">
                  Notificações no navegador e exportação para calendário para nunca pagar juros ou multas.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-3">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-slate-200 mb-1">Gráficos e Conciliação</h4>
                <p className="text-[11px] text-slate-400">
                  Evolução mensal de gastos, detalhamento por categoria e monitoramento de limite livre.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Full Active Dashboard (visible once real invoices/cards exist) */}
        {hasData && (
          <>
            {/* KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">

              <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800/90 border border-slate-800 shadow-md">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider">Faturas a Pagar</span>
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-amber-400 tracking-tight">
                  {formatCurrency(totalPendingAmount)}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                  <span>{pendingInvoices.length} {pendingInvoices.length === 1 ? 'fatura pendente' : 'faturas pendentes'}</span>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800/90 border border-slate-800 shadow-md">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider">Limite Disponível</span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-emerald-400 tracking-tight">
                  {formatCurrency(totalAvailableLimit)}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  De {formatCurrency(totalGlobalLimit)} consolidado
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800/90 border border-slate-800 shadow-md">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider">Cartões Monitorados</span>
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <Wallet className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-white tracking-tight">
                  {cards.length}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  {cards.map(c => c.name).join(', ') || 'Nenhum'}
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800/90 border border-slate-800 shadow-md">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider">Importador PDF</span>
                  <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
                    <FileUp className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-sm font-semibold text-slate-200 mt-1">
                  {invoices.length} {invoices.length === 1 ? 'fatura processada' : 'faturas processadas'}
                </div>
                <button
                  onClick={() => setIsUploadOpen(true)}
                  className="mt-2 text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
                >
                  <span>Importar nova fatura</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>

            {/* Due Date Notifications & Alerts */}
            <DueAlertBanner
              alerts={dueAlerts}
              onMarkAsPaid={handleMarkAsPaid}
              onViewInvoice={(id) => setViewingInvoiceId(id)}
              onOpenUpload={() => setIsUploadOpen(true)}
            />

            {/* Financial Charts & Visual Insights */}
            <AnalyticsCharts
              invoices={invoices}
              cards={cards}
            />

            {/* Credit Cards Physical Preview & Manager */}
            <CardManager
              cards={cards}
              selectedCardFilter={selectedCardFilter}
              onSelectCardFilter={setSelectedCardFilter}
              onAddCard={handleAddCard}
              onUpdateCard={handleUpdateCard}
              onDeleteCard={handleDeleteCard}
              isOpenModal={isNewCardOpen}
              onCloseModal={() => setIsNewCardOpen(false)}
            />

            {/* Itemized Transactions Explorer */}
            <TransactionList
              invoices={invoices}
              cards={cards}
              selectedCardFilter={selectedCardFilter}
              onViewInvoice={(id) => setViewingInvoiceId(id)}
            />
          </>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-900/60 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Backend Node.js Express ativo • Processamento seguro de PDF em memória</span>
          </div>
          <div className="flex items-center space-x-4 text-slate-400">
            {hasData && (
              <button
                onClick={handleResetAllData}
                className="hover:text-rose-400 flex items-center space-x-1 transition-colors"
                title="Limpar todos os dados salvos"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Limpar todos os dados</span>
              </button>
            )}
            <span>FaturaSmart 2026</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <InvoiceUploader
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        cards={cards}
        onInvoiceImported={handleInvoiceImported}
        onBatchInvoicesImported={handleBatchInvoicesImported}
      />

      <InvoiceDetailModal
        invoice={activeViewingInvoice}
        card={activeViewingCard}
        onClose={() => setViewingInvoiceId(null)}
        onToggleStatus={handleToggleInvoiceStatus}
        onDeleteInvoice={handleDeleteInvoice}
      />

      <NotificationSettingsModal
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        alerts={dueAlerts}
      />

    </div>
  );
}
