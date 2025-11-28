import React, { useState, useEffect } from 'react';
import { CalendarEvent, EventType, PaymentMethod, Participant, TransactionType, AnimatorType, RegistrationType, ServiceItem, MasterClassType, BirthdayRateSettings, StaffAnimator, EventStatus, Partner, Client } from '../types';
import { Calendar, Gift, Sparkles, User, Phone, Users, DollarSign, Plus, ChevronLeft, ChevronRight, BookOpen, Wallet, CheckCircle, Edit2, Clock, Trash2, Eye, EyeOff, PartyPopper, Utensils, Briefcase, Building, Calculator, AlertTriangle, Info, XCircle, ChevronDown, Check, CreditCard, Banknote } from 'lucide-react';
import { generateBirthdayWish } from '../services/geminiService';

interface EventsTabProps {
  events: CalendarEvent[];
  birthdayRates: BirthdayRateSettings;
  staffAnimators: StaffAnimator[];
  partners: Partner[];
  clients: Client[];
  bonusPercentage: number;
  onUpdateEvents: (events: CalendarEvent[]) => void;
  onAddTransaction: (amount: number, type: TransactionType, method: PaymentMethod, description: string, relatedEventId: string, phone?: string, bonusesUsed?: number) => void;
  onCheckClient: (name: string, phone: string, childName: string, initialBonus: number) => void;
}

const EventsTab: React.FC<EventsTabProps> = ({ events, birthdayRates, staffAnimators, partners, clients, bonusPercentage, onUpdateEvents, onAddTransaction, onCheckClient }) => {
  // Calendar State
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());

  const [view, setView] = useState<'CALENDAR' | 'SELECT_TYPE' | 'FORM_BIRTHDAY' | 'EDIT_BIRTHDAY' | 'VIEW_BIRTHDAY' | 'FORM_MASTERCLASS' | 'VIEW_MASTERCLASS'>('CALENDAR');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // Common Form State
  const [childName, setChildName] = useState('');
  const [parentName, setParentName] = useState('');
  const [phone, setPhone] = useState('');
  const [prepayment, setPrepayment] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  
  // Time Fields
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('12:00');
  const [overlapError, setOverlapError] = useState<string | null>(null);

  // Birthday Specific
  const [childCount, setChildCount] = useState(5);
  const [wishes, setWishes] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Birthday Financials State
  const [roomPrice, setRoomPrice] = useState('');
  const [perChildPrice, setPerChildPrice] = useState('');

  // New Birthday Fields
  const [animatorType, setAnimatorType] = useState<AnimatorType>('GUEST');
  const [animatorName, setAnimatorName] = useState('');
  const [animatorRole, setAnimatorRole] = useState('');
  const [animatorPhone, setAnimatorPhone] = useState('');
  const [animatorOrg, setAnimatorOrg] = useState('');
  const [animatorPriceToClient, setAnimatorPriceToClient] = useState('');

  const [regType, setRegType] = useState<RegistrationType>('NONE');
  const [regOrg, setRegOrg] = useState('');
  const [regContact, setRegContact] = useState('');
  const [regPriceToClient, setRegPriceToClient] = useState('');

  const [services, setServices] = useState<ServiceItem[]>([]);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('');

  // Master Class Specific
  const [mcTitle, setMcTitle] = useState('');
  const [mcType, setMcType] = useState<MasterClassType>('INTERNAL');
  const [mcOrg, setMcOrg] = useState('');
  const [mcPricePerChild, setMcPricePerChild] = useState('');
  const [mcInstructorName, setMcInstructorName] = useState('');
  const [mcInstructorPhone, setMcInstructorPhone] = useState('');
  
  // Add Child to MC State
  const [mcChildName, setMcChildName] = useState('');
  const [mcParentPhone, setMcParentPhone] = useState('');
  const [mcChildPrepayment, setMcChildPrepayment] = useState('');
  const [mcPaymentMethod, setMcPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH); // Added payment method for MC
  const [showAddChildModal, setShowAddChildModal] = useState(false);

  // Pay Remaining Modal State
  const [payModal, setPayModal] = useState<{isOpen: boolean, participantId: string | null, amount: number, childName: string, isBirthday?: boolean, parentPhone?: string}>({
    isOpen: false, participantId: null, amount: 0, childName: '', isBirthday: false, parentPhone: ''
  });
  const [payBonusUsed, setPayBonusUsed] = useState(0);
  const [foundClientForPayment, setFoundClientForPayment] = useState<Client | null>(null);
  
  // Cancel Modal State
  const [cancelModal, setCancelModal] = useState<{isOpen: boolean, reason: string}>({
      isOpen: false, reason: ''
  });

  // Notification
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  // Calendar Logic
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay(); // 0 = Sun
    const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1;
    return { days, firstDay: adjustedFirstDay };
  };

  const handleMonthChange = (increment: number) => {
    const newDate = new Date(currentMonthDate);
    newDate.setMonth(newDate.getMonth() + increment);
    setCurrentMonthDate(newDate);
  };

  const isWeekend = (dateStr: string) => {
      const day = new Date(dateStr).getDay();
      return day === 0 || day === 6; // 0=Sun, 6=Sat
  };

  const timeToMinutes = (time: string) => {
      if (!time) return 0;
      const [h, m] = time.split(':').map(Number);
      return h * 60 + m;
  };

  // Find client when PayModal opens or phone changes in it
  useEffect(() => {
    if (payModal.isOpen && payModal.parentPhone) {
        const c = clients.find(cl => cl.phone.includes(payModal.parentPhone || ''));
        setFoundClientForPayment(c || null);
    } else {
        setFoundClientForPayment(null);
    }
    setPayBonusUsed(0); // Reset bonuses when modal opens/changes
  }, [payModal.isOpen, payModal.parentPhone, clients]);


  // Check Overlap Effect (Strict for both Birthdays and Master Classes)
  useEffect(() => {
    // Only check in add/edit forms
    if (!['FORM_BIRTHDAY', 'EDIT_BIRTHDAY', 'FORM_MASTERCLASS'].includes(view)) return;

    const newStartMins = timeToMinutes(startTime);
    const newEndMins = timeToMinutes(endTime);

    if (newEndMins <= newStartMins) {
        setOverlapError("Время окончания должно быть позже времени начала");
        return;
    }

    const conflictingEvent = events.find(ev => {
        // Ignore cancelled events
        if (ev.status === 'CANCELLED') return false;
        
        // Must be same date
        if (ev.date !== selectedDate) return false;
        
        // Ignore self when editing
        if (selectedEventId && ev.id === selectedEventId) return false;

        const evStartMins = timeToMinutes(ev.startTime || '00:00');
        const evEndMins = timeToMinutes(ev.endTime || '00:00');

        // Logic: (StartA < EndB) and (EndA > StartB)
        return (newStartMins < evEndMins) && (newEndMins > evStartMins);
    });

    if (conflictingEvent) {
        const typeStr = conflictingEvent.type === 'BIRTHDAY' ? 'День Рождения' : 'Мастер-Класс';
        const nameStr = conflictingEvent.type === 'BIRTHDAY' ? conflictingEvent.childName : conflictingEvent.title;
        setOverlapError(`ВРЕМЯ ЗАНЯТО! Пересечение с: ${typeStr} "${nameStr}" (${conflictingEvent.startTime}-${conflictingEvent.endTime}). Пожалуйста, выберите другое время.`);
    } else {
        setOverlapError(null);
    }
  }, [startTime, endTime, selectedDate, selectedEventId, events, view]);

  // Calculate prices when date, time, or child count changes
  useEffect(() => {
      if ((view === 'FORM_BIRTHDAY' || view === 'EDIT_BIRTHDAY') && !selectedEventId) {
          calculateAndSetPrices();
      }
  }, [selectedDate, startTime, endTime, view, selectedEventId]);

  const calculateDurationHours = () => {
    try {
        const [startH, startM] = startTime.split(':').map(Number);
        const [endH, endM] = endTime.split(':').map(Number);
        const startTotal = startH * 60 + startM;
        const endTotal = endH * 60 + endM;
        const durationMinutes = endTotal - startTotal;
        return Math.max(0, durationMinutes / 60);
    } catch {
        return 0;
    }
  };

  const calculateAndSetPrices = () => {
      const weekend = isWeekend(selectedDate);
      const durationHours = calculateDurationHours();
      
      const rates = weekend ? birthdayRates.weekend : birthdayRates.weekday;
      
      const roomHourly = rates.room2h / 2;
      const totalRoomPrice = roomHourly * durationHours;

      const pricePerChildForDuration = rates.zone1h * durationHours;

      setRoomPrice(totalRoomPrice.toString());
      setPerChildPrice(pricePerChildForDuration.toString());
  };

  const monthStats = getDaysInMonth(currentMonthDate);
  const monthName = currentMonthDate.toLocaleString('ru-RU', { month: 'long', year: 'numeric' });
  const todayStr = new Date().toISOString().split('T')[0];

  const eventsOnSelectedDate = events.filter(e => e.date === selectedDate && e.status !== 'CANCELLED');
  
  const upcomingEvents = events
    .filter(e => e.date >= todayStr && e.status !== 'CANCELLED')
    .sort((a, b) => a.date.localeCompare(b.date));

  // Pre-fill form when editing birthday
  useEffect(() => {
    if (view === 'EDIT_BIRTHDAY' && selectedEventId) {
        const event = events.find(e => e.id === selectedEventId);
        if (event && event.type === 'BIRTHDAY') {
            setSelectedDate(event.date);
            setStartTime(event.startTime || '10:00');
            setEndTime(event.endTime || '12:00');
            setChildName(event.childName || '');
            setParentName(event.parentName || '');
            setPhone(event.phone || '');
            setChildCount(event.childCount || 1);
            setWishes(event.wishes || '');
            setPrepayment(event.prepayment.toString());
            setPaymentMethod(PaymentMethod.CASH);
            
            setRoomPrice(event.roomPrice?.toString() || '');
            setPerChildPrice(event.perChildPrice?.toString() || '');

            if (event.animator) {
                setAnimatorType(event.animator.type);
                setAnimatorName(event.animator.name || '');
                setAnimatorRole(event.animator.role || '');
                setAnimatorPhone(event.animator.phone || '');
                setAnimatorOrg(event.animator.organization || '');
                setAnimatorPriceToClient(event.animator.priceToClient?.toString() || '');
            }
            if (event.registration) {
                setRegType(event.registration.type);
                setRegOrg(event.registration.organization || '');
                setRegContact(event.registration.contact || '');
                setRegPriceToClient(event.registration.priceToClient?.toString() || '');
            }
            if (event.additionalServices) {
                setServices(event.additionalServices);
            }
        }
    }
  }, [view, selectedEventId, events]);

  const handleGenerateWish = async () => {
    if (!childName) return;
    setIsGenerating(true);
    const wish = await generateBirthdayWish(childName);
    setWishes(wish);
    setIsGenerating(false);
  };

  const resetForm = () => {
    setChildName(''); setParentName(''); setPhone(''); setPrepayment('');
    setPaymentMethod(PaymentMethod.CASH); setChildCount(5);
    setWishes('');
    setStartTime('10:00'); setEndTime('12:00');
    setOverlapError(null);
    
    setMcTitle(''); setMcType('INTERNAL'); setMcOrg(''); setMcPricePerChild(''); setMcInstructorName(''); setMcInstructorPhone('');
    
    setAnimatorType('GUEST'); setAnimatorName(''); setAnimatorRole(''); setAnimatorPhone(''); setAnimatorOrg(''); setAnimatorPriceToClient('');
    setRegType('NONE'); setRegOrg(''); setRegContact(''); setRegPriceToClient('');
    setServices([]);
  };

  const handleAddService = () => {
      if(newServiceName && newServicePrice) {
          setServices([...services, {
              id: Date.now().toString(),
              name: newServiceName,
              price: parseFloat(newServicePrice),
              isIncludedInTotal: true
          }]);
          setNewServiceName('');
          setNewServicePrice('');
      }
  };

  const handleRemoveService = (id: string) => {
      setServices(services.filter(s => s.id !== id));
  }

  const handleStaffAnimatorSelect = (animatorName: string) => {
      setAnimatorName(animatorName);
      const staff = staffAnimators.find(s => s.name === animatorName);
      if (staff) {
          setAnimatorPriceToClient(staff.defaultPrice.toString());
          setAnimatorRole(''); 
      }
  };

  const handlePartnerSelect = (partnerId: string, type: 'ANIMATOR' | 'REGISTRATION') => {
      const partner = partners.find(p => p.id === partnerId);
      if (!partner) return;

      if (type === 'ANIMATOR') {
          setAnimatorName(partner.name);
          setAnimatorOrg(partner.name);
          setAnimatorPhone(partner.phone || '');
      } else {
          setRegOrg(partner.name);
          setRegContact(partner.phone || '');
      }
  };

  // Computed Total Cost for Form Display
  const currentTotalCost = (() => {
    const rPrice = parseFloat(roomPrice) || 0;
    const cPrice = parseFloat(perChildPrice) || 0;
    const zoneTotal = cPrice * childCount;
    const animPrice = parseFloat(animatorPriceToClient) || 0;
    const regPrice = parseFloat(regPriceToClient) || 0;
    const servicesTotal = services.reduce((sum, s) => sum + s.price, 0);
    
    return rPrice + zoneTotal + animPrice + regPrice + servicesTotal;
  })();

  // Handle Birthday Submit
  const handleSubmitBirthday = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (overlapError) {
        alert(overlapError);
        return;
    }

    const rPrice = parseFloat(roomPrice) || 0;
    const cPrice = parseFloat(perChildPrice) || 0;
    
    const animPrice = parseFloat(animatorPriceToClient) || 0;
    const regPrice = parseFloat(regPriceToClient) || 0;
    
    const grandTotal = currentTotalCost;
    const prepay = parseFloat(prepayment) || 0;

    const newEvent: CalendarEvent = {
      id: selectedEventId || Date.now().toString(),
      type: 'BIRTHDAY',
      status: selectedEventId ? (events.find(e => e.id === selectedEventId)?.status || 'SCHEDULED') : 'SCHEDULED',
      date: selectedDate,
      startTime,
      endTime,
      childName,
      parentName,
      phone,
      childCount,
      wishes,
      aiWishSuggestion: wishes,
      prepayment: prepay,
      roomPrice: rPrice,
      perChildPrice: cPrice,
      totalCost: grandTotal,
      isPaid: prepay >= grandTotal,
      animator: {
          type: animatorType,
          name: animatorName,
          role: animatorRole,
          phone: animatorPhone,
          organization: animatorOrg,
          costToUs: selectedEventId ? (events.find(ev => ev.id === selectedEventId)?.animator?.costToUs || 0) : 0,
          isPaidToVendor: selectedEventId ? (events.find(ev => ev.id === selectedEventId)?.animator?.isPaidToVendor || false) : false,
          priceToClient: animPrice
      },
      registration: {
          type: regType,
          organization: regOrg,
          contact: regContact,
          costToUs: selectedEventId ? (events.find(ev => ev.id === selectedEventId)?.registration?.costToUs || 0) : 0,
          isPaidToVendor: selectedEventId ? (events.find(ev => ev.id === selectedEventId)?.registration?.isPaidToVendor || false) : false,
          priceToClient: regPrice
      },
      additionalServices: services
    };

    if (selectedEventId) {
        onUpdateEvents(events.map(e => e.id === selectedEventId ? newEvent : e));
    } else {
        onUpdateEvents([...events, newEvent]);
        if (prepay > 0) {
            onAddTransaction(prepay, TransactionType.PREPAYMENT, paymentMethod, `Предоплата за ДР: ${childName}`, newEvent.id, phone);
        }
    }

    // Auto create client and credit bonuses for the prepayment
    if (parentName && phone) {
        const initialBonus = Math.floor(prepay * (bonusPercentage / 100));
        onCheckClient(parentName, phone, childName, initialBonus);
    }

    resetForm();
    setView('CALENDAR');
    setSelectedEventId(null);
  };

  const handleSubmitMasterClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (overlapError) {
        alert(overlapError);
        return;
    }

    const newEvent: CalendarEvent = {
      id: Date.now().toString(),
      type: 'MASTER_CLASS',
      status: 'SCHEDULED',
      date: selectedDate,
      startTime,
      endTime,
      title: mcTitle,
      masterClassType: mcType,
      organizationName: mcOrg,
      pricePerChild: parseFloat(mcPricePerChild) || 0,
      instructorName: mcInstructorName,
      instructorPhone: mcInstructorPhone,
      instructorCost: 0,
      isInstructorPaid: false, 
      prepayment: 0,
      participants: []
    };

    onUpdateEvents([...events, newEvent]);
    resetForm();
    setView('CALENDAR');
  };

  const handleAddParticipant = () => {
      if (!selectedEventId) return;
      const event = events.find(e => e.id === selectedEventId);
      if (!event) return;

      const prepay = parseFloat(mcChildPrepayment) || 0;
      const newParticipant: Participant = {
          id: Date.now().toString(),
          childName: mcChildName,
          parentPhone: mcParentPhone,
          prepayment: prepay,
          isFullyPaid: prepay >= (event.pricePerChild || 0)
      };

      const updatedEvent = {
          ...event,
          participants: [...(event.participants || []), newParticipant]
      };

      onUpdateEvents(events.map(e => e.id === selectedEventId ? updatedEvent : e));
      
      if (prepay > 0) {
          onAddTransaction(prepay, TransactionType.PREPAYMENT, mcPaymentMethod, `Предоплата МК: ${mcTitle} (${mcChildName})`, event.id, mcParentPhone);
      }

      // Auto create client and credit bonuses for the prepayment
      if (mcChildName && mcParentPhone) {
        const initialBonus = Math.floor(prepay * (bonusPercentage / 100));
        onCheckClient("Родитель", mcParentPhone, mcChildName, initialBonus);
      }

      setMcChildName('');
      setMcParentPhone('');
      setMcChildPrepayment('');
      setMcPaymentMethod(PaymentMethod.CASH);
      setShowAddChildModal(false);
  };

  const handleCancelEvent = () => {
      if (!selectedEventId || !cancelModal.reason) return;
      const updatedEvents = events.map(e => {
          if (e.id === selectedEventId) {
              return { ...e, status: 'CANCELLED' as EventStatus, cancellationReason: cancelModal.reason };
          }
          return e;
      });
      onUpdateEvents(updatedEvents);
      setCancelModal({ isOpen: false, reason: '' });
      setView('CALENDAR');
      setSelectedEventId(null);
  };

  const handleCompleteEvent = () => {
      if (!selectedEventId) return;
      if (window.confirm("Отметить событие как проведенное?")) {
          const updatedEvents = events.map(e => {
              if (e.id === selectedEventId) {
                  return { ...e, status: 'COMPLETED' as EventStatus };
              }
              return e;
          });
          onUpdateEvents(updatedEvents);
      }
  };
  
  const handlePayRemainingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const { participantId, amount, isBirthday, parentPhone } = payModal;
    if (!selectedEventId || !amount) return;

    const event = events.find(e => e.id === selectedEventId);
    if (!event) return;

    const moneyPaid = amount - payBonusUsed;

    if (isBirthday) {
       if (moneyPaid < 0) { alert('Ошибка: Бонусов больше, чем сумма к оплате'); return; }

       const updatedEvent = {
           ...event,
           prepayment: event.prepayment + amount, 
           isPaid: (event.prepayment + amount) >= (event.totalCost || 0)
       };
       onUpdateEvents(events.map(e => e.id === selectedEventId ? updatedEvent : e));
       
       onAddTransaction(moneyPaid, TransactionType.SALE, paymentMethod, `Доплата за ДР: ${event.childName}`, event.id, parentPhone, payBonusUsed);
    } else {
        if (moneyPaid < 0) { alert('Ошибка: Бонусов больше, чем сумма к оплате'); return; }

        const updatedParticipants = event.participants?.map(p => {
            if (p.id === participantId) {
                const newPrepay = p.prepayment + amount;
                return {
                    ...p,
                    prepayment: newPrepay,
                    isFullyPaid: newPrepay >= (event.pricePerChild || 0)
                };
            }
            return p;
        });

        const updatedEvent = { ...event, participants: updatedParticipants };
        onUpdateEvents(events.map(e => e.id === selectedEventId ? updatedEvent : e));
        
        const pName = event.participants?.find(p => p.id === participantId)?.childName || 'Участник';
        const phone = event.participants?.find(p => p.id === participantId)?.parentPhone;

        onAddTransaction(moneyPaid, TransactionType.SALE, paymentMethod, `Доплата за МК: ${event.title} (${pName})`, event.id, phone, payBonusUsed);
    }

    setPayModal({ isOpen: false, participantId: null, amount: 0, childName: '', isBirthday: false, parentPhone: '' });
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3000);
  };

  const renderCalendar = () => {
    return (
      <div className="flex flex-col md:flex-row gap-6 h-full">
         <div className="md:w-1/3 space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                    <button onClick={() => handleMonthChange(-1)} className="p-2 hover:bg-gray-100 rounded-full text-gray-600"><ChevronLeft size={24}/></button>
                    <h2 className="text-xl font-bold text-gray-900 capitalize">{monthName}</h2>
                    <button onClick={() => handleMonthChange(1)} className="p-2 hover:bg-gray-100 rounded-full text-gray-600"><ChevronRight size={24}/></button>
                </div>
                
                <div className="grid grid-cols-7 gap-1 text-center mb-2">
                    {['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(d => <div key={d} className="text-xs font-bold text-gray-400">{d}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-1">
                    {Array(monthStats.firstDay).fill(null).map((_, i) => <div key={`empty-${i}`} />)}
                    {Array(monthStats.days).fill(null).map((_, i) => {
                        const d = i + 1;
                        const localDate = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth(), d);
                        const localDateStr = localDate.toLocaleDateString('en-CA');

                        const isSelected = localDateStr === selectedDate;
                        const hasEvent = events.some(e => e.date === localDateStr && e.status !== 'CANCELLED');
                        const isWknd = isWeekend(localDateStr);

                        return (
                            <button 
                                key={d}
                                onClick={() => setSelectedDate(localDateStr)}
                                className={`
                                    h-10 rounded-lg flex flex-col items-center justify-center relative transition-all
                                    ${isSelected ? 'bg-blue-600 text-white shadow-md scale-110' : 'hover:bg-blue-50 text-gray-700'}
                                    ${isWknd && !isSelected ? 'text-red-400 bg-red-50/30' : ''}
                                `}
                            >
                                <span className="text-sm font-bold">{d}</span>
                                {hasEvent && <span className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-green-500'}`}></span>}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><Clock size={18} className="text-blue-500"/> Ближайшие события</h3>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                    {upcomingEvents.map(e => (
                        <div key={e.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer" onClick={() => { setSelectedDate(e.date); setSelectedEventId(e.id); e.type === 'BIRTHDAY' ? setView('VIEW_BIRTHDAY') : setView('VIEW_MASTERCLASS'); }}>
                             <div className={`w-2 h-12 rounded-full ${e.type === 'BIRTHDAY' ? 'bg-pink-500' : 'bg-purple-500'} ${e.status === 'COMPLETED' ? 'opacity-50' : ''}`}></div>
                             <div>
                                 <div className="font-bold text-gray-900 text-sm">{new Date(e.date).toLocaleDateString()}</div>
                                 <div className="text-xs text-gray-600">{e.type === 'BIRTHDAY' ? `ДР: ${e.childName}` : `МК: ${e.title}`}</div>
                                 {e.status === 'COMPLETED' && <span className="text-[10px] text-green-600 font-bold border border-green-200 px-1 rounded">ПРОВЕДЕНО</span>}
                             </div>
                        </div>
                    ))}
                    {upcomingEvents.length === 0 && <p className="text-xs text-gray-400 italic">Нет событий</p>}
                </div>
            </div>
         </div>

         <div className="flex-1 bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col">
             <div className="flex justify-between items-center mb-6 border-b pb-4">
                 <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                        {new Date(selectedDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </h2>
                    <p className="text-gray-500 text-sm">{isWeekend(selectedDate) ? 'Выходной день' : 'Будний день'}</p>
                 </div>
                 <button 
                    onClick={() => setView('SELECT_TYPE')}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-md transition-transform active:scale-95"
                 >
                    <Plus size={20} /> Создать
                 </button>
             </div>

             <div className="space-y-4 flex-1 overflow-y-auto">
                 {eventsOnSelectedDate.length === 0 ? (
                     <div className="h-full flex flex-col items-center justify-center text-gray-400">
                         <Calendar size={64} className="mb-4 text-gray-200" />
                         <p>Нет событий на этот день</p>
                     </div>
                 ) : (
                     eventsOnSelectedDate.map(evt => (
                         <div key={evt.id} className={`border rounded-xl p-4 flex flex-col md:flex-row gap-4 ${evt.type === 'BIRTHDAY' ? 'bg-pink-50 border-pink-100' : 'bg-purple-50 border-purple-100'} ${evt.status === 'COMPLETED' ? 'opacity-75' : ''}`}>
                             <div className="flex-1">
                                 <div className="flex items-center gap-2 mb-1">
                                     <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${evt.type === 'BIRTHDAY' ? 'bg-pink-200 text-pink-800' : 'bg-purple-200 text-purple-800'}`}>
                                         {evt.type === 'BIRTHDAY' ? 'День Рождения' : 'Мастер-Класс'}
                                     </span>
                                     <span className="text-sm font-mono text-gray-600 flex items-center gap-1">
                                         <Clock size={12}/> {evt.startTime} - {evt.endTime}
                                     </span>
                                     {/* Status Badges */}
                                     {evt.status === 'COMPLETED' ? (
                                         <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-bold">ПРОВЕДЕНО</span>
                                     ) : (
                                        evt.type === 'BIRTHDAY' && (
                                            evt.isPaid 
                                                ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-bold">Оплачено</span>
                                                : <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded font-bold">Предоплата</span>
                                        )
                                     )}
                                 </div>
                                 <h3 className="text-xl font-bold text-gray-900">
                                     {evt.type === 'BIRTHDAY' ? evt.childName : evt.title}
                                 </h3>
                                 {evt.type === 'BIRTHDAY' && <p className="text-sm text-gray-600">{evt.childCount} детей • Родитель: {evt.parentName}</p>}
                                 {evt.type === 'MASTER_CLASS' && <p className="text-sm text-gray-600">{evt.participants?.length || 0} участников</p>}
                             </div>
                             
                             <div className="flex items-center gap-2">
                                 <button 
                                    onClick={() => { setSelectedEventId(evt.id); evt.type === 'BIRTHDAY' ? setView('VIEW_BIRTHDAY') : setView('VIEW_MASTERCLASS'); }}
                                    className="p-2 bg-white border rounded-lg text-gray-600 hover:text-blue-600 hover:border-blue-300 transition-colors"
                                 >
                                     <Eye size={20} />
                                 </button>
                             </div>
                         </div>
                     ))
                 )}
             </div>
         </div>
      </div>
    );
  };

  const renderSelectType = () => (
      <div className="flex flex-col items-center justify-center h-full space-y-8 animate-in zoom-in-95 duration-200">
          <h2 className="text-2xl font-bold text-gray-900">Что планируем?</h2>
          <div className="flex gap-6">
              <button 
                onClick={() => setView('FORM_BIRTHDAY')}
                className="w-64 h-64 bg-pink-50 border-2 border-pink-200 rounded-2xl flex flex-col items-center justify-center gap-4 hover:bg-pink-100 hover:border-pink-400 transition-all hover:scale-105 group"
              >
                  <div className="w-20 h-20 bg-pink-200 rounded-full flex items-center justify-center text-pink-600 group-hover:bg-pink-300 transition-colors">
                      <Gift size={40} />
                  </div>
                  <div className="text-center">
                      <h3 className="text-xl font-bold text-pink-900">День Рождения</h3>
                      <p className="text-sm text-pink-600 px-4 mt-2">Аренда комнаты, аниматоры, торт</p>
                  </div>
              </button>

              <button 
                onClick={() => setView('FORM_MASTERCLASS')}
                className="w-64 h-64 bg-purple-50 border-2 border-purple-200 rounded-2xl flex flex-col items-center justify-center gap-4 hover:bg-purple-100 hover:border-purple-400 transition-all hover:scale-105 group"
              >
                  <div className="w-20 h-20 bg-purple-200 rounded-full flex items-center justify-center text-purple-600 group-hover:bg-purple-300 transition-colors">
                      <BookOpen size={40} />
                  </div>
                  <div className="text-center">
                      <h3 className="text-xl font-bold text-purple-900">Мастер-Класс</h3>
                      <p className="text-sm text-purple-600 px-4 mt-2">Групповые занятия, продажа билетов</p>
                  </div>
              </button>
          </div>
          <button onClick={() => setView('CALENDAR')} className="text-gray-500 hover:text-gray-900 font-medium">Назад к календарю</button>
      </div>
  );

  const renderBirthdayForm = () => (
    <div className="max-w-4xl mx-auto bg-white p-6 rounded-xl shadow-md border border-gray-100 overflow-y-auto h-full">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Gift className="text-pink-500" /> 
                {view === 'EDIT_BIRTHDAY' ? 'Редактирование Дня Рождения' : 'Бронирование Дня Рождения'}
            </h2>
            <button onClick={() => { setView('CALENDAR'); resetForm(); setSelectedEventId(null); }} className="text-gray-500 hover:text-gray-700">Отмена</button>
        </div>
        
        {overlapError && (
            <div className="mb-6 p-4 bg-red-100 border-l-4 border-red-500 text-red-700 font-bold rounded flex items-center gap-3 animate-pulse shadow-md">
                <AlertTriangle size={24} />
                <span>{overlapError}</span>
            </div>
        )}

        <form onSubmit={handleSubmitBirthday} className="space-y-8 pb-10">
            
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><User size={18} className="text-blue-500"/> Основная информация</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Имя ребенка</label>
                        <input required value={childName} onChange={e => setChildName(e.target.value)} className="w-full p-2 border rounded-lg bg-white text-gray-900 border-gray-300 focus:ring-2 focus:ring-blue-100 outline-none" placeholder="Имя" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                         <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Начало</label>
                            <input type="time" required value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full p-2 border rounded-lg bg-white text-gray-900 border-gray-300 focus:ring-2 focus:ring-blue-100 outline-none" />
                         </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Конец</label>
                            <input type="time" required value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full p-2 border rounded-lg bg-white text-gray-900 border-gray-300 focus:ring-2 focus:ring-blue-100 outline-none" />
                         </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Родитель</label>
                        <input required value={parentName} onChange={e => setParentName(e.target.value)} className="w-full p-2 border rounded-lg bg-white text-gray-900 border-gray-300 focus:ring-2 focus:ring-blue-100 outline-none" placeholder="Имя родителя" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Телефон</label>
                        <input required value={phone} onChange={e => setPhone(e.target.value)} className="w-full p-2 border rounded-lg bg-white text-gray-900 border-gray-300 focus:ring-2 focus:ring-blue-100 outline-none" placeholder="+7..." />
                    </div>
                </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><Calculator size={18} className="text-green-500"/> Калькуляция</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Кол-во детей</label>
                        <input type="number" min="1" value={childCount} onChange={e => setChildCount(parseInt(e.target.value))} className="w-full p-2 border rounded-lg bg-white text-gray-900 border-gray-300 focus:ring-2 focus:ring-blue-100 outline-none" />
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Аренда зала (за все время)</label>
                        <input 
                          type="number" 
                          value={roomPrice} 
                          readOnly 
                          className="w-full p-2 border rounded-lg bg-white text-gray-900 border-gray-300 font-bold"
                        />
                        <span className="text-xs text-gray-500">Авто-расчет по времени</span>
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Игровая (за ребенка на всё время)</label>
                        <input 
                           type="number" 
                           value={perChildPrice} 
                           readOnly 
                           className="w-full p-2 border rounded-lg bg-white text-gray-900 border-gray-300 font-bold" 
                        />
                        <span className="text-xs text-gray-500">Авто-расчет (Цена за час * Часы)</span>
                     </div>
                </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><PartyPopper size={18} className="text-purple-500"/> Анимация и Декор</h3>
                
                <div className="mb-6 pb-6 border-b border-gray-200">
                    <label className="block text-sm font-bold text-gray-700 mb-2">Аниматор</label>
                    <div className="flex gap-4 mb-3">
                        <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="animType" checked={animatorType === 'GUEST'} onChange={() => { setAnimatorType('GUEST'); setAnimatorPriceToClient('0'); }} className="text-blue-600"/> <span className="text-gray-900">Без аниматора</span></label>
                        <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="animType" checked={animatorType === 'STAFF'} onChange={() => { setAnimatorType('STAFF'); setAnimatorName(''); setAnimatorPriceToClient('0'); }} className="text-blue-600"/> <span className="text-gray-900">Наш штат</span></label>
                        <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="animType" checked={animatorType === 'EXTERNAL'} onChange={() => { setAnimatorType('EXTERNAL'); setAnimatorName(''); setAnimatorPriceToClient('0'); }} className="text-blue-600"/> <span className="text-gray-900">Сторонний</span></label>
                    </div>
                    
                    {animatorType !== 'GUEST' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-3 rounded border border-gray-200">
                            {animatorType === 'STAFF' ? (
                                <>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1">Выберите аниматора</label>
                                        <select 
                                            value={animatorName} 
                                            onChange={(e) => handleStaffAnimatorSelect(e.target.value)}
                                            className="w-full p-2 border rounded text-sm text-gray-900 bg-white border-gray-300 focus:ring-2 focus:ring-blue-100 outline-none"
                                        >
                                            <option value="">-- Выбрать --</option>
                                            {staffAnimators.map(sa => (
                                                <option key={sa.id} value={sa.name}>{sa.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1">Персонаж (Роль)</label>
                                        <select 
                                            value={animatorRole} 
                                            onChange={(e) => setAnimatorRole(e.target.value)}
                                            disabled={!animatorName}
                                            className="w-full p-2 border rounded text-sm text-gray-900 bg-white disabled:bg-gray-100 border-gray-300 focus:ring-2 focus:ring-blue-100 outline-none"
                                        >
                                            <option value="">-- Выбрать роль --</option>
                                            {staffAnimators.find(s => s.name === animatorName)?.roles.map(role => (
                                                <option key={role} value={role}>{role}</option>
                                            ))}
                                        </select>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="md:col-span-2 mb-2">
                                        <label className="block text-xs font-bold text-gray-500 mb-1">Выбрать из списка партнеров (Опционально)</label>
                                        <select 
                                            onChange={(e) => handlePartnerSelect(e.target.value, 'ANIMATOR')}
                                            className="w-full p-2 border rounded text-sm text-gray-900 bg-white border-gray-300 focus:ring-2 focus:ring-blue-100 outline-none"
                                        >
                                            <option value="">-- Выбрать организацию --</option>
                                            {partners.filter(p => p.type === 'ANIMATOR').map(p => (
                                                <option key={p.id} value={p.id}>{p.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <input value={animatorOrg} onChange={e => setAnimatorOrg(e.target.value)} placeholder="Название организации" className="w-full p-2 border rounded text-sm text-gray-900 bg-white border-gray-300 focus:ring-2 focus:ring-blue-100 outline-none" />
                                    <input value={animatorName} onChange={e => setAnimatorName(e.target.value)} placeholder="Имя аниматора" className="w-full p-2 border rounded text-sm text-gray-900 bg-white border-gray-300 focus:ring-2 focus:ring-blue-100 outline-none" />
                                    <input value={animatorPhone} onChange={e => setAnimatorPhone(e.target.value)} placeholder="Телефон аниматора" className="w-full p-2 border rounded text-sm text-gray-900 bg-white border-gray-300 focus:ring-2 focus:ring-blue-100 outline-none" />
                                </>
                            )}
                            
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-gray-500 mb-1">Стоимость для клиента (₽)</label>
                                <input type="number" value={animatorPriceToClient} onChange={e => setAnimatorPriceToClient(e.target.value)} className="w-full p-2 border rounded text-sm font-bold text-green-700 bg-white border-gray-300 focus:ring-2 focus:ring-blue-100 outline-none" placeholder="0" />
                            </div>
                        </div>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Оформление / Шоу / Кенди-бар</label>
                    <div className="flex gap-4 mb-3 flex-wrap">
                        <label className="flex items-center gap-2 cursor-pointer bg-white border border-gray-200 p-2 rounded hover:bg-gray-50">
                            <input type="radio" name="regType" checked={regType === 'NONE'} onChange={() => { setRegType('NONE'); setRegPriceToClient('0'); }} className="text-blue-600"/> 
                            <span className="text-gray-900 font-medium">Без оформления</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer bg-white border border-gray-200 p-2 rounded hover:bg-gray-50">
                            <input type="radio" name="regType" checked={regType === 'GUEST'} onChange={() => { setRegType('GUEST'); setRegPriceToClient('0'); }} className="text-blue-600"/> 
                            <span className="text-gray-900 font-medium">Своё оформление</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer bg-white border border-gray-200 p-2 rounded hover:bg-gray-50">
                            <input type="radio" name="regType" checked={regType === 'EXTERNAL'} onChange={() => { setRegType('EXTERNAL'); setRegPriceToClient('0'); }} className="text-blue-600"/> 
                            <span className="text-gray-900 font-medium">Стороннее</span>
                        </label>
                    </div>
                    
                    {regType === 'EXTERNAL' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-3 rounded border border-gray-200">
                             <div className="md:col-span-3 mb-1">
                                <label className="block text-xs font-bold text-gray-500 mb-1">Выбрать из списка (Опционально)</label>
                                <select 
                                    onChange={(e) => handlePartnerSelect(e.target.value, 'REGISTRATION')}
                                    className="w-full p-2 border rounded text-sm text-gray-900 bg-white border-gray-300 focus:ring-2 focus:ring-blue-100 outline-none"
                                >
                                    <option value="">-- Выбрать --</option>
                                    {partners.filter(p => p.type === 'DECORATION' || p.type === 'OTHER').map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                            <input value={regOrg} onChange={e => setRegOrg(e.target.value)} placeholder="Организация" className="w-full p-2 border rounded text-sm text-gray-900 bg-white border-gray-300 focus:ring-2 focus:ring-blue-100 outline-none" />
                            <input value={regContact} onChange={e => setRegContact(e.target.value)} placeholder="Телефон / Контакт" className="w-full p-2 border rounded text-sm text-gray-900 bg-white border-gray-300 focus:ring-2 focus:ring-blue-100 outline-none" />
                            <div>
                                <input type="number" value={regPriceToClient} onChange={e => setRegPriceToClient(e.target.value)} placeholder="Цена для клиента" className="w-full p-2 border rounded text-sm font-bold text-green-700 bg-white border-gray-300 focus:ring-2 focus:ring-blue-100 outline-none" />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="font-bold text-gray-900 mb-3">Доп. услуги (посуда, скатерти)</h3>
                    <div className="flex gap-2 mb-2">
                        <input value={newServiceName} onChange={e => setNewServiceName(e.target.value)} placeholder="Название" className="flex-1 p-2 border rounded text-sm text-gray-900 bg-white border-gray-300 focus:ring-2 focus:ring-blue-100 outline-none" />
                        <input type="number" value={newServicePrice} onChange={e => setNewServicePrice(e.target.value)} placeholder="Цена" className="w-20 p-2 border rounded text-sm text-gray-900 bg-white border-gray-300 focus:ring-2 focus:ring-blue-100 outline-none" />
                        <button type="button" onClick={handleAddService} className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700"><Plus size={16}/></button>
                    </div>
                    <div className="space-y-1">
                        {services.map(s => (
                            <div key={s.id} className="flex justify-between items-center text-sm p-2 bg-gray-50 rounded">
                                <span>{s.name}</span>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold">{s.price} ₽</span>
                                    <button type="button" onClick={() => handleRemoveService(s.id)} className="text-red-500"><Trash2 size={14}/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="font-bold text-gray-900 mb-3">Пожелания / AI</h3>
                    <textarea value={wishes} onChange={e => setWishes(e.target.value)} className="w-full h-24 p-2 border rounded text-sm bg-white text-gray-900 border-gray-300 resize-none mb-2" placeholder="Заметки..." />
                    <button type="button" onClick={handleGenerateWish} disabled={isGenerating || !childName} className="text-xs flex items-center gap-1 text-purple-600 font-bold hover:text-purple-800 disabled:opacity-50">
                        <Sparkles size={14} /> {isGenerating ? 'Пишу...' : 'AI Поздравление'}
                    </button>
                </div>
            </div>

            <div className="border-t pt-6">
                <div className="flex justify-between items-end mb-4">
                    <div className="text-sm">
                         {!selectedEventId && (
                             <div>
                                <label className="block font-bold text-gray-700 mb-1">Предоплата сейчас (₽)</label>
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="number" 
                                        value={prepayment} 
                                        onChange={e => setPrepayment(e.target.value)} 
                                        className="p-2 border border-gray-300 rounded w-32 font-bold text-gray-900 bg-white" 
                                        placeholder="0"
                                    />
                                    {/* Payment Method Toggle */}
                                    <div className="flex bg-gray-100 rounded-lg p-1 border border-gray-200">
                                        <button 
                                            type="button"
                                            onClick={() => setPaymentMethod(PaymentMethod.CASH)}
                                            className={`p-1.5 rounded-md transition-all ${paymentMethod === PaymentMethod.CASH ? 'bg-white shadow-sm text-green-600' : 'text-gray-400 hover:text-gray-600'}`}
                                            title="Наличные"
                                        >
                                            <Banknote size={20}/>
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={() => setPaymentMethod(PaymentMethod.CARD)}
                                            className={`p-1.5 rounded-md transition-all ${paymentMethod === PaymentMethod.CARD ? 'bg-white shadow-sm text-purple-600' : 'text-gray-400 hover:text-gray-600'}`}
                                            title="Карта"
                                        >
                                            <CreditCard size={20}/>
                                        </button>
                                    </div>
                                </div>
                             </div>
                         )}
                    </div>
                    <div className="text-right">
                        <div className="text-gray-500 text-sm">Итоговая стоимость</div>
                        <div className="text-3xl font-bold text-gray-900">{currentTotalCost} ₽</div>
                    </div>
                </div>
                <button type="submit" className="w-full bg-pink-600 hover:bg-pink-700 text-white font-bold py-4 rounded-xl shadow-lg transition-transform active:scale-95 text-lg">
                    {selectedEventId ? 'Сохранить изменения' : 'Забронировать праздник'}
                </button>
            </div>
        </form>
    </div>
  );

  const renderMasterClassForm = () => (
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-md border border-gray-100">
           <div className="flex justify-between items-center mb-6 border-b pb-4">
               <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                   <BookOpen className="text-purple-500" /> Создать Мастер-Класс
               </h2>
               <button onClick={() => { setView('CALENDAR'); resetForm(); }} className="text-gray-500 hover:text-gray-700">Отмена</button>
           </div>
           
           {overlapError && (
                <div className="mb-6 p-4 bg-red-100 border-l-4 border-red-500 text-red-700 font-bold rounded flex items-center gap-3">
                    <AlertTriangle size={24} />
                    <span>{overlapError}</span>
                </div>
           )}

           <form onSubmit={handleSubmitMasterClass} className="space-y-6">
               <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Название МК</label>
                   <input required value={mcTitle} onChange={e => setMcTitle(e.target.value)} className="w-full p-3 border rounded-lg bg-white text-gray-900 border-gray-300 focus:ring-2 focus:ring-purple-100 outline-none" placeholder="Например: Росуем песком" />
               </div>
               
               <div className="grid grid-cols-2 gap-4">
                   <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Начало</label>
                        <input type="time" required value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full p-3 border rounded-lg bg-white text-gray-900 border-gray-300 outline-none" />
                   </div>
                   <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Конец</label>
                        <input type="time" required value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full p-3 border rounded-lg bg-white text-gray-900 border-gray-300 outline-none" />
                   </div>
               </div>

               <div>
                   <label className="block text-sm font-medium text-gray-700 mb-2">Тип организации</label>
                   <div className="flex gap-4">
                       <label className="flex items-center gap-2 cursor-pointer bg-gray-50 p-2 rounded flex-1 justify-center border hover:border-purple-300">
                           <input type="radio" checked={mcType === 'INTERNAL'} onChange={() => setMcType('INTERNAL')} className="text-purple-600"/>
                           <span className="font-bold text-gray-700">Своими силами</span>
                       </label>
                       <label className="flex items-center gap-2 cursor-pointer bg-gray-50 p-2 rounded flex-1 justify-center border hover:border-purple-300">
                           <input type="radio" checked={mcType === 'EXTERNAL'} onChange={() => setMcType('EXTERNAL')} className="text-purple-600"/>
                           <span className="font-bold text-gray-700">Приглашенный</span>
                       </label>
                   </div>
               </div>

               {mcType === 'EXTERNAL' && (
                   <div className="bg-purple-50 p-4 rounded-lg border border-purple-100 space-y-3">
                       <input value={mcOrg} onChange={e => setMcOrg(e.target.value)} placeholder="Организация" className="w-full p-2 border rounded bg-white text-gray-900" />
                       <div className="grid grid-cols-2 gap-3">
                           <input value={mcInstructorName} onChange={e => setMcInstructorName(e.target.value)} placeholder="Имя инструктора" className="w-full p-2 border rounded bg-white text-gray-900" />
                           <input value={mcInstructorPhone} onChange={e => setMcInstructorPhone(e.target.value)} placeholder="Телефон" className="w-full p-2 border rounded bg-white text-gray-900" />
                       </div>
                   </div>
               )}

               <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Цена билета за 1 ребенка (₽)</label>
                   <input required type="number" value={mcPricePerChild} onChange={e => setMcPricePerChild(e.target.value)} className="w-full p-3 border rounded-lg text-lg font-bold text-gray-900 bg-white border-gray-300 focus:ring-2 focus:ring-purple-100 outline-none" placeholder="0" />
               </div>

               <button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 rounded-xl shadow-lg mt-4 transition-transform active:scale-95">
                   Создать событие
               </button>
           </form>
      </div>
  );

  const renderEventDetails = () => {
    if (!selectedEventId) return null;
    const event = events.find(e => e.id === selectedEventId);
    if (!event) return null;

    if (event.type === 'MASTER_CLASS') {
        // --- MASTER CLASS VIEW ---
        return (
            <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg border border-purple-100 overflow-hidden min-h-[500px] flex flex-col">
                <div className="bg-purple-600 p-6 text-white flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-2 text-purple-200 text-sm font-mono mb-1">
                            <span>{new Date(event.date).toLocaleDateString()}</span>
                            <span>•</span>
                            <span>{event.startTime} - {event.endTime}</span>
                        </div>
                        <h2 className="text-3xl font-bold">{event.title}</h2>
                        <p className="opacity-90 mt-1">{event.masterClassType === 'INTERNAL' ? 'Проводим сами' : `Организатор: ${event.organizationName || 'Внешний'}`}</p>
                    </div>
                    <div className="flex gap-2">
                        {event.status !== 'CANCELLED' && (
                            <button onClick={() => setCancelModal({ isOpen: true, reason: '' })} className="bg-white/20 hover:bg-white/30 p-2 rounded text-white" title="Отменить">
                                <Trash2 size={20}/>
                            </button>
                        )}
                        <button onClick={() => { setView('CALENDAR'); setSelectedEventId(null); }} className="bg-white/20 hover:bg-white/30 p-2 rounded text-white">
                            <XCircle size={20}/>
                        </button>
                    </div>
                </div>

                <div className="p-6 flex-1">
                    <div className="flex justify-between items-center mb-6">
                         <div>
                             <h3 className="text-xl font-bold text-gray-900">Участники ({event.participants?.length || 0})</h3>
                             <p className="text-gray-500 text-sm">Цена билета: <span className="font-bold text-gray-900">{event.pricePerChild} ₽</span></p>
                         </div>
                         <button 
                             onClick={() => setShowAddChildModal(true)}
                             className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-md"
                         >
                             <Plus size={18}/> Добавить участника
                         </button>
                    </div>

                    <div className="space-y-3">
                        {(event.participants || []).map(p => (
                            <div key={p.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                                <div>
                                    <div className="font-bold text-gray-900">{p.childName}</div>
                                    <div className="text-sm text-gray-500">{p.parentPhone}</div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <div className="text-sm text-gray-500">Оплачено</div>
                                        <div className={`font-bold ${p.isFullyPaid ? 'text-green-600' : 'text-yellow-600'}`}>
                                            {p.prepayment} ₽
                                        </div>
                                    </div>
                                    {!p.isFullyPaid && (
                                        <button 
                                            onClick={() => setPayModal({ isOpen: true, participantId: p.id, amount: (event.pricePerChild || 0) - p.prepayment, childName: p.childName, parentPhone: p.parentPhone })}
                                            className="bg-green-100 hover:bg-green-200 text-green-700 p-2 rounded-lg font-bold text-sm"
                                        >
                                            Доплатить
                                        </button>
                                    )}
                                    {p.isFullyPaid && <CheckCircle className="text-green-500" size={24} />}
                                </div>
                            </div>
                        ))}
                        {(!event.participants || event.participants.length === 0) && (
                            <div className="text-center py-10 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                                Нет участников
                            </div>
                        )}
                    </div>
                </div>

                {event.status === 'SCHEDULED' && (
                    <div className="p-4 bg-gray-50 border-t flex justify-end">
                         <button onClick={handleCompleteEvent} className="text-purple-600 font-bold hover:bg-purple-100 px-4 py-2 rounded transition-colors">
                             Завершить событие
                         </button>
                    </div>
                )}
            </div>
        );
    } else {
        // --- BIRTHDAY VIEW ---
        const balanceDue = (event.totalCost || 0) - event.prepayment;
        return (
            <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-lg border border-pink-100 overflow-hidden flex flex-col h-full">
                <div className="bg-pink-600 p-6 text-white flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-2 text-pink-200 text-sm font-mono mb-1">
                            <span>{new Date(event.date).toLocaleDateString()}</span>
                            <span>•</span>
                            <span>{event.startTime} - {event.endTime}</span>
                        </div>
                        <h2 className="text-3xl font-bold">{event.childName}</h2>
                        <p className="opacity-90 mt-1">{event.childCount} гостей • {event.parentName} ({event.phone})</p>
                    </div>
                    <div className="flex gap-2">
                        {event.status !== 'CANCELLED' && (
                            <button onClick={() => setView('EDIT_BIRTHDAY')} className="bg-white/20 hover:bg-white/30 p-2 rounded text-white" title="Редактировать">
                                <Edit2 size={20}/>
                            </button>
                        )}
                        {event.status !== 'CANCELLED' && (
                             <button onClick={() => setCancelModal({ isOpen: true, reason: '' })} className="bg-white/20 hover:bg-white/30 p-2 rounded text-white" title="Отменить">
                                 <Trash2 size={20}/>
                             </button>
                        )}
                         <button onClick={() => { setView('CALENDAR'); setSelectedEventId(null); }} className="bg-white/20 hover:bg-white/30 p-2 rounded text-white">
                            <XCircle size={20}/>
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Left: Services List */}
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-gray-900 font-bold mb-3 border-b pb-2">Услуги</h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Аренда зала</span>
                                        <span className="font-bold">{event.roomPrice} ₽</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Игровая ({event.childCount} чел)</span>
                                        <span className="font-bold">{event.perChildPrice} ₽</span>
                                    </div>
                                    {event.animator && event.animator.type !== 'GUEST' && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">Аниматор ({event.animator.name || 'Сторонний'})</span>
                                            <span className="font-bold">{event.animator.priceToClient} ₽</span>
                                        </div>
                                    )}
                                    {event.registration && event.registration.type !== 'NONE' && event.registration.type !== 'GUEST' && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">Оформление ({event.registration.organization})</span>
                                            <span className="font-bold">{event.registration.priceToClient} ₽</span>
                                        </div>
                                    )}
                                    {event.additionalServices && event.additionalServices.map(s => (
                                        <div key={s.id} className="flex justify-between text-sm text-gray-500">
                                            <span>{s.name}</span>
                                            <span className="font-bold">{s.price} ₽</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-4 pt-4 border-t flex justify-between text-lg font-bold text-gray-900">
                                    <span>Итого</span>
                                    <span>{event.totalCost} ₽</span>
                                </div>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-xl">
                                <h3 className="font-bold text-gray-900 mb-2 text-sm">Пожелания</h3>
                                <p className="text-sm text-gray-600 italic">{event.wishes || 'Нет заметок'}</p>
                            </div>
                        </div>

                        {/* Right: Payment Status */}
                        <div className="bg-white border-l pl-8 border-gray-100 flex flex-col justify-center">
                             <div className="text-center mb-8">
                                 <div className="text-gray-500 uppercase text-xs font-bold tracking-wider mb-2">Статус оплаты</div>
                                 {balanceDue <= 0 ? (
                                     <div className="inline-flex flex-col items-center text-green-600">
                                         <CheckCircle size={48} className="mb-2"/>
                                         <span className="text-2xl font-bold">ОПЛАЧЕНО</span>
                                     </div>
                                 ) : (
                                     <div className="inline-flex flex-col items-center">
                                         <div className="text-4xl font-bold text-gray-900 mb-1">{balanceDue} ₽</div>
                                         <span className="text-sm text-red-500 font-bold">Осталось оплатить</span>
                                         <div className="text-xs text-gray-400 mt-1">Внесено: {event.prepayment} ₽</div>
                                     </div>
                                 )}
                             </div>

                             {balanceDue > 0 && event.status !== 'CANCELLED' && (
                                 <button 
                                     onClick={() => setPayModal({ isOpen: true, participantId: null, amount: balanceDue, childName: event.childName || '', isBirthday: true, parentPhone: event.phone })}
                                     className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2"
                                 >
                                     <Wallet size={20}/> Принять доплату
                                 </button>
                             )}
                        </div>
                    </div>
                </div>
                 
                {event.status === 'SCHEDULED' && (
                    <div className="p-4 bg-gray-50 border-t flex justify-end">
                         <button onClick={handleCompleteEvent} className="text-pink-600 font-bold hover:bg-pink-100 px-4 py-2 rounded transition-colors">
                             Завершить событие
                         </button>
                    </div>
                )}
            </div>
        );
    }
  };

  return (
    <div className="h-full relative">
       {/* Toast Notification */}
       {showSuccessToast && (
            <div className="fixed top-20 right-4 bg-green-500 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 z-50 animate-in slide-in-from-right duration-300">
                <CheckCircle size={24} />
                <span className="font-bold">Операция выполнена успешно!</span>
            </div>
       )}

       {view === 'CALENDAR' && renderCalendar()}
       {view === 'SELECT_TYPE' && renderSelectType()}
       {(view === 'FORM_BIRTHDAY' || view === 'EDIT_BIRTHDAY') && renderBirthdayForm()}
       {view === 'FORM_MASTERCLASS' && renderMasterClassForm()}
       {(view === 'VIEW_BIRTHDAY' || view === 'VIEW_MASTERCLASS') && renderEventDetails()}

       {/* Pay Modal */}
       {payModal.isOpen && (
           <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
                    <div className="bg-green-600 p-4 text-white flex justify-between items-center">
                        <h3 className="font-bold text-lg">Прием оплаты</h3>
                        <button onClick={() => setPayModal({...payModal, isOpen: false})} className="hover:bg-green-700 p-1 rounded"><XCircle size={20}/></button>
                    </div>
                    <form onSubmit={handlePayRemainingSubmit} className="p-6 space-y-4">
                        <div className="text-center mb-4">
                            <div className="text-gray-500 text-sm">К оплате</div>
                            <div className="text-3xl font-bold text-gray-900">{payModal.amount} ₽</div>
                            <div className="text-xs text-gray-400 mt-1">{payModal.childName}</div>
                        </div>

                        {/* Bonus Logic in Payment Modal */}
                        {foundClientForPayment && foundClientForPayment.bonusBalance && foundClientForPayment.bonusBalance > 0 && (
                            <div className="bg-purple-50 p-3 rounded-lg border border-purple-100">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs font-bold text-purple-700">Бонусы клиента: {foundClientForPayment.bonusBalance}</span>
                                    <input 
                                       type="number"
                                       max={Math.min(foundClientForPayment.bonusBalance, payModal.amount)}
                                       value={payBonusUsed}
                                       onChange={(e) => setPayBonusUsed(parseInt(e.target.value) || 0)}
                                       className="w-20 p-1 text-sm border border-purple-300 rounded text-right"
                                       placeholder="0"
                                    />
                                </div>
                                <div className="text-xs text-right text-gray-500">
                                    К оплате деньгами: <span className="font-bold">{Math.max(0, payModal.amount - payBonusUsed)} ₽</span>
                                </div>
                            </div>
                        )}

                        <div className="flex gap-2">
                            <label className="flex-1 cursor-pointer">
                                <input type="radio" checked={paymentMethod === PaymentMethod.CASH} onChange={() => setPaymentMethod(PaymentMethod.CASH)} className="hidden peer"/>
                                <div className="w-full border p-3 rounded-lg text-center peer-checked:bg-green-100 peer-checked:border-green-400 peer-checked:text-green-800 font-bold transition-colors">Наличные</div>
                            </label>
                            <label className="flex-1 cursor-pointer">
                                <input type="radio" checked={paymentMethod === PaymentMethod.CARD} onChange={() => setPaymentMethod(PaymentMethod.CARD)} className="hidden peer"/>
                                <div className="w-full border p-3 rounded-lg text-center peer-checked:bg-purple-100 peer-checked:border-purple-400 peer-checked:text-purple-800 font-bold transition-colors">Карта</div>
                            </label>
                        </div>
                        <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg shadow-lg">Оплатить</button>
                    </form>
                </div>
           </div>
       )}

       {/* Add Child to MC Modal */}
       {showAddChildModal && (
           <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
                    <div className="bg-purple-600 p-4 text-white flex justify-between items-center">
                        <h3 className="font-bold text-lg">Новый участник</h3>
                        <button onClick={() => setShowAddChildModal(false)} className="hover:bg-purple-700 p-1 rounded"><XCircle size={20}/></button>
                    </div>
                    <div className="p-6 space-y-4">
                        <input value={mcChildName} onChange={e => setMcChildName(e.target.value)} placeholder="Имя ребенка" className="w-full p-3 border rounded-lg bg-white text-gray-900" />
                        <input value={mcParentPhone} onChange={e => setMcParentPhone(e.target.value)} placeholder="Телефон родителя" className="w-full p-3 border rounded-lg bg-white text-gray-900" />
                        <div>
                             <label className="block text-xs font-bold text-gray-500 mb-1">Предоплата (необязательно)</label>
                             <div className="flex items-center gap-2">
                                <input type="number" value={mcChildPrepayment} onChange={e => setMcChildPrepayment(e.target.value)} placeholder="0" className="w-full p-3 border rounded-lg bg-white text-gray-900 font-bold" />
                                {/* Payment Method Toggle for MC */}
                                <div className="flex bg-gray-100 rounded-lg p-1 border border-gray-200">
                                    <button 
                                        type="button"
                                        onClick={() => setMcPaymentMethod(PaymentMethod.CASH)}
                                        className={`p-1.5 rounded-md transition-all ${mcPaymentMethod === PaymentMethod.CASH ? 'bg-white shadow-sm text-green-600' : 'text-gray-400 hover:text-gray-600'}`}
                                        title="Наличные"
                                    >
                                        <Banknote size={20}/>
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => setMcPaymentMethod(PaymentMethod.CARD)}
                                        className={`p-1.5 rounded-md transition-all ${mcPaymentMethod === PaymentMethod.CARD ? 'bg-white shadow-sm text-purple-600' : 'text-gray-400 hover:text-gray-600'}`}
                                        title="Карта"
                                    >
                                        <CreditCard size={20}/>
                                    </button>
                                </div>
                             </div>
                        </div>
                        <button onClick={handleAddParticipant} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-lg shadow-lg">Добавить</button>
                    </div>
                </div>
           </div>
       )}

       {/* Cancel Modal */}
       {cancelModal.isOpen && (
           <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
                    <div className="bg-red-100 p-4 text-red-800 flex items-center gap-2">
                        <AlertTriangle size={24}/>
                        <h3 className="font-bold text-lg">Отмена события</h3>
                    </div>
                    <div className="p-6 space-y-4">
                        <p className="text-sm text-gray-600">Вы уверены? Событие будет помечено как отмененное. Укажите причину.</p>
                        <textarea 
                            value={cancelModal.reason} 
                            onChange={e => setCancelModal({...cancelModal, reason: e.target.value})} 
                            className="w-full p-2 border border-gray-300 rounded h-24 resize-none bg-white text-gray-900"
                            placeholder="Причина отмены..."
                        />
                        <div className="flex gap-2">
                             <button onClick={() => setCancelModal({isOpen: false, reason: ''})} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded font-bold">Назад</button>
                             <button onClick={handleCancelEvent} disabled={!cancelModal.reason} className="flex-1 py-2 bg-red-600 text-white rounded font-bold hover:bg-red-700 disabled:opacity-50">Отменить</button>
                        </div>
                    </div>
                </div>
           </div>
       )}
    </div>
  );
};

export default EventsTab;