import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  X,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  ArrowRight,
  Plus,
  Trash2,
  Files,
  CreditCard as CreditCardIcon
} from 'lucide-react';
import { CreditCard, Invoice } from '../types';
import { formatCurrency, formatDate, getCategoryColor } from '../utils/formatters';

interface InvoiceUploaderProps {
  isOpen: boolean;
  onClose: () => void;
  cards: CreditCard[];
  onInvoiceImported: (invoice: Invoice, newCardCreated?: CreditCard) => void;
  onBatchInvoicesImported?: (items: { invoice: Invoice; newCardCreated?: CreditCard }[]) => void;
}

export interface BatchFileItem {
  id: string;
  file: File;
  fileName: string;
  fileSize: number;
  fileBase64?: string;
  status: 'pending' | 'processing' | 'password_required' | 'success' | 'error';
  password?: string;
  errorMsg?: string;
  extractedData?: any;
  selectedCardId?: string;
}

export const InvoiceUploader: React.FC<InvoiceUploaderProps> = ({
  isOpen,
  onClose,
  cards,
  onInvoiceImported,
  onBatchInvoicesImported
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [batchItems, setBatchItems] = useState<BatchFileItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // Global password input to apply across multiple locked invoices at once
  const [masterPassword, setMasterPassword] = useState('');
  const [showMasterPassword, setShowMasterPassword] = useState(false);

  // Item-level password visibility toggle
  const [showItemPassword, setShowItemPassword] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Active item being reviewed in the editor
  const activeItem = batchItems.find(item => item.id === selectedItemId) || batchItems[0] || null;

  // Count items by status
  const successCount = batchItems.filter(i => i.status === 'success').length;
  const passwordRequiredCount = batchItems.filter(i => i.status === 'password_required').length;
  const isProcessingAny = batchItems.some(i => i.status === 'processing' || i.status === 'pending');

  // Sum of total amounts for all successfully processed invoices in the batch
  const totalBatchAmount = batchItems
    .filter(i => i.status === 'success' && i.extractedData)
    .reduce((acc, curr) => acc + (Number(curr.extractedData.totalAmount) || 0), 0);

  // Total transactions count across all batch items
  const totalBatchTransactions = batchItems
    .filter(i => i.status === 'success' && i.extractedData?.transactions)
    .reduce((acc, curr) => acc + curr.extractedData.transactions.length, 0);

  // Drag and drop event handlers supporting multiple files
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesSelected(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFilesSelected(Array.from(e.target.files));
    }
    // Reset file input value so re-selecting the same file works
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Convert files into batch queue items and trigger asynchronous processing
  const handleFilesSelected = (files: File[]) => {
    const validPdfs = files.filter(f =>
      f.type.includes('pdf') ||
      f.name.toLowerCase().endsWith('.pdf') ||
      f.type.includes('image')
    );

    if (validPdfs.length === 0) return;

    const newItems: BatchFileItem[] = validPdfs.map((file, idx) => ({
      id: `batch-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
      file,
      fileName: file.name,
      fileSize: file.size,
      status: 'pending',
      password: masterPassword || ''
    }));

    setBatchItems(prev => {
      const merged = [...prev, ...newItems];
      if (!selectedItemId && merged.length > 0) {
        setSelectedItemId(merged[0].id);
      }
      return merged;
    });

    // Start processing each new item in the queue
    newItems.forEach(item => {
      processBatchItem(item.id, item.file, masterPassword || '');
    });
  };

  // Execute base64 reading and backend parsing request for a single item
  const processBatchItem = async (itemId: string, file: File, pwdToTry: string) => {
    updateItem(itemId, { status: 'processing', errorMsg: undefined });

    try {
      // 1. Read file to Base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
      });
      reader.readAsDataURL(file);
      const base64 = await base64Promise;

      // 2. Dispatch to backend API
      const res = await fetch('/api/parse-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileBase64: base64,
          mimeType: file.type || 'application/pdf',
          fileName: file.name,
          password: pwdToTry
        })
      });

      const result = await res.json().catch(() => ({}));

      if (!res.ok) {
        const isPasswordIssue =
          result.isPasswordRequired ||
          res.status === 422 ||
          /password|senha/i.test(result.error || '') ||
          /password|senha/i.test(result.message || '');

        if (isPasswordIssue) {
          updateItem(itemId, {
            status: 'password_required',
            fileBase64: base64,
            errorMsg: result.message || 'Fatura protegida por senha. No Itaú, são os 5 primeiros números do CPF.'
          });
          return;
        }

        throw new Error(result.error || result.details || 'Falha ao processar o arquivo.');
      }

      if (!result.data) {
        throw new Error('Formato de resposta inesperado do leitor de faturas.');
      }

      const rawData = result.data;

      // Match with existing credit cards or fallback to 'new'
      let matchedCard = cards.find(c =>
        (rawData.cardLastDigits && c.last4.includes(rawData.cardLastDigits)) ||
        (rawData.issuer && c.issuer.toLowerCase().includes(rawData.issuer.toLowerCase())) ||
        (rawData.issuer && rawData.issuer.toLowerCase().includes(c.issuer.toLowerCase()))
      );

      const targetCardId = matchedCard ? matchedCard.id : (cards[0]?.id || 'new');

      updateItem(itemId, {
        status: 'success',
        fileBase64: base64,
        extractedData: rawData,
        selectedCardId: targetCardId,
        errorMsg: undefined
      });
    } catch (err: any) {
      console.error(`Erro ao processar item ${file.name}:`, err);
      updateItem(itemId, {
        status: 'error',
        errorMsg: err.message || 'Erro ao processar arquivo.'
      });
    }
  };

  // Helper to update properties of a batch item in state
  const updateItem = (itemId: string, updates: Partial<BatchFileItem>) => {
    setBatchItems(prev =>
      prev.map(item => (item.id === itemId ? { ...item, ...updates } : item))
    );
  };

  // Update extractedData fields for a specific batch item during review
  const updateItemExtractedData = (itemId: string, fieldUpdates: Record<string, any>) => {
    setBatchItems(prev =>
      prev.map(item => {
        if (item.id !== itemId || !item.extractedData) return item;
        return {
          ...item,
          extractedData: {
            ...item.extractedData,
            ...fieldUpdates
          }
        };
      })
    );
  };

  // Apply master password to all items currently requiring password
  const handleApplyMasterPassword = () => {
    if (!masterPassword.trim()) return;

    batchItems.forEach(item => {
      if (item.status === 'password_required' || item.status === 'error') {
        processBatchItem(item.id, item.file, masterPassword.trim());
      }
    });
  };

  // Retry an individual locked item with its specific password
  const handleRetryItemPassword = (item: BatchFileItem, specificPassword: string) => {
    processBatchItem(item.id, item.file, specificPassword);
  };

  // Remove a single item from the batch
  const handleRemoveItem = (itemId: string) => {
    setBatchItems(prev => {
      const filtered = prev.filter(i => i.id !== itemId);
      if (selectedItemId === itemId) {
        setSelectedItemId(filtered.length > 0 ? filtered[0].id : null);
      }
      return filtered;
    });
  };

  // Reset entire batch
  const handleResetBatch = () => {
    setBatchItems([]);
    setSelectedItemId(null);
    setMasterPassword('');
  };

  // Final confirmation: builds Invoice and CreditCard objects and imports them into state
  const handleConfirmBatchImport = () => {
    const readyItems = batchItems.filter(i => i.status === 'success' && i.extractedData);
    if (readyItems.length === 0) return;

    const itemsToImport: { invoice: Invoice; newCardCreated?: CreditCard }[] = [];

    readyItems.forEach((item, index) => {
      const data = item.extractedData;
      let targetCardId = item.selectedCardId;
      let newCardToSave: CreditCard | undefined;

      // Create new card if requested or not matched
      if (targetCardId === 'new' || !targetCardId) {
        const isItau = data.issuer?.toLowerCase().includes('itau');
        const isNu = data.issuer?.toLowerCase().includes('nu');
        newCardToSave = {
          id: `card-${Date.now()}-${index}`,
          name: `${data.issuer || 'Cartão'} ${data.cardBrand || ''}`.trim(),
          issuer: data.issuer || 'Banco Emissor',
          brand: data.cardBrand || 'Visa',
          last4: data.cardLastDigits || '0000',
          cardHolder: data.cardHolder || 'TITULAR',
          limitTotal: Number(data.limitTotal) || Math.max(10000, Math.round((Number(data.totalAmount) || 3000) * 3)),
          color: isItau ? '#EC7000' : (isNu ? '#8A05BE' : '#3B82F6'),
          secondaryColor: isItau ? '#B04700' : (isNu ? '#530082' : '#1E293B'),
          closingDay: data.closingDate ? parseInt(data.closingDate.split('-')[2] || '8', 10) : 8,
          dueDay: data.dueDate ? parseInt(data.dueDate.split('-')[2] || '15', 10) : 15
        };
        targetCardId = newCardToSave.id;
      }

      const invoiceId = `inv-${Date.now()}-${index}`;
      const newInvoice: Invoice = {
        id: invoiceId,
        cardId: targetCardId,
        issuer: data.issuer || 'Banco Emissor',
        cardBrand: data.cardBrand || 'Mastercard',
        cardLastDigits: data.cardLastDigits || '0000',
        cardHolder: data.cardHolder || 'TITULAR',
        period: data.period || 'Mês Atual',
        closingDate: data.closingDate || new Date().toISOString().split('T')[0],
        dueDate: data.dueDate || new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
        totalAmount: Number(data.totalAmount) || 0,
        minimumPayment: Number(data.minimumPayment) || 0,
        status: data.status === 'paid' ? 'paid' : 'pending',
        paidAt: data.paidAt,
        pixCode: data.pixCode,
        barcode: data.barcode,
        invoiceSummary: data.invoiceSummary,
        transactions: (data.transactions || []).map((t: any, txIdx: number) => ({
          id: `tx-${invoiceId}-${txIdx}`,
          date: t.date || new Date().toISOString().split('T')[0],
          description: t.description || 'Despesa não identificada',
          amount: Number(t.amount) || 0,
          category: t.category || 'Outros',
          installmentCurrent: t.installmentCurrent || 1,
          installmentTotal: t.installmentTotal || 1
        })),
        importedAt: new Date().toISOString(),
        fileName: item.fileName
      };

      itemsToImport.push({ invoice: newInvoice, newCardCreated: newCardToSave });
    });

    // Support both batch callback and sequential callback
    if (onBatchInvoicesImported) {
      onBatchInvoicesImported(itemsToImport);
    } else {
      itemsToImport.forEach(item => {
        onInvoiceImported(item.invoice, item.newCardCreated);
      });
    }

    handleResetBatch();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl text-slate-100 p-5 sm:p-7 overflow-hidden my-4 max-h-[92vh] flex flex-col">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors z-10"
          title="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3 mb-5 shrink-0">
          <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
            <Files className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              Importar Faturas em Lote
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Suporta Múltiplos .PDF
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Selecione uma ou várias faturas de qualquer banco brasileiro (Itaú, Nubank, Bradesco, Santander, etc.).
            </p>
          </div>
        </div>

        {/* Master Password Bar if any file is locked or batch is loaded */}
        {passwordRequiredCount > 0 && (
          <div className="mb-4 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-2.5">
              <Lock className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <span className="font-bold text-amber-200">
                  {passwordRequiredCount} {passwordRequiredCount === 1 ? 'fatura protegida' : 'faturas protegidas'} por senha
                </span>
                <span className="text-slate-400 block text-[11px]">
                  No Itaú, a senha são os 5 primeiros dígitos do CPF do titular.
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <input
                  type={showMasterPassword ? 'text' : 'password'}
                  value={masterPassword}
                  onChange={e => setMasterPassword(e.target.value)}
                  placeholder="Ex: 5 dígitos do CPF"
                  className="bg-slate-950 border border-amber-500/40 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 pr-8 focus:outline-none focus:border-amber-400"
                />
                <button
                  type="button"
                  onClick={() => setShowMasterPassword(!showMasterPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showMasterPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              <button
                type="button"
                onClick={handleApplyMasterPassword}
                disabled={!masterPassword.trim()}
                className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-semibold text-xs transition-colors shrink-0"
              >
                Desbloquear Todas
              </button>
            </div>
          </div>
        )}

        {/* State 1: Dropzone when no files have been added yet */}
        {batchItems.length === 0 && (
          <div className="flex-1 flex flex-col justify-center">
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center ${
                dragActive
                  ? 'border-indigo-500 bg-indigo-500/15 scale-[1.01]'
                  : 'border-slate-700 bg-slate-800/40 hover:border-indigo-500/50 hover:bg-slate-800/70'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,application/pdf"
                onChange={handleFileInputChange}
                className="hidden"
              />
              <div className="w-16 h-16 rounded-3xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center mb-4 text-indigo-400">
                <UploadCloud className="w-8 h-8" />
              </div>
              <h4 className="font-bold text-slate-100 text-base mb-1.5">
                Arraste suas faturas em PDF aqui (uma ou várias)
              </h4>
              <p className="text-xs text-slate-400 max-w-md mb-5 leading-relaxed">
                Você pode selecionar <strong>múltiplos arquivos ao mesmo tempo</strong>. Suporta faturas de qualquer banco e faturas protegidas com senha (Itaú, Nubank, Bradesco, Santander, etc.).
              </p>
              <span className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/25 flex items-center gap-2">
                <Files className="w-4 h-4" />
                <span>Selecionar Faturas no Computador</span>
              </span>
            </div>

            {/* Privacy Guarantee Note */}
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1.5 text-slate-400">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                Processamento direto e seguro em memória no servidor
              </span>
              <span>Nenhum dado é salvo externamente</span>
            </div>
          </div>
        )}

        {/* State 2: Active Batch Management & Review Interface */}
        {batchItems.length > 0 && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            
            {/* Batch Status Bar */}
            <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 mb-4 shrink-0 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center space-x-3">
                <span className="font-semibold text-white">
                  Lote: {batchItems.length} {batchItems.length === 1 ? 'arquivo' : 'arquivos'}
                </span>
                <span className="text-slate-400">•</span>
                <span className="text-emerald-400 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {successCount} {successCount === 1 ? 'fatura pronta' : 'faturas prontas'}
                </span>
                {passwordRequiredCount > 0 && (
                  <>
                    <span className="text-slate-400">•</span>
                    <span className="text-amber-400 font-medium flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5" />
                      {passwordRequiredCount} com senha
                    </span>
                  </>
                )}
                {isProcessingAny && (
                  <>
                    <span className="text-slate-400">•</span>
                    <span className="text-indigo-400 flex items-center gap-1">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Processando...
                    </span>
                  </>
                )}
              </div>

              {successCount > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Total do Lote:</span>
                  <strong className="text-base text-emerald-400 font-mono font-black">
                    {formatCurrency(totalBatchAmount)}
                  </strong>
                  <span className="text-[11px] text-slate-400">({totalBatchTransactions} compras)</span>
                </div>
              )}
            </div>

            {/* Main Split: Left Files Tabs & Right Active Review */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 min-h-0 overflow-hidden">
              
              {/* Left Column: File Tabs Selector (4 cols on desktop) */}
              <div className="md:col-span-4 flex flex-col min-h-0 bg-slate-800/40 border border-slate-800 rounded-2xl p-2.5 overflow-hidden">
                <div className="flex items-center justify-between px-2 py-1.5 mb-1.5 border-b border-slate-700/60 text-xs">
                  <span className="font-bold text-slate-300">Arquivos Selecionados</span>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 text-[11px]"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Adicionar</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,application/pdf"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                </div>

                <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                  {batchItems.map(item => {
                    const isSelected = item.id === activeItem?.id;
                    const data = item.extractedData;

                    return (
                      <div
                        key={item.id}
                        onClick={() => setSelectedItemId(item.id)}
                        className={`group p-2.5 rounded-xl border text-left cursor-pointer transition-all flex items-start justify-between gap-2 ${
                          isSelected
                            ? 'bg-indigo-600/20 border-indigo-500/60 shadow-sm'
                            : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-800/80 hover:border-slate-700'
                        }`}
                      >
                        <div className="overflow-hidden min-w-0">
                          <div className="flex items-center gap-1.5 mb-1">
                            {item.status === 'success' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                            {item.status === 'password_required' && <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                            {item.status === 'processing' && <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin shrink-0" />}
                            {item.status === 'error' && <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                            
                            <span className="text-xs font-semibold text-slate-200 truncate">
                              {data?.issuer || item.fileName}
                            </span>
                          </div>

                          <div className="text-[11px] text-slate-400 flex items-center gap-2">
                            {data?.period && (
                              <span className="text-slate-300 font-medium">{data.period}</span>
                            )}
                            {item.status === 'success' && data?.totalAmount !== undefined && (
                              <span className="text-emerald-400 font-mono font-bold">
                                {formatCurrency(data.totalAmount)}
                              </span>
                            )}
                            {item.status === 'password_required' && (
                              <span className="text-amber-400">Requer senha</span>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveItem(item.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all shrink-0"
                          title="Remover arquivo do lote"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Active File Inspector / Review Form (8 cols on desktop) */}
              <div className="md:col-span-8 flex flex-col min-h-0 bg-slate-800/50 border border-slate-800 rounded-2xl p-4 overflow-y-auto">
                {activeItem ? (
                  <div>
                    
                    {/* Header for Active Item */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-slate-700/80 gap-2">
                      <div className="flex items-center space-x-2.5">
                        <FileText className="w-5 h-5 text-indigo-400 shrink-0" />
                        <div>
                          <div className="text-sm font-bold text-white flex items-center gap-2">
                            <span>{activeItem.fileName}</span>
                            {activeItem.extractedData?.period && (
                              <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                {activeItem.extractedData.period}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {(activeItem.fileSize / 1024).toFixed(1)} KB • Status: {
                              activeItem.status === 'success' ? 'Identificada com sucesso' :
                              activeItem.status === 'password_required' ? 'Aguardando senha' :
                              activeItem.status === 'processing' ? 'Lendo conteúdo...' : 'Pendente'
                            }
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(activeItem.id)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 text-[11px] transition-colors"
                        >
                          Remover do Lote
                        </button>
                      </div>
                    </div>

                    {/* Case 1: Password Required for Active Item */}
                    {activeItem.status === 'password_required' && (
                      <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-4">
                        <div className="flex items-center space-x-2.5">
                          <KeyRound className="w-5 h-5 text-amber-400 shrink-0" />
                          <h5 className="font-bold text-amber-200 text-sm">
                            Esta fatura requer senha de abertura
                          </h5>
                        </div>
                        <p className="text-xs text-slate-300">
                          {activeItem.errorMsg || 'Digite a senha definida pelo banco para desbloquear este arquivo PDF.'}
                        </p>

                        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] text-slate-300 space-y-1">
                          <span className="font-bold text-amber-400 block mb-0.5">💡 Senhas mais comuns:</span>
                          <div>• <strong>Itaú / Itaucard:</strong> 5 primeiros dígitos do CPF do titular.</div>
                          <div>• <strong>Nubank:</strong> Primeiros dígitos do CPF ou CPF sem pontos.</div>
                          <div>• <strong>Bradesco:</strong> CPF ou 4 dígitos do nascimento (DDMM).</div>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <div className="relative flex-1">
                            <input
                              type={showItemPassword ? 'text' : 'password'}
                              value={activeItem.password || ''}
                              onChange={e => updateItem(activeItem.id, { password: e.target.value })}
                              placeholder="Senha deste arquivo..."
                              className="w-full bg-slate-900 border border-amber-500/50 rounded-xl px-3 py-2 text-xs text-white pr-9 focus:outline-none focus:border-amber-400"
                            />
                            <button
                              type="button"
                              onClick={() => setShowItemPassword(!showItemPassword)}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                            >
                              {showItemPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRetryItemPassword(activeItem, activeItem.password || '')}
                            disabled={!activeItem.password?.trim()}
                            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-colors"
                          >
                            Desbloquear
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Case 2: Processing Spinner for Active Item */}
                    {activeItem.status === 'processing' && (
                      <div className="py-12 flex flex-col items-center justify-center text-center">
                        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mb-3" />
                        <h5 className="font-semibold text-white text-sm">Lendo fatura em PDF...</h5>
                        <p className="text-xs text-slate-400 mt-1">
                          Processando dados financeiros, datas e lançamentos.
                        </p>
                      </div>
                    )}

                    {/* Case 3: Successfully Extracted Data Form for Active Item */}
                    {activeItem.status === 'success' && activeItem.extractedData && (
                      <div className="space-y-4">
                        
                        {/* Notice for vector / scan documents if applicable */}
                        {activeItem.extractedData.isScanOrVectorPdf && (
                          <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-xs text-indigo-200">
                            💡 <strong>Fatura com arte vetorial/imagem:</strong> O emissor e o período foram reconhecidos. Confira o valor total e as datas nos campos abaixo para salvar com exatidão.
                          </div>
                        )}

                        {/* Editable Fields Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                          
                          {/* Valor Total */}
                          <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-700/80">
                            <label className="text-slate-400 font-semibold block mb-1">
                              Valor Total (R$) *
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={activeItem.extractedData.totalAmount ?? ''}
                              onChange={e => updateItemExtractedData(activeItem.id, {
                                totalAmount: parseFloat(e.target.value) || 0
                              })}
                              className="w-full bg-slate-950 border border-emerald-500/50 rounded-lg px-2.5 py-1.5 text-base font-black text-emerald-400 focus:outline-none focus:border-emerald-400 font-mono"
                            />
                            <span className="text-[10px] text-slate-400 mt-1 block">
                              Exibição: <strong>{formatCurrency(activeItem.extractedData.totalAmount || 0)}</strong>
                            </span>
                          </div>

                          {/* Data de Vencimento */}
                          <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-700/80">
                            <label className="text-slate-400 font-semibold block mb-1">
                              Data de Vencimento *
                            </label>
                            <input
                              type="date"
                              value={activeItem.extractedData.dueDate || ''}
                              onChange={e => updateItemExtractedData(activeItem.id, {
                                dueDate: e.target.value
                              })}
                              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-100 focus:outline-none focus:border-indigo-500"
                            />
                            <span className="text-[10px] text-slate-400 mt-1 block">
                              Formatado: <strong>{formatDate(activeItem.extractedData.dueDate)}</strong>
                            </span>
                          </div>

                          {/* Data de Fechamento */}
                          <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-700/80">
                            <label className="text-slate-400 font-semibold block mb-1">
                              Data de Fechamento / Corte
                            </label>
                            <input
                              type="date"
                              value={activeItem.extractedData.closingDate || ''}
                              onChange={e => updateItemExtractedData(activeItem.id, {
                                closingDate: e.target.value
                              })}
                              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-200 focus:outline-none focus:border-indigo-500"
                            />
                            <span className="text-[10px] text-slate-400 mt-1 block">
                              Formatado: <strong>{formatDate(activeItem.extractedData.closingDate)}</strong>
                            </span>
                          </div>

                          {/* Banco / Emissor */}
                          <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-700/80">
                            <label className="text-slate-400 font-semibold block mb-1">
                              Banco / Emissor
                            </label>
                            <input
                              type="text"
                              value={activeItem.extractedData.issuer || ''}
                              onChange={e => updateItemExtractedData(activeItem.id, {
                                issuer: e.target.value
                              })}
                              placeholder="Ex: Itaú, Nubank, Bradesco..."
                              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-200 focus:outline-none focus:border-indigo-500"
                            />
                          </div>

                          {/* Bandeira */}
                          <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-700/80">
                            <label className="text-slate-400 font-semibold block mb-1">
                              Bandeira
                            </label>
                            <select
                              value={activeItem.extractedData.cardBrand || 'Visa'}
                              onChange={e => updateItemExtractedData(activeItem.id, {
                                cardBrand: e.target.value
                              })}
                              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-200 focus:outline-none focus:border-indigo-500"
                            >
                              <option value="Visa">Visa</option>
                              <option value="Mastercard">Mastercard</option>
                              <option value="Elo">Elo</option>
                              <option value="American Express">American Express</option>
                              <option value="Outra">Outra</option>
                            </select>
                          </div>

                          {/* Final do Cartão */}
                          <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-700/80">
                            <label className="text-slate-400 font-semibold block mb-1">
                              Últimos 4 Dígitos
                            </label>
                            <input
                              type="text"
                              maxLength={4}
                              value={activeItem.extractedData.cardLastDigits || ''}
                              onChange={e => updateItemExtractedData(activeItem.id, {
                                cardLastDigits: e.target.value.replace(/\D/g, '')
                              })}
                              placeholder="Ex: 0093"
                              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono font-semibold text-slate-200 focus:outline-none focus:border-indigo-500"
                            />
                          </div>

                        </div>

                        {/* Card Association Select */}
                        <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
                          <label className="text-xs font-semibold text-slate-300 block mb-1.5 flex items-center gap-1.5">
                            <CreditCardIcon className="w-3.5 h-3.5 text-indigo-400" />
                            <span>Vincular esta fatura ao cartão:</span>
                          </label>
                          <select
                            value={activeItem.selectedCardId || 'new'}
                            onChange={e => updateItem(activeItem.id, { selectedCardId: e.target.value })}
                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                          >
                            {cards.map(card => (
                              <option key={card.id} value={card.id}>
                                {card.name} (Final {card.last4}) - Limite: {formatCurrency(card.limitTotal)}
                              </option>
                            ))}
                            <option value="new">
                              + Criar e cadastrar novo cartão ({activeItem.extractedData.issuer || 'Cartão'} {activeItem.extractedData.cardBrand || ''})
                            </option>
                          </select>
                        </div>

                        {/* Transactions Preview for Active Item */}
                        {activeItem.extractedData.transactions?.length > 0 && (
                          <div>
                            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
                              <span>Lançamentos Desta Fatura ({activeItem.extractedData.transactions.length})</span>
                              <span className="text-[11px] text-slate-500">Apurados no extrato</span>
                            </div>
                            <div className="max-h-40 overflow-y-auto space-y-1 pr-1 border border-slate-800 rounded-xl p-2 bg-slate-950/60">
                              {activeItem.extractedData.transactions.slice(0, 8).map((tx: any, idx: number) => (
                                <div
                                  key={`tx-preview-${activeItem.id}-${idx}`}
                                  className="flex items-center justify-between p-2 rounded-lg bg-slate-900/80 border border-slate-800/80 text-xs"
                                >
                                  <div className="flex items-center space-x-2 overflow-hidden">
                                    <span className="text-slate-500 text-[11px] shrink-0 font-mono">{formatDate(tx.date)}</span>
                                    <span className="font-medium text-slate-200 truncate">{tx.description}</span>
                                    {tx.installmentTotal > 1 && (
                                      <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 text-[10px] shrink-0">
                                        {tx.installmentCurrent}/{tx.installmentTotal}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center space-x-2 shrink-0">
                                    <span
                                      className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                                      style={{
                                        backgroundColor: `${getCategoryColor(tx.category)}20`,
                                        color: getCategoryColor(tx.category)
                                      }}
                                    >
                                      {tx.category}
                                    </span>
                                    <span className="font-bold text-slate-100 font-mono">
                                      {formatCurrency(tx.amount)}
                                    </span>
                                  </div>
                                </div>
                              ))}
                              {activeItem.extractedData.transactions.length > 8 && (
                                <div className="text-center text-[11px] text-slate-400 py-1">
                                  + mais {activeItem.extractedData.transactions.length - 8} compras identificadas
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                      </div>
                    )}

                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-slate-500 text-xs">
                    Selecione um arquivo à esquerda para conferir seus detalhes.
                  </div>
                )}
              </div>

            </div>

            {/* Footer Modal Actions */}
            <div className="mt-4 pt-3.5 border-t border-slate-800 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleResetBatch}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs font-medium transition-colors"
                >
                  Limpar Lote
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white text-xs font-medium transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar Mais .PDF</span>
                </button>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmBatchImport}
                  disabled={successCount === 0}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition-all flex items-center space-x-2"
                >
                  <span>
                    {successCount > 1
                      ? `Importar Todas as ${successCount} Faturas (${formatCurrency(totalBatchAmount)})`
                      : successCount === 1
                      ? `Confirmar e Importar Fatura (${formatCurrency(totalBatchAmount)})`
                      : 'Nenhuma Fatura Pronta'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
