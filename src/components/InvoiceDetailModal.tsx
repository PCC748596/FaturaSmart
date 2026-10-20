import React, { useState } from 'react';
import { X, CheckCircle, Clock, Copy, Check, Calendar, Download, Trash2, ArrowUpRight, DollarSign } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Invoice, CreditCard } from '../types';
import { formatCurrency, formatDate, downloadCalendarICS, getCategoryColor } from '../utils/formatters';
import { normalizeMainCategory, extractEstablishment } from '../utils/taxonomy';

interface InvoiceDetailModalProps {
  invoice: Invoice | null;
  card?: CreditCard;
  onClose: () => void;
  onToggleStatus: (invoiceId: string) => void;
  onDeleteInvoice: (invoiceId: string) => void;
}

export const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = ({
  invoice,
  card,
  onClose,
  onToggleStatus,
  onDeleteInvoice
}) => {
  const [copiedPix, setCopiedPix] = useState(false);
  const [copiedBarcode, setCopiedBarcode] = useState(false);

  if (!invoice) return null;

  const handleCopyPix = () => {
    if (!invoice.pixCode) return;
    navigator.clipboard.writeText(invoice.pixCode);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2000);
  };

  const handleCopyBarcode = () => {
    if (!invoice.barcode) return;
    navigator.clipboard.writeText(invoice.barcode);
    setCopiedBarcode(true);
    setTimeout(() => setCopiedBarcode(false), 2000);
  };

  const handleToggle = () => {
    if (invoice.status !== 'paid') {
      confetti({ particleCount: 70, spread: 60 });
    }
    onToggleStatus(invoice.id);
  };

  const isPaid = invoice.status === 'paid';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-slate-100 my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
          <div className="flex items-center space-x-3">
            <span
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: card?.color || '#8B5CF6' }}
            />
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                Fatura {invoice.issuer} • {invoice.period}
              </h3>
              <p className="text-xs text-slate-400">
                Cartão Final {invoice.cardLastDigits} • {invoice.transactions.length} transações registradas
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status & Highlights */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="p-3.5 bg-slate-800/80 rounded-2xl border border-slate-700/80">
            <span className="text-[11px] text-slate-400 block mb-0.5">Valor Total</span>
            <span className="text-xl font-black text-emerald-400">
              {formatCurrency(invoice.totalAmount)}
            </span>
          </div>

          <div className="p-3.5 bg-slate-800/80 rounded-2xl border border-slate-700/80">
            <span className="text-[11px] text-slate-400 block mb-0.5">Vencimento</span>
            <span className="text-base font-bold text-slate-100">
              {formatDate(invoice.dueDate)}
            </span>
          </div>

          <div className="p-3.5 bg-slate-800/80 rounded-2xl border border-slate-700/80">
            <span className="text-[11px] text-slate-400 block mb-0.5">Fechamento</span>
            <span className="text-sm font-semibold text-slate-200">
              {formatDate(invoice.closingDate)}
            </span>
          </div>

          <div className="p-3.5 bg-slate-800/80 rounded-2xl border border-slate-700/80">
            <span className="text-[11px] text-slate-400 block mb-0.5">Status</span>
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-bold inline-block ${
                isPaid
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}
            >
              {isPaid ? 'Fatura Paga' : 'Pendente'}
            </span>
          </div>
        </div>

        {/* PIX & Barcode Copia e Cola */}
        {(invoice.pixCode || invoice.barcode) && (
          <div className="bg-slate-800/50 border border-slate-700/80 rounded-2xl p-4 mb-6 space-y-3">
            <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              Dados para Pagamento Rápido
            </div>

            {invoice.pixCode && (
              <div className="flex items-center justify-between p-2.5 bg-slate-900 rounded-xl border border-slate-800 text-xs">
                <div className="overflow-hidden mr-2">
                  <div className="text-[10px] text-slate-400">PIX Copia e Cola</div>
                  <div className="font-mono text-slate-300 truncate max-w-sm sm:max-w-md">
                    {invoice.pixCode}
                  </div>
                </div>
                <button
                  onClick={handleCopyPix}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-colors flex items-center space-x-1 ${
                    copiedPix
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                  }`}
                >
                  {copiedPix ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedPix ? 'Copiado!' : 'Copiar PIX'}</span>
                </button>
              </div>
            )}

            {invoice.barcode && (
              <div className="flex items-center justify-between p-2.5 bg-slate-900 rounded-xl border border-slate-800 text-xs">
                <div className="overflow-hidden mr-2">
                  <div className="text-[10px] text-slate-400">Código de Barras</div>
                  <div className="font-mono text-slate-300 truncate max-w-sm sm:max-w-md">
                    {invoice.barcode}
                  </div>
                </div>
                <button
                  onClick={handleCopyBarcode}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-colors flex items-center space-x-1 ${
                    copiedBarcode
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                  }`}
                >
                  {copiedBarcode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedBarcode ? 'Copiado!' : 'Copiar'}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Transactions list */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Lançamentos da Fatura ({invoice.transactions.length})
            </span>
          </div>

          <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 border border-slate-800 rounded-2xl p-2 bg-slate-900/40">
            {invoice.transactions.map((t, idx) => {
              const mainCat = normalizeMainCategory(t.category, t.description);
              const estab = t.establishment || extractEstablishment(t.description, mainCat);
              const estabColor = getCategoryColor(estab);
              const catColor = getCategoryColor(mainCat);

              return (
                <div
                  key={`${invoice.id}-${t.id || 'tx'}-${idx}`}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/60 border border-slate-800/80 text-xs"
                >
                  <div className="flex items-center space-x-2.5 overflow-hidden">
                    <span className="text-slate-500 text-[11px] shrink-0 font-mono">{formatDate(t.date)}</span>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center space-x-1.5">
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: estabColor }} />
                        <span className="font-bold text-slate-100 truncate">{estab}</span>
                        {t.installmentTotal && t.installmentTotal > 1 && (
                          <span className="px-1.5 py-0.2 rounded bg-slate-700 text-slate-300 text-[10px] shrink-0 font-mono">
                            {t.installmentCurrent}/{t.installmentTotal}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono truncate">{t.description}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                      style={{
                        backgroundColor: `${catColor}20`,
                        color: catColor
                      }}
                    >
                      {mainCat}
                    </span>
                    <span className="font-bold text-slate-100 font-mono">{formatCurrency(t.amount)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-6 mt-6 border-t border-slate-800">
          <button
            onClick={() => {
              if (confirm('Tem certeza que deseja excluir esta fatura do sistema?')) {
                onDeleteInvoice(invoice.id);
                onClose();
              }
            }}
            className="p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-medium border border-rose-500/20 transition-colors flex items-center space-x-1.5"
          >
            <Trash2 className="w-4 h-4" />
            <span>Excluir Fatura</span>
          </button>

          <div className="flex items-center space-x-2.5">
            <button
              onClick={() => downloadCalendarICS(invoice.issuer, invoice.totalAmount, invoice.dueDate, invoice.barcode)}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center space-x-1.5"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Salvar na Agenda (.ics)</span>
            </button>

            <button
              onClick={handleToggle}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 shadow-md ${
                isPaid
                  ? 'bg-amber-600 hover:bg-amber-500 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
              }`}
            >
              <CheckCircle className="w-4 h-4" />
              <span>{isPaid ? 'Marcar como Pendente' : 'Marcar como Paga'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
