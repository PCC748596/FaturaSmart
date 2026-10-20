import React, { useState } from 'react';
import { CreditCard as CardIcon, Plus, Edit2, Trash2, Calendar, Shield, Wifi, Check, X } from 'lucide-react';
import { CreditCard, CardBrand } from '../types';
import { formatCurrency } from '../utils/formatters';

interface CardManagerProps {
  cards: CreditCard[];
  selectedCardFilter: string | null;
  onSelectCardFilter: (cardId: string | null) => void;
  onAddCard: (card: CreditCard) => void;
  onUpdateCard: (card: CreditCard) => void;
  onDeleteCard: (cardId: string) => void;
  isOpenModal: boolean;
  onCloseModal: () => void;
}

const COLOR_PRESETS = [
  { name: 'Nubank Roxo', hex: '#8A05BE', secondary: '#530082' },
  { name: 'Itaú Laranja', hex: '#EC7000', secondary: '#B04700' },
  { name: 'C6 Carbon Black', hex: '#242424', secondary: '#111111' },
  { name: 'Inter Laranja', hex: '#FF7A00', secondary: '#C85700' },
  { name: 'Santander Vermelho', hex: '#CC0000', secondary: '#8A0000' },
  { name: 'Bradesco Rubi', hex: '#DC2626', secondary: '#991B1B' },
  { name: 'XP Investimentos', hex: '#000000', secondary: '#1E293B' },
  { name: 'BTG Pactual Blue', hex: '#001E62', secondary: '#000D2B' },
  { name: 'Neon Ciano', hex: '#00D7C4', secondary: '#008F83' }
];

export const CardManager: React.FC<CardManagerProps> = ({
  cards,
  selectedCardFilter,
  onSelectCardFilter,
  onAddCard,
  onUpdateCard,
  onDeleteCard,
  isOpenModal,
  onCloseModal
}) => {
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formIssuer, setFormIssuer] = useState('');
  const [formBrand, setFormBrand] = useState<CardBrand>('Mastercard');
  const [formLast4, setFormLast4] = useState('');
  const [formHolder, setFormHolder] = useState('TITULAR DO CARTÃO');
  const [formLimit, setFormLimit] = useState(10000);
  const [formColor, setFormColor] = useState('#8A05BE');
  const [formSecondaryColor, setFormSecondaryColor] = useState('#530082');
  const [formClosingDay, setFormClosingDay] = useState(15);
  const [formDueDay, setFormDueDay] = useState(25);

  const startEdit = (card: CreditCard) => {
    setEditingCard(card);
    setFormName(card.name);
    setFormIssuer(card.issuer);
    setFormBrand(card.brand);
    setFormLast4(card.last4);
    setFormHolder(card.cardHolder);
    setFormLimit(card.limitTotal);
    setFormColor(card.color);
    setFormSecondaryColor(card.secondaryColor || '#111827');
    setFormClosingDay(card.closingDay);
    setFormDueDay(card.dueDay);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCard) {
      onUpdateCard({
        ...editingCard,
        name: formName || 'Meu Cartão',
        issuer: formIssuer || 'Banco Emissor',
        brand: formBrand,
        last4: formLast4 || '0000',
        cardHolder: formHolder.toUpperCase(),
        limitTotal: Number(formLimit) || 1000,
        color: formColor,
        secondaryColor: formSecondaryColor,
        closingDay: Number(formClosingDay),
        dueDay: Number(formDueDay)
      });
    } else {
      const newCard: CreditCard = {
        id: `card-${Date.now()}`,
        name: formName || 'Novo Cartão',
        issuer: formIssuer || 'Banco Emissor',
        brand: formBrand,
        last4: formLast4 || '0000',
        cardHolder: formHolder.toUpperCase(),
        limitTotal: Number(formLimit) || 1000,
        color: formColor,
        secondaryColor: formSecondaryColor,
        closingDay: Number(formClosingDay),
        dueDay: Number(formDueDay)
      };
      onAddCard(newCard);
    }
    closeForm();
  };

  const closeForm = () => {
    setEditingCard(null);
    onCloseModal();
  };

  return (
    <div className="mb-8">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <CardIcon className="w-5 h-5 text-indigo-400" />
            Meus Cartões de Crédito ({cards.length})
          </h3>
          <p className="text-xs text-slate-400">
            Clique em um cartão para filtrar transações e faturas correspondentes.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {selectedCardFilter && (
            <button
              onClick={() => onSelectCardFilter(null)}
              className="text-xs px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            >
              Mostrar Todos
            </button>
          )}
          <button
            onClick={() => {
              setEditingCard(null);
              setFormName('');
              setFormIssuer('');
              setFormLast4('');
              setFormLimit(10000);
              setFormColor('#8A05BE');
              setFormSecondaryColor('#530082');
              onCloseModal();
            }}
            className="hidden"
          />
        </div>
      </div>

      {/* Cards Scrollable Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {cards.map(card => {
          const isSelected = selectedCardFilter === card.id;

          return (
            <div
              key={card.id}
              onClick={() => onSelectCardFilter(isSelected ? null : card.id)}
              style={{
                background: `linear-gradient(135deg, ${card.color} 0%, ${card.secondaryColor || '#0f172a'} 100%)`
              }}
              className={`relative rounded-2xl p-6 text-white cursor-pointer transition-all duration-300 shadow-xl overflow-hidden group select-none ${
                isSelected
                  ? 'ring-4 ring-indigo-400 scale-[1.02] shadow-indigo-500/20'
                  : 'hover:scale-[1.01] hover:shadow-2xl'
              }`}
            >
              {/* Glossy overlay effect */}
              <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />

              {/* Card Top: Issuer & Brand */}
              <div className="flex items-center justify-between mb-6 relative z-10">
                <span className="font-extrabold text-lg tracking-wide uppercase">
                  {card.issuer}
                </span>
                <div className="flex items-center space-x-2">
                  <Wifi className="w-5 h-5 text-white/70 rotate-90" />
                  <span className="text-xs font-bold uppercase px-2 py-0.5 rounded bg-black/30 backdrop-blur-sm border border-white/10">
                    {card.brand}
                  </span>
                </div>
              </div>

              {/* Chip Visual */}
              <div className="w-11 h-8 rounded-md bg-gradient-to-tr from-amber-200 via-amber-300 to-yellow-500 shadow-inner border border-amber-400/40 relative mb-4">
                <div className="absolute inset-1 border border-amber-600/30 rounded-sm" />
              </div>

              {/* Masked Card Number */}
              <div className="font-mono text-base sm:text-lg tracking-[0.2em] font-semibold text-white/90 mb-4">
                •••• •••• •••• {card.last4}
              </div>

              {/* Card Bottom: Holder, Dates & Limits */}
              <div className="flex items-end justify-between relative z-10 text-xs">
                <div>
                  <div className="text-[10px] text-white/70 uppercase tracking-wider">Titular</div>
                  <div className="font-semibold tracking-wider truncate max-w-[150px]">
                    {card.cardHolder}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] text-white/70 uppercase tracking-wider">
                    Fecha dia {card.closingDay} • Vence dia {card.dueDay}
                  </div>
                  <div className="font-bold text-sm text-emerald-300">
                    Limite: {formatCurrency(card.limitTotal)}
                  </div>
                </div>
              </div>

              {/* Quick Edit Action Buttons on Hover */}
              <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1.5 z-20">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    startEdit(card);
                  }}
                  className="p-1.5 rounded-lg bg-black/40 hover:bg-black/60 text-white backdrop-blur-sm transition-colors"
                  title="Editar Cartão"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                {cards.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Tem certeza que deseja excluir o cartão ${card.name}?`)) {
                        onDeleteCard(card.id);
                      }
                    }}
                    className="p-1.5 rounded-lg bg-rose-600/60 hover:bg-rose-600 text-white backdrop-blur-sm transition-colors"
                    title="Excluir Cartão"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Selected indicator */}
              {isSelected && (
                <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 px-3 py-0.5 rounded-full bg-white text-slate-900 text-[10px] font-extrabold flex items-center gap-1 shadow-md">
                  <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                  Filtro Ativo
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal: Add or Edit Card */}
      {(isOpenModal || editingCard) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl text-slate-100">
            <div className="flex items-center justify-between mb-5 border-b border-slate-800 pb-3">
              <h4 className="text-lg font-bold text-white flex items-center gap-2">
                <CardIcon className="w-5 h-5 text-indigo-400" />
                {editingCard ? 'Editar Cartão' : 'Cadastrar Novo Cartão'}
              </h4>
              <button
                onClick={closeForm}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nome / Apelido
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    placeholder="Ex: Nubank Ultravioleta"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Banco / Emissor
                  </label>
                  <input
                    type="text"
                    required
                    value={formIssuer}
                    onChange={e => setFormIssuer(e.target.value)}
                    placeholder="Ex: Nubank, Itaú, C6"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Bandeira
                  </label>
                  <select
                    value={formBrand}
                    onChange={e => setFormBrand(e.target.value as CardBrand)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Mastercard">Mastercard</option>
                    <option value="Visa">Visa</option>
                    <option value="Elo">Elo</option>
                    <option value="American Express">American Express</option>
                    <option value="Hipercard">Hipercard</option>
                    <option value="Outra">Outra</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Últimos 4 Dígitos
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    value={formLast4}
                    onChange={e => setFormLast4(e.target.value)}
                    placeholder="1234"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Limite Total (R$)
                  </label>
                  <input
                    type="number"
                    min={100}
                    step={100}
                    value={formLimit}
                    onChange={e => setFormLimit(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Dia de Fechamento
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={formClosingDay}
                    onChange={e => setFormClosingDay(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Dia de Vencimento
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={formDueDay}
                    onChange={e => setFormDueDay(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nome do Titular impresso
                </label>
                <input
                  type="text"
                  value={formHolder}
                  onChange={e => setFormHolder(e.target.value)}
                  placeholder="Ex: PAULO C CORREA"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white uppercase focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Color Preset Palette */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Cor do Cartão:
                </label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_PRESETS.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setFormColor(p.hex);
                        setFormSecondaryColor(p.secondary);
                      }}
                      style={{ backgroundColor: p.hex }}
                      className={`w-7 h-7 rounded-full border-2 transition-transform ${
                        formColor === p.hex ? 'border-white scale-110 shadow-lg' : 'border-slate-700 hover:scale-105'
                      }`}
                      title={p.name}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={closeForm}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30"
                >
                  {editingCard ? 'Salvar Alterações' : 'Cadastrar Cartão'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
