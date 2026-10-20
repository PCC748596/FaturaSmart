import React, { useState } from 'react';
import { AlertCircle, Clock, CheckCircle, Copy, Check, Calendar, ArrowRight, Sparkles, DollarSign } from 'lucide-react';
import confetti from 'canvas-confetti';
import { DueAlert } from '../types';
import { formatCurrency, formatDate, downloadCalendarICS } from '../utils/formatters';

interface DueAlertBannerProps {
  alerts: DueAlert[];
  onMarkAsPaid: (invoiceId: string) => void;
  onViewInvoice: (invoiceId: string) => void;
  onOpenUpload: () => void;
}

export const DueAlertBanner: React.FC<DueAlertBannerProps> = ({
  alerts,
  onMarkAsPaid,
  onViewInvoice,
  onOpenUpload
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const pendingAlerts = alerts.filter(a => a.status !== 'paid');

  const handleCopyPix = (alert: DueAlert) => {
    if (!alert.pixCode) return;
    navigator.clipboard.writeText(alert.pixCode);
    setCopiedId(alert.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handlePay = (invoiceId: string) => {
    // Fire celebratory confetti!
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });
    onMarkAsPaid(invoiceId);
  };

  if (pendingAlerts.length === 0) {
    return (
      <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 border border-emerald-500/20 rounded-2xl p-5 mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-semibold text-slate-100 text-sm sm:text-base flex items-center gap-2">
              Todas as faturas estão em dia! <Sparkles className="w-4 h-4 text-amber-400 inline" />
            </h4>
            <p className="text-xs text-slate-400">
              Nenhuma fatura pendente ou vencendo nos próximos dias. Importe uma nova fatura PDF quando fechar o próximo ciclo.
            </p>
          </div>
        </div>
        <button
          onClick={onOpenUpload}
          className="shrink-0 px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 transition-all flex items-center space-x-1.5 shadow-sm"
        >
          <span>Importar Nova Fatura</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-400" />
          Faturas Pendentes e Vencimentos Próximos ({pendingAlerts.length})
        </h3>
        <span className="text-xs text-slate-500">
          Notificações e lembretes de pagamento ativos
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pendingAlerts.map(alert => {
          const isOverdue = alert.status === 'overdue';
          const isToday = alert.status === 'today';
          const isCopied = copiedId === alert.id;

          return (
            <div
              key={alert.id}
              className={`relative rounded-2xl p-5 border transition-all duration-200 bg-slate-800/80 backdrop-blur-sm shadow-md flex flex-col justify-between ${
                isOverdue
                  ? 'border-rose-500/50 hover:border-rose-500 shadow-rose-950/20'
                  : isToday
                  ? 'border-amber-500/50 hover:border-amber-500 shadow-amber-950/20'
                  : 'border-slate-700 hover:border-slate-600'
              }`}
            >
              {/* Top Card Info & Status */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: alert.cardColor }}
                    />
                    <span className="font-semibold text-slate-100 text-sm">
                      {alert.cardName}
                    </span>
                  </div>

                  {/* Due Status Pill */}
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-medium border ${
                      isOverdue
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                        : isToday
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/30 font-bold animate-pulse'
                        : 'bg-indigo-500/15 text-indigo-300 border-indigo-500/20'
                    }`}
                  >
                    {isOverdue
                      ? `Venceu há ${Math.abs(alert.daysRemaining)} dias`
                      : isToday
                      ? 'Vence Hoje!'
                      : `Vence em ${alert.daysRemaining} dias`}
                  </span>
                </div>

                {/* Amount & Due Date */}
                <div className="my-2">
                  <div className="text-2xl font-black text-white tracking-tight">
                    {formatCurrency(alert.totalAmount)}
                  </div>
                  <div className="flex items-center text-xs text-slate-400 mt-1 space-x-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Vencimento oficial:</span>
                    <strong className="text-slate-200">{formatDate(alert.dueDate)}</strong>
                  </div>
                </div>
              </div>

              {/* Action Buttons Row */}
              <div className="mt-4 pt-3 border-t border-slate-700/60 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center space-x-1.5">
                  {/* Calendar Reminder Button */}
                  <button
                    onClick={() => downloadCalendarICS(alert.cardName, alert.totalAmount, alert.dueDate, alert.barcode)}
                    title="Exportar lembrete para Google/Apple Agenda (.ics)"
                    className="p-2 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors text-xs flex items-center space-x-1"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Agenda</span>
                  </button>

                  {/* Copy PIX Code */}
                  {alert.pixCode && (
                    <button
                      onClick={() => handleCopyPix(alert)}
                      title="Copiar Código PIX Copia e Cola"
                      className={`p-2 rounded-lg transition-colors text-xs flex items-center space-x-1 ${
                        isCopied
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-slate-700/60 hover:bg-slate-700 text-slate-300 hover:text-white'
                      }`}
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{isCopied ? 'PIX Copiado!' : 'Copiar PIX'}</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => onViewInvoice(alert.invoiceId)}
                    className="px-2.5 py-1.5 text-xs rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors"
                  >
                    Detalhes
                  </button>

                  <button
                    onClick={() => handlePay(alert.invoiceId)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-semibold text-xs transition-all shadow-sm flex items-center space-x-1"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Pagar</span>
                  </button>
                </div>
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
};
