import React, { useState, useEffect } from 'react';
import { X, Bell, BellRing, CheckCircle, AlertTriangle, ShieldCheck, Calendar, Volume2 } from 'lucide-react';
import { DueAlert } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';

interface NotificationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: DueAlert[];
}

export const NotificationSettingsModal: React.FC<NotificationSettingsModalProps> = ({
  isOpen,
  onClose,
  alerts
}) => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [testSent, setTestSent] = useState(false);
  const [notifyDaysBefore, setNotifyDaysBefore] = useState<number>(3);
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const requestBrowserPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === 'granted') {
        sendTestNotification();
      }
    }
  };

  const sendTestNotification = () => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('💳 FaturaSmart: Lembrete de Vencimento', {
          body: 'Sua fatura Nubank (R$ 3.842,60) vence em 5 dias. Não esqueça de quitar para evitar juros.',
          tag: 'faturasmart-alert'
        });
        setTestSent(true);
        setTimeout(() => setTestSent(false), 3000);
      } catch (e) {
        console.error('Falha ao disparar notificacao', e);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-slate-100 my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Notificações de Vencimento</h3>
              <p className="text-xs text-slate-400">
                Configure alertas automáticos no navegador para nunca mais esquecer de pagar uma fatura.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Browser Permission Card */}
        <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div
              className={`w-3 h-3 rounded-full shrink-0 ${
                permission === 'granted'
                  ? 'bg-emerald-400 animate-pulse'
                  : permission === 'denied'
                  ? 'bg-rose-400'
                  : 'bg-amber-400'
              }`}
            />
            <div>
              <div className="text-xs font-semibold text-slate-200">
                Status das Notificações do Navegador:
              </div>
              <div className="text-xs text-slate-400 font-medium">
                {permission === 'granted'
                  ? 'Ativadas e autorizadas no seu navegador'
                  : permission === 'denied'
                  ? 'Bloqueadas pelo navegador (libere nas permissões da barra de URL)'
                  : 'Ainda não autorizadas pelo usuário'}
              </div>
            </div>
          </div>

          <div className="shrink-0 flex items-center space-x-2">
            {permission !== 'granted' ? (
              <button
                onClick={requestBrowserPermission}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm"
              >
                Permitir Notificações
              </button>
            ) : (
              <button
                onClick={sendTestNotification}
                className="px-3.5 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold"
              >
                {testSent ? 'Disparada!' : 'Testar Alerta'}
              </button>
            )}
          </div>
        </div>

        {/* Preferences */}
        <div className="space-y-4 mb-6">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Regras de Alerta
          </div>

          <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-200">Antecedência do Lembrete</div>
              <div className="text-[11px] text-slate-400">Quando você deseja começar a receber alertas antes do vencimento</div>
            </div>
            <select
              value={notifyDaysBefore}
              onChange={e => setNotifyDaysBefore(Number(e.target.value))}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
            >
              <option value={1}>1 dia antes</option>
              <option value={3}>3 dias antes</option>
              <option value={5}>5 dias antes</option>
              <option value={7}>7 dias antes</option>
            </select>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                Alerta Sonoro
              </div>
              <div className="text-[11px] text-slate-400">Tocar aviso sonoro de confirmação ao pagar ou receber lembrete</div>
            </div>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`w-11 h-6 rounded-full transition-colors p-0.5 ${
                soundEnabled ? 'bg-indigo-600' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  soundEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Upcoming bills timeline */}
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            Cronograma de Vencimentos em Monitoramento
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {alerts.map(alert => (
              <div
                key={alert.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/40 border border-slate-800 text-xs"
              >
                <div className="flex items-center space-x-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: alert.cardColor }}
                  />
                  <span className="font-semibold text-slate-200">{alert.cardName}</span>
                </div>

                <div className="flex items-center space-x-3">
                  <span className="text-slate-400">Vence em {formatDate(alert.dueDate)}</span>
                  <span className="font-bold text-slate-100">{formatCurrency(alert.totalAmount)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
          >
            Concluído
          </button>
        </div>

      </div>
    </div>
  );
};
