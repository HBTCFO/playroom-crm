import React, { useState, useEffect, useRef } from 'react';
import { Session, Tariff, Product, PaymentMethod, Discount, Client } from '../types';
import { Plus, X, Play, Coffee, Zap, Phone, AlertTriangle, Search, User, CreditCard, Banknote, Gift } from 'lucide-react';

interface SessionsTabProps {
  sessions: Session[];
  tariffs: Tariff[];
  products: Product[];
  discounts: Discount[];
  extensionRate: number;
  clients: Client[];
  bonusPercentage: number;
  onAddSession: (sessionData: any) => void;
  onAddExtraItem: (sessionId: string, product: Product) => void;
  onExtendSession: (sessionId: string, minutes: number, cost: number, method: PaymentMethod) => void;
  onCloseSession: (sessionId: string) => void;
  onCheckClient: (name: string, phone: string, childName: string, initialBonus: number) => void;
}

interface Toast {
  id: number;
  message: string;
}

const SessionsTab: React.FC<SessionsTabProps> = ({
  sessions,
  tariffs,
  products,
  discounts,
  extensionRate,
  clients,
  bonusPercentage,
  onAddSession,
  onAddExtraItem,
  onExtendSession,
  onCloseSession,
  onCheckClient
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  // Form State
  const [childName, setChildName] = useState('');
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  
  // Client Search State
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<Client[]>([]);

  // Bonus State
  const [foundClient, setFoundClient] = useState<Client | null>(null);
  const [useBonuses, setUseBonuses] = useState(false);
  const [bonusAmountToUse, setBonusAmountToUse] = useState<string>('');

  // Tariff Selection Mode
  const [pricingMode, setPricingMode] = useState<'STANDARD' | 'CUSTOM'>('STANDARD');
  const [selectedTariffId, setSelectedTariffId] = useState(tariffs[0]?.id || '');
  
  // Custom Mode State
  const [customPrice, setCustomPrice] = useState<string>('');
  const [customDuration, setCustomDuration] = useState<string>('60'); // Default 1h
  const [selectedDiscountId, setSelectedDiscountId] = useState(discounts[0]?.id || '');

  const activeSessions = sessions.filter(s => s.isActive);
  const suggestionRef = useRef<HTMLDivElement>(null);

  // Watch for phone changes to find client AND filter suggestions
  useEffect(() => {
    const normalizedInput = parentPhone.trim().toLowerCase();
    
    if (normalizedInput.length > 1) {
        const matches = clients.filter(c => 
            c.phone.includes(normalizedInput) || 
            c.name.toLowerCase().includes(normalizedInput)
        );
        setFilteredSuggestions(matches);
        
        // If direct match found for state logic (bonus check)
        const directMatch = clients.find(c => c.phone === parentPhone);
        setFoundClient(directMatch || null);
    } else {
        setFilteredSuggestions([]);
        setFoundClient(null);
        setShowSuggestions(false);
    }
  }, [parentPhone, clients]);

  // Handle clicking outside suggestions
  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (suggestionRef.current && !suggestionRef.current.contains(event.target as Node)) {
              setShowSuggestions(false);
          }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectClient = (client: Client) => {
      setParentPhone(client.phone);
      setParentName(client.name);
      setFoundClient(client);
      setShowSuggestions(false);
  };

  const addToast = (message: string) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 7000); 
  };

  const getBasePrice = () => {
      if (pricingMode === 'STANDARD') {
          return tariffs.find(t => t.id === selectedTariffId)?.price || 0;
      }
      return parseFloat(customPrice) || 0;
  };

  const calculateFinancials = () => {
      const basePrice = getBasePrice();
      let bonusesUsed = 0;
      
      if (useBonuses && foundClient && foundClient.bonusBalance) {
          const wanted = parseFloat(bonusAmountToUse) || 0;
          // Can't use more than balance or more than price
          bonusesUsed = Math.min(wanted, foundClient.bonusBalance, basePrice);
      }

      const finalPrice = Math.max(0, basePrice - bonusesUsed);
      // Accrue on the amount actually paid (money), not the full price if bonuses were used
      // Use prop bonusPercentage
      const accrued = Math.floor(finalPrice * (bonusPercentage / 100));

      return { basePrice, bonusesUsed, finalPrice, accrued };
  };

  const { basePrice, bonusesUsed, finalPrice, accrued } = calculateFinancials();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let tariffName = '';
    let duration = 0;
    let discountReason: string | null = null;

    if (pricingMode === 'STANDARD') {
        const tariff = tariffs.find(t => t.id === selectedTariffId);
        if (!tariff) return;
        tariffName = tariff.name;
        duration = tariff.durationMinutes;
    } else {
        const discount = discounts.find(d => d.id === selectedDiscountId);
        tariffName = `Спец. тариф (${discount?.name || 'Свой'})`;
        duration = parseInt(customDuration);
        discountReason = discount?.name || 'Ручная скидка';
    }

    onAddSession({
      childName,
      parentName,
      parentPhone,
      tariffId: pricingMode === 'STANDARD' ? selectedTariffId : 'custom',
      tariffName,
      paymentMethod,
      duration,
      price: basePrice, // Store original price
      discountReason,
      useBonuses: bonusesUsed,
      accruedBonuses: accrued
    });

    // Auto-create client
    if (parentName && parentPhone) {
        // Pass accrued bonuses so new clients get them immediately
        onCheckClient(parentName, parentPhone, childName, accrued);
    }

    setIsModalOpen(false);
    // Reset
    setChildName('');
    setParentName('');
    setParentPhone('');
    setPaymentMethod(PaymentMethod.CASH);
    setCustomPrice('');
    setPricingMode('STANDARD');
    setUseBonuses(false);
    setBonusAmountToUse('');
  };

  return (
    <div className="p-4 space-y-6 relative">
      {/* Toast Container */}
      <div className="fixed top-20 right-4 z-50 flex flex-col gap-3 pointer-events-none">
        {toasts.map(t => (
            <div key={t.id} className="pointer-events-auto bg-yellow-400 text-gray-900 px-4 py-3 rounded-xl shadow-2xl border-l-8 border-yellow-600 flex items-center gap-3 animate-[slideIn_0.3s_ease-out] max-w-sm">
                <AlertTriangle className="text-yellow-800 shrink-0" size={24} />
                <span className="font-bold text-sm md:text-base">{t.message}</span>
                <button onClick={() => setToasts(prev => prev.filter(item => item.id !== t.id))} className="ml-auto text-yellow-800 hover:text-black">
                  <X size={16} />
                </button>
            </div>
        ))}
      </div>

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Активные сессии</h2>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors shadow-md font-medium"
        >
          <Plus size={20} />
          Новая сессия
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activeSessions.length === 0 && (
          <div className="col-span-full text-center py-20 text-gray-500 bg-white rounded-xl border-2 border-dashed border-blue-200">
            <div className="flex flex-col items-center">
              <Play size={48} className="text-blue-200 mb-4" />
              <p className="text-lg font-medium text-gray-700">Нет активных детей в игровой комнате</p>
              <p className="text-sm text-gray-500">Нажмите "Новая сессия", чтобы добавить ребенка</p>
            </div>
          </div>
        )}
        
        {activeSessions.map(session => (
          <SessionCard 
            key={session.id} 
            session={session} 
            products={products}
            extensionRate={extensionRate}
            onAddItem={(product) => onAddExtraItem(session.id, product)}
            onExtend={(mins, cost, method) => onExtendSession(session.id, mins, cost, method)}
            onClose={() => onCloseSession(session.id)}
            onWarning={() => addToast(`Внимание! У ${session.childName} заканчивается время (менее 5 мин)!`)}
          />
        ))}
      </div>

      {/* New Session Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden my-8">
            <div className="bg-blue-600 p-4 text-white flex justify-between items-center">
              <h3 className="font-bold text-lg">Регистрация ребенка</h3>
              <button onClick={() => setIsModalOpen(false)} className="hover:bg-blue-700 p-1 rounded">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5 bg-white">
              <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-1">Имя ребенка <span className="text-red-500">*</span></label>
                    <input 
                      required
                      value={childName}
                      onChange={e => setChildName(e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 placeholder-gray-400"
                      placeholder="Иван"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                      <div className="relative" ref={suggestionRef}>
                        <label className="block text-sm font-medium text-gray-800 mb-1">Телефон (Поиск)</label>
                        <div className="relative">
                            <input 
                              type="tel"
                              value={parentPhone}
                              onChange={e => { setParentPhone(e.target.value); setShowSuggestions(true); }}
                              onFocus={() => setShowSuggestions(true)}
                              className="w-full bg-white border border-gray-300 rounded-lg p-2.5 pl-8 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 placeholder-gray-400"
                              placeholder="8900..."
                            />
                            <Search className="absolute left-2.5 top-3 text-gray-400" size={16} />
                        </div>
                        
                        {/* Dropdown Suggestions */}
                        {showSuggestions && filteredSuggestions.length > 0 && (
                            <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-xl mt-1 max-h-48 overflow-y-auto">
                                {filteredSuggestions.map(c => (
                                    <button
                                        key={c.id}
                                        type="button"
                                        onClick={() => handleSelectClient(c)}
                                        className="w-full text-left px-4 py-2 hover:bg-blue-50 flex flex-col border-b border-gray-50 last:border-0"
                                    >
                                        <span className="font-bold text-sm text-gray-900">{c.name}</span>
                                        <span className="text-xs text-gray-500">{c.phone}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-800 mb-1">Имя родителя</label>
                        <input 
                          value={parentName}
                          onChange={e => setParentName(e.target.value)}
                          className="w-full bg-white border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 placeholder-gray-400"
                          placeholder="Мария"
                        />
                      </div>
                  </div>
              </div>

               {/* Client Found / Bonus Info */}
              {foundClient && (
                  <div className="bg-purple-50 p-3 rounded-lg border border-purple-100 flex justify-between items-center animate-in fade-in duration-300">
                      <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-purple-200 flex items-center justify-center text-purple-700">
                             <User size={16} />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-purple-700 uppercase">Клиент в базе</p>
                            <p className="text-sm font-medium text-gray-900">{foundClient.name}</p>
                          </div>
                      </div>
                      <div className="text-right">
                          <p className="text-xs text-gray-500">Бонусы</p>
                          <p className="text-lg font-bold text-purple-700">{foundClient.bonusBalance || 0}</p>
                      </div>
                  </div>
              )}

              {/* Pricing Switch */}
              <div className="bg-gray-100 p-1 rounded-lg flex">
                  <button 
                    type="button"
                    onClick={() => setPricingMode('STANDARD')}
                    className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${pricingMode === 'STANDARD' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    По прайсу
                  </button>
                  <button 
                    type="button"
                    onClick={() => setPricingMode('CUSTOM')}
                    className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${pricingMode === 'CUSTOM' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Скидка / Своя цена
                  </button>
              </div>

              {pricingMode === 'STANDARD' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-2">Выберите тариф</label>
                    <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
                      {tariffs.map(t => (
                        <label key={t.id} className={`border rounded-lg p-3 flex justify-between items-center cursor-pointer transition-colors ${selectedTariffId === t.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-blue-50 bg-white'}`}>
                          <div className="flex items-center gap-2">
                            <input 
                              type="radio" 
                              name="tariff" 
                              value={t.id}
                              checked={selectedTariffId === t.id}
                              onChange={() => setSelectedTariffId(t.id)}
                              className="text-blue-600 focus:ring-blue-500"
                            />
                            <span className="font-medium text-gray-900">{t.name}</span>
                          </div>
                          <div className="text-right">
                             <div className="font-bold text-gray-900">{t.price} ₽</div>
                             <div className="text-xs text-gray-500">{t.durationMinutes === 0 ? '∞' : t.durationMinutes} мин</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
              ) : (
                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100 space-y-3">
                      <div>
                          <label className="block text-sm font-medium text-gray-800 mb-1">Причина скидки / Тип</label>
                          <select 
                             value={selectedDiscountId}
                             onChange={e => setSelectedDiscountId(e.target.value)}
                             className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-yellow-400 outline-none"
                          >
                              <option value="">-- Выберите причину --</option>
                              {discounts.map(d => (
                                  <option key={d.id} value={d.id}>{d.name}</option>
                              ))}
                          </select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-sm font-medium text-gray-800 mb-1">Время (мин)</label>
                              <input 
                                type="number" min="0"
                                value={customDuration}
                                onChange={e => setCustomDuration(e.target.value)}
                                className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-gray-900 outline-none"
                              />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-gray-800 mb-1">Сумма к оплате (₽)</label>
                              <input 
                                type="number" min="0" required
                                value={customPrice}
                                onChange={e => setCustomPrice(e.target.value)}
                                placeholder="0"
                                className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-gray-900 font-bold outline-none focus:ring-2 focus:ring-yellow-400"
                              />
                          </div>
                      </div>
                  </div>
              )}

              {/* Payment Section */}
              <div className="space-y-3">
                  <div className="flex gap-4">
                      <label className="flex-1 cursor-pointer">
                           <input type="radio" name="pay" checked={paymentMethod === PaymentMethod.CASH} onChange={() => setPaymentMethod(PaymentMethod.CASH)} className="hidden peer"/>
                           <div className="w-full border p-2 rounded-lg text-center peer-checked:bg-green-100 peer-checked:border-green-400 peer-checked:text-green-800 font-bold transition-colors flex items-center justify-center gap-2"><Banknote size={16}/> Наличные</div>
                      </label>
                      <label className="flex-1 cursor-pointer">
                           <input type="radio" name="pay" checked={paymentMethod === PaymentMethod.CARD} onChange={() => setPaymentMethod(PaymentMethod.CARD)} className="hidden peer"/>
                           <div className="w-full border p-2 rounded-lg text-center peer-checked:bg-purple-100 peer-checked:border-purple-400 peer-checked:text-purple-800 font-bold transition-colors flex items-center justify-center gap-2"><CreditCard size={16}/> Карта</div>
                      </label>
                  </div>

                  {foundClient && foundClient.bonusBalance && foundClient.bonusBalance > 0 && (
                      <div className="border border-purple-200 rounded-lg p-3 bg-purple-50/50">
                          <label className="flex items-center gap-2 cursor-pointer mb-2">
                              <input 
                                type="checkbox" 
                                checked={useBonuses}
                                onChange={e => setUseBonuses(e.target.checked)}
                                className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                              />
                              <span className="font-bold text-gray-800 text-sm">Списать бонусы?</span>
                          </label>
                          {useBonuses && (
                              <div className="flex items-center gap-2">
                                  <input 
                                    type="number" 
                                    value={bonusAmountToUse}
                                    onChange={e => setBonusAmountToUse(e.target.value)}
                                    placeholder="Сколько?"
                                    className="w-full p-2 text-sm border border-purple-300 rounded bg-white outline-none focus:ring-1 focus:ring-purple-400"
                                    max={Math.min(foundClient.bonusBalance, basePrice)}
                                  />
                                  <span className="text-xs text-gray-500 whitespace-nowrap">Макс: {Math.min(foundClient.bonusBalance, basePrice)}</span>
                              </div>
                          )}
                      </div>
                  )}
              </div>
              
              {/* Summary */}
              <div className="border-t pt-4 flex justify-between items-center">
                  <div className="text-xs text-gray-500">
                      {bonusesUsed > 0 && <div>Списание: -{bonusesUsed} Б</div>}
                      {accrued > 0 && <div className="text-green-600 font-bold flex items-center gap-1"><Gift size={10}/> Будет начислено: +{accrued} Б ({bonusPercentage}%)</div>}
                  </div>
                  <div className="text-right">
                      <div className="text-xs text-gray-400 uppercase">Итого к оплате</div>
                      <div className="text-2xl font-bold text-gray-900">{finalPrice} ₽</div>
                  </div>
              </div>

              <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg shadow-lg transition-all transform active:scale-95 mt-2">
                Добавить сессию
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const SessionCard: React.FC<{
  session: Session;
  products: Product[];
  extensionRate: number;
  onAddItem: (product: Product) => void;
  onExtend: (minutes: number, cost: number, method: PaymentMethod) => void;
  onClose: () => void;
  onWarning: () => void;
}> = ({ session, products, extensionRate, onAddItem, onExtend, onClose, onWarning }) => {
  const [timeLeft, setTimeLeft] = useState<string>('--:--');
  const [isWarning, setIsWarning] = useState(false);
  const [isOvertime, setIsOvertime] = useState(false);
  const [showGoodsMenu, setShowGoodsMenu] = useState(false);
  const [showExtendModal, setShowExtendModal] = useState(false);
  
  // Refs to prevent multi-trigger
  const hasWarnedRef = useRef(false);
  
  // Extend Modal State
  const [extendMinutes, setExtendMinutes] = useState(30);
  const [extendMethod, setExtendMethod] = useState<PaymentMethod>(PaymentMethod.CASH);

  const extendCost = extendMinutes * extensionRate;

  useEffect(() => {
    if (!session.endTime) {
      setTimeLeft('БЕЗЛИМИТ');
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const diff = session.endTime! - now;

      if (diff <= 0) {
        setTimeLeft('ВРЕМЯ ВЫШЛО');
        setIsOvertime(true);
        setIsWarning(true);
      } else {
        const minutes = Math.floor((diff / 1000 / 60) % 60);
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const seconds = Math.floor((diff / 1000) % 60);
        
        setTimeLeft(`${hours > 0 ? hours + ':' : ''}${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        
        if (diff < 5 * 60 * 1000) { // Less than 5 mins
          setIsWarning(true);
          if (!hasWarnedRef.current) {
             onWarning();
             hasWarnedRef.current = true;
          }
        } else {
          setIsWarning(false);
          hasWarnedRef.current = false; // Reset if time extended
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [session.endTime, onWarning]);

  const handleExtendSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onExtend(extendMinutes, extendCost, extendMethod);
    setShowExtendModal(false);
    // Reset states
    setIsWarning(false);
    hasWarnedRef.current = false;
    setIsOvertime(false);
  };

  const extraTotal = session.extraItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <div className={`bg-white rounded-xl shadow-md border-2 relative overflow-visible flex flex-col transition-all duration-500 ${isOvertime ? 'border-red-500 ring-4 ring-red-200' : 'border-white'}`}>
      
      {/* Warning Blinking Overlay */}
      {isWarning && !isOvertime && (
        <div className="absolute inset-[-4px] z-0 rounded-xl border-4 border-yellow-400 opacity-80 animate-pulse pointer-events-none"></div>
      )}

      <div className={`p-4 relative z-10 rounded-t-xl ${isOvertime ? 'bg-red-50' : 'bg-indigo-50'} flex justify-between items-start border-b border-blue-100`}>
        <div>
          <h3 className="font-bold text-lg text-gray-900 leading-tight">{session.childName}</h3>
          <div className="text-sm text-gray-600 flex flex-col mt-1">
             {session.parentName && <span>{session.parentName}</span>}
             {session.parentPhone && (
               <span className="text-xs flex items-center gap-1 mt-0.5 text-gray-500">
                 <Phone size={12}/> {session.parentPhone}
               </span>
             )}
          </div>
        </div>
        <div className={`text-xl font-mono font-bold ${isWarning ? 'text-red-600' : 'text-blue-700'}`}>
          {timeLeft}
        </div>
      </div>

      <div className="p-4 flex-1 space-y-3 bg-white relative z-10">
        <div className="flex justify-between text-sm border-b border-gray-100 pb-2">
          <span className="text-gray-500">Тариф:</span>
          <span className="font-medium text-gray-900 text-right">
            {session.tariffName}
            {session.discountReason && <span className="block text-xs text-green-600">{session.discountReason}</span>}
            {session.paidWithBonuses ? <span className="block text-xs text-purple-600">Бонусы: -{session.paidWithBonuses}</span> : null}
          </span>
        </div>

        {/* Extra Items List */}
        {session.extraItems.length > 0 && (
          <div className="bg-indigo-50/50 rounded-lg p-2 text-sm space-y-1 border border-indigo-100">
            <p className="text-xs text-indigo-400 font-semibold uppercase">Дополнительно:</p>
            {session.extraItems.map((item, idx) => (
              <div key={idx} className="flex justify-between text-gray-800">
                <span>{item.productName} {item.quantity > 1 && `x${item.quantity}`}</span>
                <span className="font-medium">{item.price * item.quantity} ₽</span>
              </div>
            ))}
            <div className="border-t border-indigo-200 pt-1 mt-1 flex justify-between font-bold text-gray-900">
              <span>Итого доп:</span>
              <span>{extraTotal} ₽</span>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="p-4 bg-white border-t border-gray-100 flex flex-col gap-2 relative z-10 rounded-b-xl">
        <div className="flex gap-2">
             {/* Extend Button (only if not unlimited) */}
             {session.endTime !== null && (
                 <button 
                   onClick={() => setShowExtendModal(true)}
                   className="flex-1 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 font-medium py-2 px-3 rounded-lg text-sm flex items-center justify-center gap-1 transition-colors"
                 >
                   <Zap size={16} />
                   +Время
                 </button>
             )}

            {/* Goods Button */}
            <div className="relative flex-1">
                <button 
                onClick={() => setShowGoodsMenu(!showGoodsMenu)}
                className="w-full bg-white border border-gray-300 text-gray-700 hover:bg-blue-50 hover:border-blue-300 font-medium py-2 px-3 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors"
                >
                <Coffee size={16} />
                Товары
                </button>
                
                {/* Quick Add Menu */}
                {showGoodsMenu && (
                    <div className="absolute bottom-full left-0 w-64 bg-white shadow-xl rounded-lg border border-gray-200 mb-2 p-2 z-50">
                        <div className="flex justify-between items-center mb-2 pb-2 border-b">
                            <span className="font-bold text-xs text-gray-500 uppercase">Добавить товар</span>
                            <button onClick={() => setShowGoodsMenu(false)} className="text-gray-500 hover:text-gray-700"><X size={14}/></button>
                        </div>
                        <div className="max-h-48 overflow-y-auto space-y-1">
                            {products.map(p => (
                                <button 
                                    key={p.id}
                                    onClick={() => { onAddItem(p); setShowGoodsMenu(false); }}
                                    className="w-full text-left p-2 hover:bg-blue-50 rounded flex justify-between items-center text-sm text-gray-900"
                                >
                                    <span>{p.name}</span>
                                    <span className="font-bold text-blue-600">{p.price} ₽</span>
                                </button>
                            ))}
                            {products.length === 0 && <p className="text-xs text-center text-gray-400">Нет товаров</p>}
                        </div>
                    </div>
                )}
            </div>
        </div>

        <button 
          onClick={onClose}
          className="w-full bg-gray-900 hover:bg-black text-white font-medium py-2 px-4 rounded-lg text-sm"
        >
          Завершить
        </button>
      </div>

      {/* Extend Modal */}
      {showExtendModal && (
         <div className="absolute inset-0 z-20 bg-white flex flex-col justify-center p-4 rounded-xl animate-in fade-in duration-200 border-2 border-yellow-400 shadow-xl">
             <h4 className="text-center font-bold text-gray-900 mb-4">Продлить время</h4>
             <form onSubmit={handleExtendSubmit} className="space-y-3">
                 <div>
                     <label className="text-xs text-gray-500 block mb-1">Минуты</label>
                     <div className="flex gap-2">
                         {[15, 30, 60].map(m => (
                             <button 
                                key={m} type="button" 
                                onClick={() => setExtendMinutes(m)}
                                className={`flex-1 text-xs py-1 rounded border ${extendMinutes === m ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-600 border-gray-200'}`}
                             >
                                 {m}
                             </button>
                         ))}
                     </div>
                     <input 
                        type="number" min="1"
                        value={extendMinutes}
                        onChange={e => setExtendMinutes(parseInt(e.target.value) || 0)}
                        className="mt-2 w-full bg-white border border-gray-300 rounded p-2 text-center text-gray-900 font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                     />
                 </div>
                 
                 <div className="bg-yellow-50 p-2 rounded text-center border border-yellow-100">
                     <div className="text-xs text-gray-500">К оплате:</div>
                     <div className="text-xl font-bold text-gray-900">{extendCost} ₽</div>
                     <div className="text-[10px] text-gray-400">({extensionRate} ₽/мин)</div>
                 </div>

                 <div className="flex gap-2 text-xs">
                  <label className="flex-1 flex items-center justify-center gap-1 cursor-pointer bg-white border p-2 rounded hover:bg-gray-50 border-gray-200">
                    <input 
                      type="radio" 
                      checked={extendMethod === PaymentMethod.CASH}
                      onChange={() => setExtendMethod(PaymentMethod.CASH)}
                    />
                    <span className="text-gray-900">Нал</span>
                  </label>
                  <label className="flex-1 flex items-center justify-center gap-1 cursor-pointer bg-white border p-2 rounded hover:bg-gray-50 border-gray-200">
                    <input 
                      type="radio" 
                      checked={extendMethod === PaymentMethod.CARD}
                      onChange={() => setExtendMethod(PaymentMethod.CARD)}
                    />
                    <span className="text-gray-900">Карта</span>
                  </label>
                </div>

                 <div className="flex gap-2 mt-2">
                     <button type="button" onClick={() => setShowExtendModal(false)} className="flex-1 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded text-sm font-medium">Отмена</button>
                     <button type="submit" className="flex-1 py-2 bg-blue-600 text-white rounded font-bold text-sm hover:bg-blue-700">ОК</button>
                 </div>
             </form>
         </div>
      )}
    </div>
  );
};

export default SessionsTab;