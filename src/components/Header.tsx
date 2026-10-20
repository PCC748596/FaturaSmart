import React from 'react';
import { CreditCard as CardIcon, FileUp, Bell, PlusCircle, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { DueAlert } from '../types';

interface HeaderProps {
  alerts: DueAlert[];
  onOpenUpload: () => void;
  onOpenNewCard: () => void;
  onOpenNotifications: () => void;
  totalPendingAmount: number;
  totalCards: number;
}

export const Header: React.FC<HeaderProps> = ({
  alerts,
  onOpenUpload,
  onOpenNewCard,
  onOpenNotifications,
  totalPendingAmount,
  totalCards
}) => {
  const urgentCount = alerts.filter(a => a.status === 'overdue' || a.status === 'today' || (a.status === 'upcoming' && a.daysRemaining <= 3)).length;

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-emerald-400 flex items-center justify-center shadow-md shadow-indigo-500/20">
              <CardIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                  FaturaSmart
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                  v2.5
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Controle de Cartões, Leitor de Fatura PDF e Notificações de Vencimento
              </p>
            </div>
          </div>

          {/* Quick Stats Pill */}
          <div className="hidden lg:flex items-center space-x-6 text-sm bg-slate-800/80 border border-slate-700/60 rounded-xl px-4 py-2">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span className="text-slate-400">Cartões Ativos:</span>
              <span className="font-semibold text-slate-100">{totalCards}</span>
            </div>
            <div className="h-4 w-px bg-slate-700" />
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              <span className="text-slate-400">A Pagar este Mês:</span>
              <span className="font-semibold text-amber-400">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalPendingAmount)}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Notification Bell */}
            <button
              onClick={onOpenNotifications}
              className="relative p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700/60"
              title="Notificações de Vencimento"
              aria-label="Notificações"
            >
              <Bell className="w-5 h-5" />
              {urgentCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white text-xs font-bold flex items-center justify-center animate-bounce shadow-md">
                  {urgentCount}
                </span>
              )}
            </button>

            {/* New Card Button */}
            <button
              onClick={onOpenNewCard}
              className="hidden sm:inline-flex items-center space-x-2 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium border border-slate-700/80 transition-all hover:border-slate-600 shadow-sm"
            >
              <PlusCircle className="w-4 h-4 text-slate-400" />
              <span>Novo Cartão</span>
            </button>

            {/* Import PDF Button */}
            <button
              onClick={onOpenUpload}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-semibold shadow-md shadow-indigo-600/30 transition-all active:scale-[0.98]"
            >
              <FileUp className="w-4 h-4" />
              <span className="hidden xs:inline">Importar</span>
              <span>Fatura PDF</span>
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
