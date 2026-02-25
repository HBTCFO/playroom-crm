import React, { useMemo, useState } from 'react';
import { Client, Child, FeedbackType, SubscriptionPlan, PaymentMethod, ClientSubscription, DayData } from '../types';
import { Users, Search, Plus, Trash2, Edit2, Phone, ExternalLink, User, X, CreditCard, Check, BookUser, Cake, Baby, School, Backpack, Filter, MessageSquareWarning, Lightbulb, Send, Clock3, Ticket } from 'lucide-react';

interface ClientsTabProps {
  clients: Client[];
  subscriptionPlans: SubscriptionPlan[];
  days: Record<string, DayData>;
  isShiftOpen: boolean;
  onUpdateClients: (clients: Client[]) => Promise<void>;
  onDeleteClient: (id: string) => void;
  onIssueCard: (clientId: string, initialBonus?: number) => Promise<void>;
  onAddBonusesManual: (clientId: string, amount: number) => Promise<void>;
  onSellSubscription: (clientId: string, planId: string, method: PaymentMethod, note?: string) => Promise<void>;
  onAdjustSubscriptionMinutes: (clientId: string, subscriptionId: string, deltaMinutes: number, reason: string) => Promise<void>;
  onReverseSubscriptionUsageByDay: (dayId: string, sessionId: string, reason: string) => Promise<void>;
  onAddFeedback: (type: FeedbackType, content: string) => void;
}

interface SubscriptionUsageHistoryItem {
  dayId: string;
  sessionId: string;
  childName: string;
  planName: string;
  minutesUsed: number;
  startTime: number;
  isReversed: boolean;
  reversalReason?: string | null;
}

// Age Filter Types
type AgeFilterType = 'ALL' | '0-1' | '2-3' | '4-6' | '7+';

const ClientsTab: React.FC<ClientsTabProps> = ({
  clients,
  subscriptionPlans,
  days,
  isShiftOpen,
  onUpdateClients,
  onDeleteClient,
  onIssueCard,
  onAddBonusesManual,
  onSellSubscription,
  onAdjustSubscriptionMinutes,
  onReverseSubscriptionUsageByDay,
  onAddFeedback
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  // Filters State
  const [filterBirthdayMonth, setFilterBirthdayMonth] = useState(false);
  const [ageFilter, setAgeFilter] = useState<AgeFilterType>('ALL');

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [socialMedia, setSocialMedia] = useState('');
  const [childrenList, setChildrenList] = useState<Child[]>([]);
  const [notes, setNotes] = useState('');

  // Child Form Input State (inside modal)
  const [newChildName, setNewChildName] = useState('');
  const [newChildDob, setNewChildDob] = useState('');

  // Feedback Form State
  const [complaintText, setComplaintText] = useState('');
  const [suggestionText, setSuggestionText] = useState('');
  const [subscriptionClient, setSubscriptionClient] = useState<Client | null>(null);
  const [subscriptionPlanId, setSubscriptionPlanId] = useState('');
  const [subscriptionPayMethod, setSubscriptionPayMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [subscriptionNote, setSubscriptionNote] = useState('');
  const [sellingSubscription, setSellingSubscription] = useState(false);
  const [reversingSubscriptionUsageKey, setReversingSubscriptionUsageKey] = useState<string | null>(null);

  // --- Calculations ---

  const calculateAge = (dobString?: string | null) => {
    if (!dobString) return null;
    const birthDate = new Date(dobString);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
  };

  const getUpcomingBirthday = (dobString?: string | null) => {
      if(!dobString) return false;
      const today = new Date();
      const birthDate = new Date(dobString);
      return birthDate.getMonth() === today.getMonth();
  };

  const filteredClients = clients.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.phone.includes(searchTerm);
    if (!matchesSearch) return false;

    if (filterBirthdayMonth) {
        const hasBirthdayChild = c.children.some(child => getUpcomingBirthday(child.dob));
        if (!hasBirthdayChild) return false;
    }

    if (ageFilter !== 'ALL') {
        const hasChildInAgeGroup = c.children.some(child => {
            const age = calculateAge(child.dob);
            if (age === null) return false; // Can't filter if no DOB

            switch (ageFilter) {
                case '0-1': return age >= 0 && age <= 1;
                case '2-3': return age >= 2 && age <= 3;
                case '4-6': return age >= 4 && age <= 6;
                case '7+': return age >= 7;
                default: return false;
            }
        });
        if (!hasChildInAgeGroup) return false;
    }

    return true;
  });

  const openModal = (client?: Client) => {
      if (client) {
          setEditingClient(client);
          setName(client.name);
          setPhone(client.phone);
          setSocialMedia(client.socialMedia || '');
          setChildrenList(client.children || []);
          setNotes(client.notes || '');
      } else {
          setEditingClient(null);
          setName('');
          setPhone('');
          setSocialMedia('');
          setChildrenList([]);
          setNotes('');
      }
      setNewChildName('');
      setNewChildDob('');
      setIsModalOpen(true);
  };

  const handleAddChildToForm = () => {
      if (newChildName) {
          setChildrenList([...childrenList, {
              id: Date.now().toString(),
              name: newChildName,
              dob: newChildDob || null
          }]);
          setNewChildName('');
          setNewChildDob('');
      }
  };

  const handleRemoveChildFromForm = (id: string) => {
      setChildrenList(childrenList.filter(c => c.id !== id));
  };

  const handleSave = async (e: React.FormEvent) => {
      e.preventDefault();
      
      const clientData: Client = {
          id: editingClient ? editingClient.id : Date.now().toString(),
          name: name.trim(),
          phone: phone.trim(),
          socialMedia: socialMedia.trim() || null,
          children: childrenList,
          notes: notes.trim() || null,
          registrationDate: editingClient ? editingClient.registrationDate : new Date().toISOString().slice(0, 10),
          bonusCardNumber: editingClient ? (editingClient.bonusCardNumber ?? null) : null,
          bonusBalance: editingClient ? (editingClient.bonusBalance ?? 0) : 0,
          isAddedToContacts: editingClient ? editingClient.isAddedToContacts : false,
          subscriptions: editingClient ? (editingClient.subscriptions || []) : []
      };

      try {
          if (editingClient) {
              await onUpdateClients(clients.map(c => c.id === editingClient.id ? clientData : c));
          } else {
              await onUpdateClients([...clients, clientData]);
          }
          setIsModalOpen(false);
      } catch (error) {
          console.error('Failed to save client', error);
          alert('Не удалось сохранить клиента. Проверьте данные и попробуйте снова.');
      }
  };

  const confirmDelete = () => {
      if (deleteConfirmId) {
          onDeleteClient(deleteConfirmId);
          setDeleteConfirmId(null);
      }
  };

  const toggleContactStatus = (client: Client) => {
      const updatedClient = { ...client, isAddedToContacts: !client.isAddedToContacts };
      onUpdateClients(clients.map(c => c.id === client.id ? updatedClient : c));
  };

  const submitComplaint = () => {
      if(complaintText.trim()) {
          onAddFeedback('COMPLAINT', complaintText);
          setComplaintText('');
          alert('Жалоба отправлена владельцу.');
      }
  };

  const submitSuggestion = () => {
      if(suggestionText.trim()) {
          onAddFeedback('SUGGESTION', suggestionText);
          setSuggestionText('');
          alert('Предложение отправлено владельцу.');
      }
  };

  const activeSubscriptionPlans = useMemo(
    () => subscriptionPlans.filter(p => p.isActive),
    [subscriptionPlans]
  );

  const subscriptionUsageHistoryByPhone = useMemo<Record<string, SubscriptionUsageHistoryItem[]>>(() => {
    const result: Record<string, SubscriptionUsageHistoryItem[]> = {};

    Object.entries(days).forEach(([dayId, day]) => {
      (day.sessions || []).forEach(session => {
        if (!session.parentPhone || !session.subscriptionUsage || session.isActive) return;

        if (!result[session.parentPhone]) {
          result[session.parentPhone] = [];
        }

        result[session.parentPhone].push({
          dayId,
          sessionId: session.id,
          childName: session.childName,
          planName: session.subscriptionUsage.planName,
          minutesUsed: session.subscriptionUsage.minutesUsed || 0,
          startTime: session.startTime,
          isReversed: !!session.subscriptionUsage.isReversed,
          reversalReason: session.subscriptionUsage.reversalReason || null,
        });
      });
    });

    Object.values(result).forEach(items => items.sort((a, b) => b.startTime - a.startTime));

    return result;
  }, [days]);

  const getComputedSubscriptionStatus = (sub: ClientSubscription) => {
    if (sub.status === 'CANCELLED') return 'CANCELLED';
    if ((sub.remainingMinutes || 0) <= 0) return 'USED_UP';
    if (sub.expiresAt && sub.expiresAt < new Date().toISOString()) return 'EXPIRED';
    return 'ACTIVE';
  };

  const formatMinutes = (minutes?: number | null) => {
    const total = Math.max(0, Math.floor(minutes || 0));
    const h = Math.floor(total / 60);
    const m = total % 60;
    return h > 0 ? `${h}ч ${m}м` : `${m}м`;
  };

  const formatDateTime = (timestamp: number) =>
    new Date(timestamp).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });

  const requestBonusAmount = (title: string, defaultValue: string = '0', allowZero = false): number | null => {
      const raw = window.prompt(title, defaultValue);
      if (raw === null) return null;
      const amount = Math.floor(Number(raw.trim() || '0'));
      if (!Number.isFinite(amount) || amount < 0 || (!allowZero && amount <= 0)) {
          alert(allowZero ? 'Введите число 0 или больше.' : 'Введите положительное число бонусов.');
          return null;
      }
      return amount;
  };

  const handleIssueCardWithInitialBonus = async (client: Client) => {
      const initialBonus = requestBonusAmount('Сколько бонусов начислить сразу при выпуске карты?', '0', true);
      if (initialBonus === null) return;
      try {
          await onIssueCard(client.id, initialBonus);
      } catch (error) {
          console.error('Failed to issue bonus card', error);
          alert('Не удалось оформить бонусную карту.');
      }
  };

  const handleManualBonusAccrual = async (client: Client) => {
      const amount = requestBonusAmount(`Сколько бонусов начислить клиенту ${client.name}?`, '100');
      if (amount === null) return;
      try {
          await onAddBonusesManual(client.id, amount);
          alert(`Начислено ${amount} Б`);
      } catch (error) {
          console.error('Failed to add bonuses', error);
          alert('Не удалось начислить бонусы.');
      }
  };

  const openSellSubscriptionModal = (client: Client) => {
      if (!isShiftOpen) {
          alert('Продажа абонемента доступна только в открытой смене (для записи в кассу).');
          return;
      }
      if (activeSubscriptionPlans.length === 0) {
          alert('Нет активных шаблонов абонементов. Создайте их во вкладке владельца.');
          return;
      }
      setSubscriptionClient(client);
      setSubscriptionPlanId(activeSubscriptionPlans[0]?.id || '');
      setSubscriptionPayMethod(PaymentMethod.CASH);
      setSubscriptionNote('');
  };

  const handleSellSubscriptionSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!subscriptionClient || !subscriptionPlanId) return;
      try {
          setSellingSubscription(true);
          await onSellSubscription(subscriptionClient.id, subscriptionPlanId, subscriptionPayMethod, subscriptionNote);
          setSubscriptionClient(null);
      } catch (error) {
          console.error('Failed to sell subscription', error);
          alert('Не удалось оформить абонемент. Проверьте открытую смену и попробуйте снова.');
      } finally {
          setSellingSubscription(false);
      }
  };

  const handleAdjustSubscription = async (client: Client, sub: ClientSubscription) => {
      const action = window.prompt('Корректировка часов: введите + для начисления или - для списания', '+');
      if (action === null) return;
      const isAdd = action.trim() !== '-';
      const valueRaw = window.prompt(`Сколько минут ${isAdd ? 'начислить' : 'списать'}?`, isAdd ? '60' : '30');
      if (valueRaw === null) return;
      const minutes = Math.floor(Number(valueRaw.trim()));
      if (!Number.isFinite(minutes) || minutes <= 0) {
          alert('Введите положительное число минут.');
          return;
      }
      const reason = window.prompt('Причина корректировки (обязательно):', '');
      if (reason === null || !reason.trim()) {
          alert('Укажите причину.');
          return;
      }
      try {
          await onAdjustSubscriptionMinutes(client.id, sub.id, isAdd ? minutes : -minutes, reason.trim());
          alert(`Абонемент скорректирован (${isAdd ? '+' : '-'}${minutes} мин).`);
      } catch (error) {
          console.error('Failed to adjust subscription', error);
          alert('Не удалось скорректировать абонемент.');
      }
  };

  const handleReverseSubscriptionUsageFromHistory = async (item: SubscriptionUsageHistoryItem) => {
      const reason = window.prompt('Причина возврата минут абонемента (обязательно):', '');
      if (reason === null || !reason.trim()) {
          alert('Укажите причину возврата.');
          return;
      }

      const normalizedReason = reason.trim();
      const confirmed = window.confirm(
          `Вернуть ${formatMinutes(item.minutesUsed)} по сессии "${item.childName}" (${formatDateTime(item.startTime)})?`
      );
      if (!confirmed) return;

      const opKey = `${item.dayId}:${item.sessionId}`;
      try {
          setReversingSubscriptionUsageKey(opKey);
          await onReverseSubscriptionUsageByDay(item.dayId, item.sessionId, normalizedReason);
          alert('Минуты абонемента возвращены.');
      } catch (error) {
          console.error('Failed to reverse subscription usage from client history', error);
          alert('Не удалось вернуть минуты абонемента.');
      } finally {
          setReversingSubscriptionUsageKey(null);
      }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto h-full flex flex-col relative">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Users className="text-blue-600" /> Клиентская База
            </h2>
            <div className="flex gap-2">
                <button 
                    onClick={() => openModal()} 
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold shadow-md flex items-center gap-2 transition-transform active:scale-95"
                >
                    <Plus size={20} /> Добавить
                </button>
            </div>
        </div>

        {/* Feedback Section (Row) */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Complaint Field */}
            <div className="bg-red-50/50 border border-red-100 rounded-xl p-4 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-red-700 font-bold text-sm uppercase">
                    <MessageSquareWarning size={18}/> Жалоба
                </div>
                <textarea 
                    value={complaintText}
                    onChange={e => setComplaintText(e.target.value)}
                    placeholder="Опишите жалобу клиента или проблему..."
                    className="w-full p-3 text-sm border border-red-200 rounded-lg bg-white focus:ring-2 focus:ring-red-200 outline-none resize-none h-20"
                />
                <button 
                    onClick={submitComplaint}
                    disabled={!complaintText.trim()}
                    className="self-end bg-red-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    Отправить <Send size={12}/>
                </button>
            </div>

            {/* Suggestion Field */}
            <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-blue-700 font-bold text-sm uppercase">
                    <Lightbulb size={18}/> Предложение
                </div>
                <textarea 
                    value={suggestionText}
                    onChange={e => setSuggestionText(e.target.value)}
                    placeholder="Идеи по улучшению работы..."
                    className="w-full p-3 text-sm border border-blue-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-200 outline-none resize-none h-20"
                />
                <button 
                    onClick={submitSuggestion}
                    disabled={!suggestionText.trim()}
                    className="self-end bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    Отправить <Send size={12}/>
                </button>
            </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 space-y-4">
            <div className="relative">
                <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                <input 
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Поиск по имени или телефону..."
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 shadow-sm focus:ring-2 focus:ring-blue-100 outline-none text-gray-700 bg-white"
                />
            </div>
            
            <div className="flex flex-wrap gap-2 items-center">
                <div className="text-sm text-gray-400 mr-2 flex items-center gap-1"><Filter size={16}/> Фильтры:</div>
                
                <button 
                    onClick={() => setFilterBirthdayMonth(!filterBirthdayMonth)}
                    className={`px-3 py-1.5 rounded-full text-sm font-bold flex items-center gap-2 transition-colors border ${filterBirthdayMonth ? 'bg-pink-100 text-pink-700 border-pink-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                >
                    <Cake size={14} className={filterBirthdayMonth ? "text-pink-500" : "text-gray-400"} />
                    ДР в этом месяце
                </button>

                <div className="h-6 w-px bg-gray-200 mx-2"></div>

                <button 
                    onClick={() => setAgeFilter(ageFilter === '0-1' ? 'ALL' : '0-1')}
                    className={`px-3 py-1.5 rounded-full text-sm font-bold flex items-center gap-2 transition-colors border ${ageFilter === '0-1' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                >
                    <Baby size={14} /> 0-1 год
                </button>
                <button 
                    onClick={() => setAgeFilter(ageFilter === '2-3' ? 'ALL' : '2-3')}
                    className={`px-3 py-1.5 rounded-full text-sm font-bold flex items-center gap-2 transition-colors border ${ageFilter === '2-3' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                >
                    <Baby size={14} /> 2-3 года
                </button>
                <button 
                    onClick={() => setAgeFilter(ageFilter === '4-6' ? 'ALL' : '4-6')}
                    className={`px-3 py-1.5 rounded-full text-sm font-bold flex items-center gap-2 transition-colors border ${ageFilter === '4-6' ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                >
                    <Backpack size={14} /> 4-6 лет
                </button>
                <button 
                    onClick={() => setAgeFilter(ageFilter === '7+' ? 'ALL' : '7+')}
                    className={`px-3 py-1.5 rounded-full text-sm font-bold flex items-center gap-2 transition-colors border ${ageFilter === '7+' ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                >
                    <School size={14} /> 7+ лет
                </button>

                { (ageFilter !== 'ALL' || filterBirthdayMonth) && (
                    <button onClick={() => { setAgeFilter('ALL'); setFilterBirthdayMonth(false); }} className="ml-auto text-xs text-gray-500 hover:text-red-500 underline">
                        Сбросить
                    </button>
                )}
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pb-20">
            {filteredClients.map(client => {
                const recentSubscriptionUsage = (subscriptionUsageHistoryByPhone[client.phone] || []).slice(0, 5);
                return (
                    <div key={client.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow relative group">
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg">
                                    {client.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 leading-tight">{client.name}</h3>
                                    <div className="text-xs text-gray-400">Рег: {new Date(client.registrationDate).toLocaleDateString()}</div>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button type="button" onClick={() => openModal(client)} className="p-2 rounded-lg bg-gray-50 text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"><Edit2 size={16}/></button>
                                <button type="button" onClick={() => setDeleteConfirmId(client.id)} className="p-2 rounded-lg bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                            </div>
                        </div>

                        <div className="space-y-3 text-sm text-gray-700 mb-4">
                            <div className="flex items-center gap-2">
                                <Phone size={14} className="text-gray-400"/>
                                <span className="font-medium">{client.phone}</span>
                            </div>
                            
                            {/* Contact Status Toggle */}
                            <button 
                                onClick={() => toggleContactStatus(client)}
                                className={`w-full py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all border ${client.isAddedToContacts ? 'bg-green-50 text-green-700 border-green-200' : 'bg-white text-gray-400 border-dashed border-gray-300 hover:text-blue-600 hover:border-blue-300'}`}
                            >
                                {client.isAddedToContacts ? (
                                    <>
                                        <Check size={14} />
                                        В контактах / WhatsApp
                                    </>
                                ) : (
                                    <>
                                        <BookUser size={14} />
                                        Добавить в контакты
                                    </>
                                )}
                            </button>

                            {client.socialMedia && (
                                <div className="flex items-center gap-2">
                                    <div className="w-4 flex justify-center"><ExternalLink size={14} className="text-blue-400"/></div>
                                    <span className="text-blue-600 truncate">{client.socialMedia}</span>
                                </div>
                            )}

                            {/* Children List Display */}
                            {client.children && client.children.length > 0 && (
                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                    <span className="text-xs font-bold text-gray-400 uppercase block mb-2">Дети</span>
                                    <div className="space-y-2">
                                        {client.children.map(child => {
                                            const age = calculateAge(child.dob);
                                            const isBirthdaySoon = getUpcomingBirthday(child.dob);
                                            return (
                                                <div key={child.id} className="flex justify-between items-center text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium text-gray-800">{child.name}</span>
                                                        {isBirthdaySoon && (
                                                          <div title="День рождения скоро!">
                                                            <Cake size={14} className="text-pink-500 animate-pulse" />
                                                          </div>
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-200">
                                                        {age !== null ? `${age} лет` : '? лет'}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <div className="bg-indigo-50/40 p-3 rounded-lg border border-indigo-100">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-bold text-indigo-500 uppercase flex items-center gap-1">
                                        <Ticket size={12} /> Абонементы
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => openSellSubscriptionModal(client)}
                                        className="text-xs font-bold text-indigo-600 hover:text-indigo-700"
                                    >
                                        Продать
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {(client.subscriptions || []).length === 0 && (
                                        <p className="text-xs text-indigo-300 italic">Нет абонементов</p>
                                    )}
                                    {(client.subscriptions || [])
                                      .slice()
                                      .sort((a, b) => (b.purchasedAt || '').localeCompare(a.purchasedAt || ''))
                                      .slice(0, 3)
                                      .map(sub => {
                                        const status = getComputedSubscriptionStatus(sub);
                                        return (
                                            <div key={sub.id} className="bg-white rounded-md border border-indigo-100 p-2">
                                                <div className="flex justify-between items-start gap-2">
                                                    <div>
                                                        <div className="text-sm font-bold text-gray-800">{sub.planName}</div>
                                                        <div className="text-xs text-gray-500 flex items-center gap-1">
                                                            <Clock3 size={10} /> Остаток: {formatMinutes(sub.remainingMinutes)} / {formatMinutes(sub.totalMinutes)}
                                                        </div>
                                                        <div className="text-[10px] text-gray-400">
                                                            До {new Date(sub.expiresAt).toLocaleDateString('ru-RU')}
                                                        </div>
                                                    </div>
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                        status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                                                        status === 'EXPIRED' ? 'bg-gray-100 text-gray-500' :
                                                        status === 'USED_UP' ? 'bg-orange-100 text-orange-700' :
                                                        'bg-red-100 text-red-700'
                                                    }`}>
                                                        {status === 'ACTIVE' ? 'Активен' : status === 'EXPIRED' ? 'Истек' : status === 'USED_UP' ? 'Использован' : 'Отменен'}
                                                    </span>
                                                </div>
                                                <div className="mt-2 flex gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleAdjustSubscription(client, sub)}
                                                        className="text-[11px] font-bold px-2 py-1 rounded border border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                                                    >
                                                        Корректировать
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                      })}
                                    {(client.subscriptions || []).length > 3 && (
                                        <p className="text-[10px] text-gray-400">Показаны последние 3 абонемента</p>
                                    )}
                                </div>

                                <div className="mt-3 pt-3 border-t border-indigo-100">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[11px] font-bold text-indigo-500 uppercase">Списания по сессиям</span>
                                        <span className="text-[10px] text-gray-400">Последние 5</span>
                                    </div>
                                    <div className="space-y-2">
                                        {recentSubscriptionUsage.length === 0 && (
                                            <p className="text-xs text-indigo-300 italic">Нет завершенных сессий с оплатой абонементом</p>
                                        )}
                                        {recentSubscriptionUsage.map(item => {
                                            const opKey = `${item.dayId}:${item.sessionId}`;
                                            const isLoading = reversingSubscriptionUsageKey === opKey;
                                            return (
                                                <div key={opKey} className="bg-white rounded-md border border-indigo-100 p-2">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="min-w-0">
                                                            <div className="text-xs font-bold text-gray-800 truncate">
                                                                {item.childName} • {item.planName}
                                                            </div>
                                                            <div className="text-[11px] text-gray-500">
                                                                {formatDateTime(item.startTime)} • Списано: {formatMinutes(item.minutesUsed)}
                                                            </div>
                                                            {item.isReversed && (
                                                                <div className="text-[10px] text-emerald-700 mt-1">
                                                                    Возвращено{item.reversalReason ? `: ${item.reversalReason}` : ''}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {!item.isReversed ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleReverseSubscriptionUsageFromHistory(item)}
                                                                disabled={!!reversingSubscriptionUsageKey}
                                                                className="shrink-0 text-[11px] font-bold px-2 py-1 rounded border border-indigo-200 text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"
                                                            >
                                                                {isLoading ? 'Возврат...' : 'Вернуть минуты'}
                                                            </button>
                                                        ) : (
                                                            <span className="shrink-0 text-[10px] font-bold px-2 py-1 rounded bg-emerald-100 text-emerald-700">
                                                                Возвращено
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-3 border-t border-gray-100">
                            {client.bonusCardNumber ? (
                                <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg p-3 text-white shadow-sm relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-16 h-16 bg-white opacity-10 rounded-full -mr-8 -mt-8"></div>
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-1.5 text-xs font-medium opacity-90">
                                            <CreditCard size={14}/> Бонусная Карта
                                        </div>
                                        <div className="text-xs opacity-75">#{client.bonusCardNumber}</div>
                                    </div>
                                    <div className="mt-2">
                                        <div className="text-2xl font-bold">{client.bonusBalance || 0} Б</div>
                                        <div className="text-[10px] opacity-80">Баланс баллов</div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleManualBonusAccrual(client)}
                                        className="mt-3 w-full bg-white/15 hover:bg-white/25 border border-white/25 rounded-md py-1.5 text-xs font-bold transition-colors"
                                    >
                                        Начислить бонусы вручную
                                    </button>
                                </div>
                            ) : (
                                <button 
                                    onClick={() => handleIssueCardWithInitialBonus(client)}
                                    className="w-full py-2 border-2 border-dashed border-gray-300 text-gray-500 rounded-lg text-sm font-bold hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
                                >
                                    <CreditCard size={16}/> Оформить карту
                                </button>
                            )}
                        </div>
                    </div>
                );
            })}
            {filteredClients.length === 0 && (
                <div className="col-span-full text-center py-20 text-gray-400">
                    Клиенты не найдены
                </div>
            )}
        </div>

        {/* Sell Subscription Modal */}
        {subscriptionClient && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                    <div className="bg-indigo-600 p-4 text-white flex justify-between items-center">
                        <h3 className="font-bold text-lg">Продать абонемент</h3>
                        <button onClick={() => setSubscriptionClient(null)} className="hover:bg-indigo-700 p-1 rounded"><X size={20}/></button>
                    </div>
                    <form onSubmit={handleSellSubscriptionSubmit} className="p-5 space-y-4">
                        <div className="text-sm text-gray-700">
                            Клиент: <span className="font-bold">{subscriptionClient.name}</span>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Шаблон абонемента</label>
                            <select
                                value={subscriptionPlanId}
                                onChange={e => setSubscriptionPlanId(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                                required
                            >
                                {activeSubscriptionPlans.map(plan => (
                                    <option key={plan.id} value={plan.id}>
                                        {plan.name} • {formatMinutes(plan.totalMinutes)} • {plan.price} ₽ • {plan.validityDays} дн.
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex gap-2">
                            <label className="flex-1 cursor-pointer">
                                <input type="radio" className="hidden peer" checked={subscriptionPayMethod === PaymentMethod.CASH} onChange={() => setSubscriptionPayMethod(PaymentMethod.CASH)} />
                                <div className="border rounded-lg p-2 text-center font-bold text-sm peer-checked:bg-green-100 peer-checked:border-green-300 peer-checked:text-green-700">Наличные</div>
                            </label>
                            <label className="flex-1 cursor-pointer">
                                <input type="radio" className="hidden peer" checked={subscriptionPayMethod === PaymentMethod.CARD} onChange={() => setSubscriptionPayMethod(PaymentMethod.CARD)} />
                                <div className="border rounded-lg p-2 text-center font-bold text-sm peer-checked:bg-purple-100 peer-checked:border-purple-300 peer-checked:text-purple-700">Карта</div>
                            </label>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Заметка (необязательно)</label>
                            <input
                                value={subscriptionNote}
                                onChange={e => setSubscriptionNote(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                                placeholder="Например: акция / подарок"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={sellingSubscription || !subscriptionPlanId}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg disabled:opacity-50"
                        >
                            {sellingSubscription ? 'Оформление...' : 'Оформить абонемент'}
                        </button>
                    </form>
                </div>
            </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirmId && (
           <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 text-center animate-in zoom-in-95 duration-200">
                    <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Trash2 size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Удалить клиента?</h3>
                    <p className="text-gray-500 text-sm mb-6">Вы действительно хотите удалить этого клиента? Это действие необратимо.</p>
                    <div className="flex gap-3">
                        <button onClick={() => setDeleteConfirmId(null)} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors">Отмена</button>
                        <button onClick={confirmDelete} className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg transition-colors">Удалить</button>
                    </div>
                </div>
           </div>
        )}

        {/* Edit/Create Modal */}
        {isModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm overflow-y-auto">
                <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 my-8">
                    <div className="bg-blue-600 p-4 text-white flex justify-between items-center">
                        <h3 className="font-bold text-lg">{editingClient ? 'Редактировать клиента' : 'Новый клиент'}</h3>
                        <button onClick={() => setIsModalOpen(false)} className="hover:bg-blue-700 p-1 rounded"><X size={20}/></button>
                    </div>
                    <form onSubmit={handleSave} className="p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Имя Клиента <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <User className="absolute left-3 top-3 text-gray-400" size={18}/>
                                <input required value={name} onChange={e => setName(e.target.value)} className="w-full pl-10 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 outline-none bg-white text-gray-900" placeholder="ФИО" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Телефон <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-3 text-gray-400" size={18}/>
                                <input required value={phone} onChange={e => setPhone(e.target.value)} className="w-full pl-10 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 outline-none bg-white text-gray-900" placeholder="8-900-..." />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Соцсети</label>
                            <div className="relative">
                                <ExternalLink className="absolute left-3 top-3 text-gray-400" size={18}/>
                                <input value={socialMedia} onChange={e => setSocialMedia(e.target.value)} className="w-full pl-10 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 outline-none bg-white text-gray-900" placeholder="@username или ссылка" />
                            </div>
                        </div>

                        {/* Children Manager */}
                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                            <label className="block text-sm font-bold text-blue-800 mb-2">Дети (Имена и Дни Рождения)</label>
                            
                            {/* Children List */}
                            <div className="space-y-2 mb-3">
                                {childrenList.map(child => (
                                    <div key={child.id} className="flex justify-between items-center bg-white p-2 rounded border border-blue-200 text-sm">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                                                {child.name.charAt(0)}
                                            </div>
                                            <div>
                                                <span className="font-bold text-gray-800 block">{child.name}</span>
                                                {child.dob ? (
                                                    <span className="text-gray-500 text-xs">ДР: {new Date(child.dob).toLocaleDateString()} ({calculateAge(child.dob)} л)</span>
                                                ) : (
                                                    <span className="text-gray-400 text-xs">ДР не указан</span>
                                                )}
                                            </div>
                                        </div>
                                        <button type="button" onClick={() => handleRemoveChildFromForm(child.id)} className="text-red-400 hover:text-red-600">
                                            <X size={16} />
                                        </button>
                                    </div>
                                ))}
                                {childrenList.length === 0 && <p className="text-xs text-blue-400 italic">Дети не добавлены</p>}
                            </div>

                            {/* Add Child Input */}
                            <div className="flex gap-2 items-end">
                                <div className="flex-1">
                                    <label className="text-xs text-blue-700 font-bold ml-1">Имя</label>
                                    <input 
                                        value={newChildName}
                                        onChange={e => setNewChildName(e.target.value)}
                                        className="w-full p-2 text-sm border border-blue-200 rounded bg-white text-gray-900 placeholder-blue-300"
                                        placeholder="Имя"
                                    />
                                </div>
                                <div className="w-32">
                                    <label className="text-xs text-blue-700 font-bold ml-1">Дата Рожд.</label>
                                    <input 
                                        type="date"
                                        value={newChildDob}
                                        onChange={e => setNewChildDob(e.target.value)}
                                        className="w-full p-2 text-sm border border-blue-200 rounded bg-white text-gray-900"
                                    />
                                </div>
                                <button 
                                    type="button"
                                    onClick={handleAddChildToForm}
                                    disabled={!newChildName}
                                    className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:opacity-50 h-[38px] w-[38px] flex items-center justify-center"
                                >
                                    <Plus size={18} />
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Заметки</label>
                            <textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 outline-none h-20 resize-none bg-white text-gray-900" placeholder="Предпочтения, особенности..." />
                        </div>
                        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow-lg mt-2 transition-transform active:scale-95">
                            Сохранить
                        </button>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
};

export default ClientsTab;
