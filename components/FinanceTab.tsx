import React, { useState, useMemo, useRef } from 'react';
import { DayData, TransactionType, PaymentMethod, Transaction, Administrator } from '../types';
import { Download, ArrowUpCircle, ArrowDownCircle, Wallet, CreditCard, Coins, Banknote, TrendingUp, History, Settings, FileText, Image as ImageIcon, ChevronDown, Lock, AlertOctagon, Play, Trash2 } from 'lucide-react';
import html2canvas from 'html2canvas';

interface FinanceTabProps {
  days: Record<string, DayData>;
  currentDayId: string | null;
  administrators: Administrator[];
  onAddCashOp: (amount: number, type: TransactionType, description: string) => void;
  onCloseDay: (actualCash: number, adminId: string) => void;
  isShiftOpen: boolean;
  onOpenDay: (date: string, adminId: string, cash: number) => void;
  onSoftDeleteTransaction: (dayId: string, transactionId: string, reason: string) => Promise<void>;
}

const FinanceTab: React.FC<FinanceTabProps> = ({ days, currentDayId, administrators, onAddCashOp, onCloseDay, isShiftOpen, onOpenDay, onSoftDeleteTransaction }) => {
  // Helper to get local date string YYYY-MM-DD
  const getLocalDayString = () => {
      const d = new Date();
      const offset = d.getTimezoneOffset() * 60000;
      const localISOTime = (new Date(d.getTime() - offset)).toISOString().slice(0, 10);
      return localISOTime;
  };

  // --- State for Open Day Form ---
  const [openDate, setOpenDate] = useState(getLocalDayString());
  const [selectedAdminId, setSelectedAdminId] = useState('');
  const [openingCash, setOpeningCash] = useState('');

  // --- State for Dashboard ---
  const [viewDate, setViewDate] = useState<string>(currentDayId || getLocalDayString());
  const [activeSubTab, setActiveSubTab] = useState<'HISTORY' | 'MANAGE'>('HISTORY');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  // Management Form State
  const [manageType, setManageType] = useState<'ADD' | 'WITHDRAW'>('ADD');
  const [opAmount, setOpAmount] = useState('');
  const [opDesc, setOpDesc] = useState('');

  // Close Day Modal State
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closingCashInput, setClosingCashInput] = useState('');
  const [closingAdminId, setClosingAdminId] = useState('');
  const [deletingTxId, setDeletingTxId] = useState<string | null>(null);

  const dayData = days[viewDate];

  // Calculations
  const stats = useMemo(() => {
    if (!dayData) return null;
    const transactions = dayData.transactions || [];
    const activeTransactions = transactions.filter(t => !t.isDeleted);
    
    // Revenue Logic (Sales, Extensions, Prepayments)
    const isRevenue = (t: Transaction) => 
        t.type === TransactionType.SALE || 
        t.type === TransactionType.EXTENSION || 
        t.type === TransactionType.PREPAYMENT;

    const revenueTx = activeTransactions.filter(isRevenue);
    const totalRevenue = revenueTx.reduce((sum, t) => sum + t.amount, 0);

    // Cash Specifics
    const cashTx = activeTransactions.filter(t => t.paymentMethod === PaymentMethod.CASH);
    const cashRevenue = cashTx.filter(isRevenue).reduce((sum, t) => sum + t.amount, 0);
    
    // Card Specifics
    const cardTx = activeTransactions.filter(t => t.paymentMethod === PaymentMethod.CARD);
    const cardRevenue = cardTx.filter(isRevenue).reduce((sum, t) => sum + t.amount, 0);

    // Cash Movements (Non-revenue)
    const cashAdds = activeTransactions.filter(t => t.type === TransactionType.ADD_CASH).reduce((sum, t) => sum + t.amount, 0);
    const cashWithdraws = activeTransactions.filter(t => t.type === TransactionType.WITHDRAW_CASH).reduce((sum, t) => sum + t.amount, 0);
    
    // Current Cash in Register = Opening + Sales(Cash) + Adds - Withdraws
    const cashInHand = (dayData.openingCash || 0) + cashRevenue + cashAdds - cashWithdraws;

    return {
        totalRevenue,
        cashRevenue,
        cardRevenue,
        openingCash: dayData.openingCash || 0,
        cashInHand,
        transactions, // All transactions for the history list
    };
  }, [dayData]);

  // Handle Open Day Submit
  const handleOpenSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedAdminId) {
          alert('Выберите администратора');
          return;
      }
      const cash = parseFloat(openingCash);
      if (isNaN(cash)) return;

      onOpenDay(openDate, selectedAdminId, cash);
  };

  const handleOpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(opAmount);
    if (amount > 0) {
      onAddCashOp(
        amount, 
        manageType === 'ADD' ? TransactionType.ADD_CASH : TransactionType.WITHDRAW_CASH, 
        opDesc || (manageType === 'ADD' ? 'Внесение' : 'Инкассация')
      );
      setOpAmount('');
      setOpDesc('');
      alert('Операция выполнена успешно');
    }
  };

  const handleCloseSubmit = () => {
      if (!closingAdminId) {
          alert('Выберите администратора, закрывающего смену');
          return;
      }
      const actual = parseFloat(closingCashInput);
      if (isNaN(actual)) {
          alert('Введите сумму в кассе');
          return;
      }
      
      // Directly call close logic without secondary confirm/timeout to prevent freezing perception
      setShowCloseModal(false);
      onCloseDay(actual, closingAdminId);
      
      // Reset local form state
      setOpeningCash('');
      setSelectedAdminId('');
      setOpenDate(getLocalDayString());
      setClosingCashInput('');
      setClosingAdminId('');
  };

  const canEditHistory = !!dayData && !dayData.isClosed && viewDate === currentDayId;

  const handleSoftDeleteTx = async (t: Transaction) => {
    if (!dayData) return;
    if (t.isDeleted) return;
    if (!canEditHistory) {
      alert('Удаление операций доступно только в открытой текущей смене.');
      return;
    }

    const reason = window.prompt('Причина удаления операции (обязательно):', t.deletionReason || '');
    if (reason === null) return;
    const normalizedReason = reason.trim();
    if (!normalizedReason) {
      alert('Укажите причину удаления.');
      return;
    }

    const confirmed = window.confirm(
      `Пометить операцию как удаленную?\n\n${t.description}\n${t.amount} ₽`
    );
    if (!confirmed) return;

    try {
      setDeletingTxId(t.id);
      await onSoftDeleteTransaction(viewDate, t.id, normalizedReason);
    } catch (error) {
      console.error('Soft delete transaction failed', error);
      alert('Не удалось удалить операцию. Попробуйте еще раз.');
    } finally {
      setDeletingTxId(null);
    }
  };

  // --- Export Functions ---

  const handleExportPNG = async () => {
      setShowExportMenu(false);
      
      const wasManage = activeSubTab === 'MANAGE';
      if (wasManage) {
        setActiveSubTab('HISTORY');
        await new Promise(resolve => setTimeout(resolve, 300));
      } else {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      if (reportRef.current) {
          try {
              const canvas = await html2canvas(reportRef.current, {
                  scale: 2,
                  backgroundColor: '#f3f4f6',
                  useCORS: true,
                  logging: false,
              });
              
              const link = document.createElement('a');
              link.download = `Otchet_${viewDate}.png`;
              link.href = canvas.toDataURL('image/png');
              link.click();
          } catch (err) {
              console.error('PNG Export failed', err);
              alert('Не удалось создать изображение. Пожалуйста, попробуйте вариант "Word".');
          } finally {
              if (wasManage) setActiveSubTab('MANAGE');
          }
      }
  };

  const handleExportWord = () => {
    setShowExportMenu(false);
    if (!stats) return;
    
    const title = `Финансовый отчет за ${new Date(viewDate).toLocaleDateString('ru-RU')}`;
    const fmt = (n: number) => n.toLocaleString('ru-RU') + ' ₽';
    
    const tableRows = stats.transactions.slice().reverse().map(t => `
        <tr>
            <td style="border: 1px solid #ddd; padding: 8px;">${new Date(t.timestamp).toLocaleTimeString()}</td>
            <td style="border: 1px solid #ddd; padding: 8px;">${t.description}</td>
            <td style="border: 1px solid #ddd; padding: 8px;">${t.isDeleted ? `Удалено${t.deletionReason ? ` (${t.deletionReason})` : ''}` : ''}</td>
            <td style="border: 1px solid #ddd; padding: 8px;">${t.type === 'WITHDRAW_CASH' ? 'Изъятие' : t.type === 'ADD_CASH' ? 'Внесение' : 'Продажа'}</td>
            <td style="border: 1px solid #ddd; padding: 8px;">${t.paymentMethod}</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${t.isDeleted ? '' : (t.type === 'WITHDRAW_CASH' ? '-' : '') + fmt(t.amount)}</td>
        </tr>
    `).join('');

    const htmlContent = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
            <meta charset="utf-8">
            <title>${title}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                h1 { color: #111827; }
                h3 { color: #374151; margin-top: 20px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; }
                table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; }
                th { background-color: #f3f4f6; text-align: left; padding: 8px; border: 1px solid #ddd; }
                .kpi-table td { padding: 15px; border: 1px solid #e5e7eb; width: 33%; vertical-align: top; }
                .amount { font-size: 18px; font-weight: bold; display: block; margin-top: 5px; }
                .label { font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; }
            </style>
        </head>
        <body>
            <h1>${title}</h1>
            
            <h3>Финансовые Показатели</h3>
            <table class="kpi-table">
                <tr>
                    <td style="background-color: #eff6ff;">
                        <span class="label">Общая выручка</span>
                        <span class="amount" style="color: #2563eb;">${fmt(stats.totalRevenue)}</span>
                    </td>
                    <td>
                        <span class="label">Наличные (Продажи)</span>
                        <span class="amount">${fmt(stats.cashRevenue)}</span>
                    </td>
                    <td>
                        <span class="label">Карта (Продажи)</span>
                        <span class="amount">${fmt(stats.cardRevenue)}</span>
                    </td>
                </tr>
                 <tr>
                    <td>
                        <span class="label">Начало дня (Утро)</span>
                        <span class="amount">${fmt(stats.openingCash)}</span>
                    </td>
                    <td style="background-color: #f0fdf4;">
                        <span class="label">Конец дня (Вечер)</span>
                        <span class="amount" style="color: #059669;">${fmt(stats.cashInHand)}</span>
                    </td>
                    <td></td>
                </tr>
            </table>

            <h3>История Операций</h3>
            <table>
                <thead>
                    <tr>
                        <th>Время</th>
                        <th>Описание</th>
                        <th>Статус</th>
                        <th>Тип</th>
                        <th>Способ</th>
                        <th style="text-align: right;">Сумма</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows || '<tr><td colspan="6" style="text-align:center; padding: 20px;">Нет операций</td></tr>'}
                </tbody>
            </table>
        </body>
        </html>
    `;

    const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Otchet_${viewDate}.doc`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 100);
  };

  const renderTransactionTable = (txs: Transaction[]) => (
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                <tr>
                    <th className="p-4 w-32">Время</th>
                    <th className="p-4">Описание</th>
                    <th className="p-4 w-72">Статус / Действие</th>
                    <th className="p-4 w-32">Способ</th>
                    <th className="p-4 w-32 text-right">Сумма</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
                {txs.slice().reverse().map(t => (
                    <tr key={t.id} className={`transition-colors ${t.isDeleted ? 'bg-rose-50/40' : 'hover:bg-gray-50'}`}>
                        <td className="p-4 text-gray-500 font-mono">
                            {new Date(t.timestamp).toLocaleTimeString('ru-RU', {hour: '2-digit', minute:'2-digit'})}
                        </td>
                        <td className={`p-4 font-medium ${t.isDeleted ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                            {t.description}
                        </td>
                        <td className="p-4">
                            {t.isDeleted ? (
                                <div className="space-y-1">
                                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-rose-100 text-rose-700">
                                        Удалено
                                    </span>
                                    {t.deletionReason && (
                                        <div className="text-xs text-rose-700 break-words">
                                            Причина: {t.deletionReason}
                                        </div>
                                    )}
                                    <div className="text-[10px] text-gray-400">
                                        {t.deletedAt ? new Date(t.deletedAt).toLocaleString('ru-RU') : ''}
                                        {t.deletedBy ? ` • ${t.deletedBy}` : ''}
                                    </div>
                                </div>
                            ) : canEditHistory ? (
                                <button
                                    type="button"
                                    disabled={deletingTxId === t.id}
                                    onClick={() => handleSoftDeleteTx(t)}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold disabled:opacity-50"
                                >
                                    <Trash2 size={12} />
                                    {deletingTxId === t.id ? 'Удаление...' : 'Удалить'}
                                </button>
                            ) : (
                                <span className="text-xs text-gray-400">-</span>
                            )}
                        </td>
                        <td className="p-4">
                            <span className={`px-2 py-1 rounded-md text-xs font-bold flex w-fit items-center gap-1 ${
                                t.paymentMethod === PaymentMethod.CARD 
                                ? 'bg-purple-100 text-purple-700' 
                                : 'bg-green-100 text-green-700'
                            }`}>
                                {t.paymentMethod === PaymentMethod.CARD ? <CreditCard size={12}/> : <Banknote size={12}/>}
                                {t.paymentMethod === PaymentMethod.CARD ? 'Карта' : 'Наличные'}
                            </span>
                             {t.type === TransactionType.WITHDRAW_CASH && <span className="mt-1 block text-[10px] text-red-500 font-bold uppercase tracking-wider">Изъятие</span>}
                             {t.type === TransactionType.ADD_CASH && <span className="mt-1 block text-[10px] text-blue-500 font-bold uppercase tracking-wider">Внесение</span>}
                             {t.type === TransactionType.PREPAYMENT && <span className="mt-1 block text-[10px] text-yellow-600 font-bold uppercase tracking-wider">Предоплата</span>}
                        </td>
                        <td className={`p-4 text-right font-bold ${t.isDeleted ? 'text-gray-400 line-through' : t.type === TransactionType.WITHDRAW_CASH ? 'text-red-600' : 'text-gray-900'}`}>
                            {t.isDeleted ? 'Удалено' : `${t.type === TransactionType.WITHDRAW_CASH ? '-' : '+'}${t.amount.toLocaleString()} ₽`}
                        </td>
                    </tr>
                ))}
                {txs.length === 0 && (
                    <tr><td colSpan={5} className="p-8 text-center text-gray-400">Нет операций за этот день</td></tr>
                )}
            </tbody>
        </table>
      </div>
  );

  // --- Render: Open Day Form if shift closed ---
  if (!isShiftOpen) {
      return (
        <div className="max-w-lg mx-auto mt-10">
             <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-blue-100">
                 <div className="bg-blue-600 p-6 text-white text-center">
                     <Play size={48} className="mx-auto mb-4 text-blue-200"/>
                     <h2 className="text-2xl font-bold">Открыть смену</h2>
                     <p className="text-blue-100">Начните новый рабочий день</p>
                 </div>
                 <form onSubmit={handleOpenSubmit} className="p-8 space-y-6">
                     <div>
                         <label className="block text-sm font-bold text-gray-700 mb-2">Дата смены</label>
                         <input 
                            type="date" 
                            required
                            value={openDate}
                            onChange={e => setOpenDate(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-900 font-bold focus:ring-2 focus:ring-blue-200 outline-none"
                         />
                     </div>
                     
                     <div>
                         <label className="block text-sm font-bold text-gray-700 mb-2">Администратор</label>
                         <select 
                            required
                            value={selectedAdminId}
                            onChange={e => setSelectedAdminId(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-blue-200 outline-none appearance-none"
                         >
                             <option value="">-- Кто открывает? --</option>
                             {administrators.filter(a => a.isActive).map(a => (
                                 <option key={a.id} value={a.id}>{a.name}</option>
                             ))}
                         </select>
                     </div>

                     <div>
                         <label className="block text-sm font-bold text-gray-700 mb-2">Наличные в кассе (Утро)</label>
                         <div className="relative">
                             <span className="absolute left-4 top-3.5 text-gray-400 font-bold">₽</span>
                             <input 
                                type="number" 
                                required
                                min="0"
                                value={openingCash}
                                onChange={e => setOpeningCash(e.target.value)}
                                className="w-full pl-8 p-3 border border-gray-300 rounded-xl bg-white text-gray-900 font-bold text-lg focus:ring-2 focus:ring-blue-200 outline-none"
                                placeholder="0"
                             />
                         </div>
                     </div>

                     <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg transition-transform active:scale-95 text-lg">
                         Начать работу
                     </button>
                 </form>
             </div>
        </div>
      );
  }

  // --- Render: Dashboard if no data ---
  if (!stats) {
    return (
        <div className="p-10 text-center bg-white rounded-xl shadow-sm border border-gray-100 m-6">
            <h3 className="text-gray-500 font-medium">Нет данных за {viewDate}</h3>
            <p className="text-gray-400 text-sm">Смена не была открыта в этот день.</p>
            <input type="date" value={viewDate} onChange={e => setViewDate(e.target.value)} className="mt-4 border p-2 rounded" />
        </div>
    );
  }

  // --- Render: Full Dashboard ---
  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h2 className="text-3xl font-bold text-gray-900">Финансы</h2>
            <div className="flex items-center gap-2">
                <p className="text-gray-500">Управление кассой и отчетность</p>
                {dayData.isClosed && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded font-bold border border-red-200">СМЕНА ЗАКРЫТА</span>}
            </div>
        </div>
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-4 bg-white p-2 rounded-xl shadow-sm border border-gray-100 relative">
            <input 
                type="date" 
                value={viewDate}
                onChange={(e) => setViewDate(e.target.value)}
                className="bg-transparent border-none p-2 text-gray-900 font-medium focus:ring-0 outline-none"
            />
            <div className="h-6 w-px bg-gray-200"></div>
            
            <div className="relative">
                <button 
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    className="text-gray-600 hover:text-blue-600 transition-colors p-2 flex items-center gap-1 focus:outline-none"
                    title="Скачать отчет"
                >
                    <Download size={20} />
                    <ChevronDown size={14} />
                </button>
                
                {showExportMenu && (
                    <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 z-[100] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-2 border-b border-gray-50 bg-gray-50 text-xs font-bold text-gray-500 uppercase">Экспорт отчета</div>
                        <button onClick={handleExportPNG} className="w-full text-left px-4 py-3 text-sm hover:bg-blue-50 text-gray-700 flex items-center gap-3 border-b border-gray-50">
                            <ImageIcon size={18} className="text-blue-500"/> 
                            <div>
                                <span className="font-bold block">PNG Изображение</span>
                                <span className="text-xs text-gray-400">Скриншот таблицы</span>
                            </div>
                        </button>
                        <button onClick={handleExportWord} className="w-full text-left px-4 py-3 text-sm hover:bg-blue-50 text-gray-700 flex items-center gap-3 border-b border-gray-50">
                            <FileText size={18} className="text-blue-500"/> 
                            <div>
                                <span className="font-bold block">Word Документ</span>
                                <span className="text-xs text-gray-400">Для редактирования</span>
                            </div>
                        </button>
                    </div>
                )}
            </div>
            </div>
        </div>
      </div>

      {/* Main Content Area (Wrapped for Export) */}
      <div ref={reportRef} className="space-y-6">
          
          {/* KPI Cards Grid - 5 Boxes (Renamed as requested) */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {/* 1. Morning Cash */}
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                  <div className="text-xs font-bold text-gray-400 uppercase mb-1">Утренняя касса</div>
                  <div className="text-xl font-bold text-gray-900">{stats.openingCash} ₽</div>
              </div>

              {/* 2. Total Revenue */}
              <div className="bg-white p-4 rounded-xl shadow-sm border border-blue-200">
                  <div className="text-xs font-bold text-blue-500 uppercase mb-1">Итоговая выручка</div>
                  <div className="text-xl font-bold text-blue-700">{stats.totalRevenue} ₽</div>
              </div>

              {/* 3. Cash Revenue */}
              <div className="bg-white p-4 rounded-xl shadow-sm border border-green-200">
                  <div className="text-xs font-bold text-green-500 uppercase mb-1">Выручка наличными</div>
                  <div className="text-xl font-bold text-green-700">{stats.cashRevenue} ₽</div>
              </div>

              {/* 4. Card Revenue */}
              <div className="bg-white p-4 rounded-xl shadow-sm border border-purple-200">
                  <div className="text-xs font-bold text-purple-500 uppercase mb-1">Выручка по карте</div>
                  <div className="text-xl font-bold text-purple-700">{stats.cardRevenue} ₽</div>
              </div>

              {/* 5. Evening Cash */}
              <div className={`bg-white p-4 rounded-xl shadow-sm border ${dayData.isClosed ? 'border-red-200' : 'border-gray-200'}`}>
                  <div className="text-xs font-bold text-gray-400 uppercase mb-1">Вечерняя касса</div>
                  <div className={`text-xl font-bold ${dayData.isClosed ? 'text-red-600' : 'text-gray-900'}`}>
                      {dayData.isClosed ? dayData.closingCash : stats.cashInHand} ₽
                  </div>
                  {!dayData.isClosed && <span className="text-[10px] text-gray-400">Расчетная</span>}
              </div>
          </div>

          {/* Discrepancy Alert if closed */}
          {dayData.isClosed && dayData.discrepancy !== 0 && (
             <div className={`p-4 rounded-lg border ${dayData.discrepancy && dayData.discrepancy > 0 ? 'bg-red-50 border-red-100 text-red-800' : 'bg-green-50 border-green-100 text-green-800'}`}>
                 <span className="font-bold">Результат смены: </span>
                 Расхождение {dayData.discrepancy > 0 ? '+' : ''}{dayData.discrepancy} ₽ 
                 <span className="text-sm ml-2 opacity-75">(Факт - Расчет)</span>
             </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="flex border-b border-gray-100">
                  <button 
                     onClick={() => setActiveSubTab('HISTORY')}
                     className={`px-6 py-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeSubTab === 'HISTORY' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                  >
                      <History size={16}/> История Операций
                  </button>
                  {!dayData.isClosed && viewDate === currentDayId && (
                      <button 
                        onClick={() => setActiveSubTab('MANAGE')}
                        className={`px-6 py-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeSubTab === 'MANAGE' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                      >
                        <Settings size={16}/> Управление Кассой
                      </button>
                  )}
              </div>

              {activeSubTab === 'HISTORY' && (
                  renderTransactionTable(stats.transactions)
              )}

              {activeSubTab === 'MANAGE' && (
                  <div className="p-8 max-w-lg mx-auto">
                      <div className="bg-gray-50 p-1 rounded-lg flex mb-6">
                          <button onClick={() => setManageType('ADD')} className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${manageType === 'ADD' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>
                              Внесение
                          </button>
                          <button onClick={() => setManageType('WITHDRAW')} className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${manageType === 'WITHDRAW' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500'}`}>
                              Изъятие (Инкассация)
                          </button>
                      </div>

                      <form onSubmit={handleOpSubmit} className="space-y-4">
                          <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Сумма</label>
                              <div className="relative">
                                  <span className="absolute left-3 top-3 text-gray-400">₽</span>
                                  <input 
                                     type="number" 
                                     required
                                     min="1"
                                     value={opAmount}
                                     onChange={e => setOpAmount(e.target.value)}
                                     className="w-full pl-8 p-3 border border-gray-300 rounded-lg text-lg font-bold bg-white text-gray-900 focus:ring-2 focus:ring-blue-100 outline-none" 
                                     placeholder="0"
                                  />
                              </div>
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Комментарий</label>
                              <input 
                                 value={opDesc}
                                 onChange={e => setOpDesc(e.target.value)}
                                 className="w-full p-3 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:ring-2 focus:ring-blue-100 outline-none" 
                                 placeholder={manageType === 'ADD' ? 'Разменная монета...' : 'Выручка в сейф...'}
                              />
                          </div>
                          <button className={`w-full py-3 rounded-lg text-white font-bold shadow-md transition-transform active:scale-95 flex items-center justify-center gap-2 ${manageType === 'ADD' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'}`}>
                              {manageType === 'ADD' ? <ArrowUpCircle/> : <ArrowDownCircle/>}
                              Выполнить
                          </button>
                      </form>
                  </div>
              )}
          </div>
      </div>

      {/* Close Day Section (Always Visible if Shift is Open and viewing current day) */}
      {!dayData.isClosed && viewDate === currentDayId && (
           <div className="bg-white rounded-xl shadow-sm border border-red-100 p-6 flex flex-col md:flex-row items-center justify-between gap-4">
               <div>
                   <h3 className="font-bold text-red-800 text-lg">Завершение работы</h3>
                   <p className="text-sm text-red-600">Закройте смену в конце рабочего дня после подсчета кассы.</p>
               </div>
               <button 
                    onClick={() => setShowCloseModal(true)}
                    className="w-full md:w-auto bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-bold shadow-md flex items-center justify-center gap-2 transition-transform active:scale-95"
                >
                    <Lock size={18} /> Закрыть смену
                </button>
           </div>
      )}

      {/* Close Day Modal */}
      {showCloseModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
             <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="bg-red-600 p-4 text-white flex justify-between items-center">
                   <h3 className="font-bold text-lg flex items-center gap-2"><Lock size={20}/> Закрытие смены</h3>
                   <button onClick={() => setShowCloseModal(false)} className="hover:bg-red-700 p-1 rounded">✕</button>
                </div>
                <div className="p-6 space-y-4">
                    <div className="p-3 bg-yellow-50 border border-yellow-100 rounded text-sm text-yellow-800 flex gap-2">
                        <AlertOctagon className="shrink-0" size={20}/>
                        <p>Внимание! После закрытия смены все операции за сегодня будут заблокированы. Убедитесь, что все данные верны.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Администратор (Закрывает)</label>
                        <select 
                            value={closingAdminId}
                            onChange={(e) => setClosingAdminId(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-red-100 outline-none"
                        >
                            <option value="">-- Кто закрывает? --</option>
                            {administrators.map(admin => (
                                <option key={admin.id} value={admin.id}>{admin.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Фактическая сумма в кассе (Вечерняя касса)</label>
                        <input 
                            type="number"
                            value={closingCashInput}
                            onChange={(e) => setClosingCashInput(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg text-xl font-bold bg-white text-gray-900 focus:ring-2 focus:ring-red-100 outline-none"
                            placeholder="0"
                        />
                        <p className="text-xs text-gray-400 mt-1">Пересчитайте наличные в денежном ящике.</p>
                    </div>

                    <button 
                        onClick={handleCloseSubmit}
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg shadow-lg mt-2"
                    >
                        Закрыть смену
                    </button>
                </div>
             </div>
          </div>
      )}
    </div>
  );
};

export default FinanceTab;
