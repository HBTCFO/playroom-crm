import React, { useState, useEffect } from 'react';
import { DayData, Tariff, Product, Session, Transaction, TransactionType, CalendarEvent, PaymentMethod, Discount, BirthdayRateSettings, StaffAnimator, Category, Partner, Administrator, Client, ScheduleShift, ImportantDocument, MiniGameSettings, Feedback, FeedbackType, CustomTracker, AdminTask } from './types';
import { DEFAULT_TARIFFS, DEFAULT_PRODUCTS, DEFAULT_DISCOUNTS, DEFAULT_EXTENSION_RATE, DEFAULT_BIRTHDAY_RATES, DEFAULT_STAFF_ANIMATORS, DEFAULT_CATEGORIES, DEFAULT_PARTNERS, DEFAULT_ADMINISTRATORS, DEFAULT_CLIENTS, DEFAULT_BONUS_PERCENTAGE, DEFAULT_MINI_GAME_SETTINGS } from './constants';
import SessionsTab from './components/SessionsTab';
import EventsTab from './components/EventsTab';
import FinanceTab from './components/FinanceTab';
import GoodsTab from './components/GoodsTab';
import OwnerTab from './components/OwnerTab';
import ClientsTab from './components/ClientsTab';
import AdminTab from './components/AdminTab';
import AnalyticsTab from './components/AnalyticsTab';
import { LayoutDashboard, CalendarDays, BadgeDollarSign, Coffee, UserCog, LogOut, Users, ShieldCheck, BarChart3, Loader2 } from 'lucide-react';

// Firebase Imports
import { db } from './firebase';
import { collection, doc, onSnapshot, setDoc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';

type Tab = 'SESSIONS' | 'EVENTS' | 'FINANCE' | 'GOODS' | 'OWNER' | 'CLIENTS' | 'ADMIN' | 'ANALYTICS';

const App: React.FC = () => {
  // Global State (Data fetched from Firebase)
  const [loading, setLoading] = useState(true);
  const [currentDayId, setCurrentDayId] = useState<string | null>(null);
  const [days, setDays] = useState<Record<string, DayData>>({});
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [adminTasks, setAdminTasks] = useState<AdminTask[]>([]);
  const [schedule, setSchedule] = useState<ScheduleShift[]>([]);

  // Settings State (Sync with DB 'settings/config')
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [extensionRate, setExtensionRate] = useState<number>(DEFAULT_EXTENSION_RATE);
  const [birthdayRates, setBirthdayRates] = useState<BirthdayRateSettings>(DEFAULT_BIRTHDAY_RATES);
  const [staffAnimators, setStaffAnimators] = useState<StaffAnimator[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [administrators, setAdministrators] = useState<Administrator[]>([]);
  const [documents, setDocuments] = useState<ImportantDocument[]>([]);
  const [miniGameSettings, setMiniGameSettings] = useState<MiniGameSettings>(DEFAULT_MINI_GAME_SETTINGS);
  const [customTrackers, setCustomTrackers] = useState<CustomTracker[]>([]);
  const [bonusPercentage, setBonusPercentage] = useState<number>(DEFAULT_BONUS_PERCENTAGE);
  
  const [activeTab, setActiveTab] = useState<Tab>('SESSIONS');

  // Helper to get local date string YYYY-MM-DD
  const getLocalDayString = () => {
      const d = new Date();
      const offset = d.getTimezoneOffset() * 60000;
      const localISOTime = (new Date(d.getTime() - offset)).toISOString().slice(0, 10);
      return localISOTime;
  };

  // --- FIREBASE SUBSCRIPTIONS ---
  useEffect(() => {
    // 1. Subscribe to Days
    const unsubDays = onSnapshot(collection(db, 'days'), (snapshot) => {
        const daysData: Record<string, DayData> = {};
        snapshot.forEach(doc => {
            daysData[doc.id] = doc.data() as DayData;
        });
        setDays(daysData);
        
        // Check active shift logic
        const today = getLocalDayString();
        if (daysData[today] && !daysData[today].isClosed) {
            setCurrentDayId(today);
        }
    });

    // 2. Subscribe to Clients
    const unsubClients = onSnapshot(collection(db, 'clients'), (snapshot) => {
        setClients(snapshot.docs.map(d => d.data() as Client));
    });

    // 3. Subscribe to Events
    const unsubEvents = onSnapshot(collection(db, 'events'), (snapshot) => {
        setEvents(snapshot.docs.map(d => d.data() as CalendarEvent));
    });

    // 4. Subscribe to Feedback & Tasks & Schedule
    const unsubFeedback = onSnapshot(collection(db, 'feedbacks'), (snapshot) => {
        setFeedbacks(snapshot.docs.map(d => d.data() as Feedback));
    });
    const unsubTasks = onSnapshot(collection(db, 'adminTasks'), (snapshot) => {
        setAdminTasks(snapshot.docs.map(d => d.data() as AdminTask));
    });
    const unsubSchedule = onSnapshot(collection(db, 'schedule'), (snapshot) => {
        setSchedule(snapshot.docs.map(d => d.data() as ScheduleShift));
    });

    // 5. Subscribe to Settings (Single Doc)
    const unsubSettings = onSnapshot(doc(db, 'settings', 'config'), (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            setTariffs(data.tariffs || []);
            setProducts(data.products || []);
            setCategories(data.categories || []);
            setDiscounts(data.discounts || []);
            setExtensionRate(data.extensionRate ?? DEFAULT_EXTENSION_RATE);
            setBirthdayRates(data.birthdayRates || DEFAULT_BIRTHDAY_RATES);
            setStaffAnimators(data.staffAnimators || []);
            setPartners(data.partners || []);
            setAdministrators(data.administrators || []);
            setDocuments(data.documents || []);
            setMiniGameSettings(data.miniGameSettings || DEFAULT_MINI_GAME_SETTINGS);
            setCustomTrackers(data.customTrackers || []);
            setBonusPercentage(data.bonusPercentage ?? DEFAULT_BONUS_PERCENTAGE);
        } else {
            // First run: Seed Database with Defaults
            const batch = writeBatch(db);
            const settingsRef = doc(db, 'settings', 'config');
            batch.set(settingsRef, {
                tariffs: DEFAULT_TARIFFS,
                products: DEFAULT_PRODUCTS,
                categories: DEFAULT_CATEGORIES,
                discounts: DEFAULT_DISCOUNTS,
                extensionRate: DEFAULT_EXTENSION_RATE,
                birthdayRates: DEFAULT_BIRTHDAY_RATES,
                staffAnimators: DEFAULT_STAFF_ANIMATORS,
                partners: DEFAULT_PARTNERS,
                administrators: DEFAULT_ADMINISTRATORS,
                documents: [],
                miniGameSettings: DEFAULT_MINI_GAME_SETTINGS,
                customTrackers: [],
                bonusPercentage: DEFAULT_BONUS_PERCENTAGE
            });
            // Also seed clients if empty
            DEFAULT_CLIENTS.forEach(c => {
                batch.set(doc(db, 'clients', c.id), c);
            });
            batch.commit().catch(console.error);
        }
        setLoading(false);
    });

    return () => {
        unsubDays();
        unsubClients();
        unsubEvents();
        unsubFeedback();
        unsubTasks();
        unsubSchedule();
        unsubSettings();
    };
  }, []);

  // --- DB Helper Wrappers ---
  const saveSettings = async (field: string, value: any) => {
      await updateDoc(doc(db, 'settings', 'config'), { [field]: value });
  };

  // --- Handlers (Now Writing to DB) ---

  // CLIENTS
  const handleCheckAndAddClient = async (name: string, phone: string, childName: string, initialBonus: number = 0) => {
    if (!name || !phone) return;
    const normalizedPhone = phone.trim();
    const existingClient = clients.find(c => c.phone === normalizedPhone);

    if (existingClient) {
        // Update existing
        let updates: any = {};
        if (initialBonus > 0) {
            updates.bonusBalance = (existingClient.bonusBalance || 0) + initialBonus;
        }
        if (childName) {
            const childExists = existingClient.children.some(c => c.name.toLowerCase() === childName.toLowerCase());
            if (!childExists) {
                updates.children = [...existingClient.children, { id: Date.now().toString(), name: childName }];
            }
        }
        if (Object.keys(updates).length > 0) {
            await updateDoc(doc(db, 'clients', existingClient.id), updates);
        }
    } else {
        // Create new
        const newClient: Client = {
            id: `client_${Date.now()}`,
            name,
            phone: normalizedPhone,
            children: childName ? [{ id: Date.now().toString(), name: childName }] : [],
            registrationDate: new Date().toISOString().slice(0, 10),
            notes: 'Автоматически создан при посещении',
            bonusCardNumber: Math.floor(100000 + Math.random() * 900000).toString(),
            bonusBalance: initialBonus,
            isAddedToContacts: false
        };
        await setDoc(doc(db, 'clients', newClient.id), newClient);
    }
  };

  const handleUpdateClients = (newClients: Client[]) => {
      newClients.forEach(c => {
          setDoc(doc(db, 'clients', c.id), c); 
      });
  };

  const handleDeleteClient = async (clientId: string) => {
      await deleteDoc(doc(db, 'clients', clientId));
  };

  const handleIssueBonusCard = async (clientId: string) => {
      await updateDoc(doc(db, 'clients', clientId), {
          bonusCardNumber: Math.floor(100000 + Math.random() * 900000).toString(),
          bonusBalance: 0
      });
  };

  const updateClientBonuses = async (phone: string, used: number, accrued: number) => {
      const client = clients.find(c => c.phone === phone);
      if (client) {
          const current = client.bonusBalance || 0;
          await updateDoc(doc(db, 'clients', client.id), {
              bonusBalance: Math.max(0, current - used + accrued)
          });
      }
  };

  // EVENTS
  const handleUpdateEvents = (newEvents: CalendarEvent[]) => {
      newEvents.forEach(e => {
          setDoc(doc(db, 'events', e.id), e);
      });
      // Handle deletions if array shrank
      if (newEvents.length < events.length) {
          const newIds = new Set(newEvents.map(e => e.id));
          events.forEach(e => {
              if (!newIds.has(e.id)) {
                  deleteDoc(doc(db, 'events', e.id));
              }
          });
      }
  };

  // DAYS / FINANCE
  const handleOpenDay = async (date: string, adminId: string, openingCash: number) => {
    const admin = administrators.find(a => a.id === adminId);
    const newDay: DayData = {
        id: date,
        date: date,
        adminName: admin ? admin.name : 'Unknown',
        openingCash,
        isClosed: false,
        sessions: [],
        transactions: [],
        cleaningLog: {
            morning: { isCompleted: false, completedBy: null, timestamp: null },
            evening: { isCompleted: false, completedBy: null, timestamp: null },
            current: []
        }
    };
    if (!days[date]) {
        await setDoc(doc(db, 'days', date), newDay);
    } else if (days[date].isClosed) {
        await updateDoc(doc(db, 'days', date), { isClosed: false });
    }
    setCurrentDayId(date);
  };

  const handleCloseDay = async (actualCash: number, adminId: string) => {
      if (!currentDayId) return;
      const day = days[currentDayId];
      
      const transactions = day.transactions || [];
      const cashRevenue = transactions
        .filter(t => t.paymentMethod === PaymentMethod.CASH && (t.type === 'SALE' || t.type === 'EXTENSION' || t.type === 'PREPAYMENT'))
        .reduce((sum, t) => sum + t.amount, 0);
      const cashAdds = transactions.filter(t => t.type === TransactionType.ADD_CASH).reduce((sum, t) => sum + t.amount, 0);
      const cashWithdraws = transactions.filter(t => t.type === TransactionType.WITHDRAW_CASH).reduce((sum, t) => sum + t.amount, 0);
      
      const calculatedCash = day.openingCash + cashRevenue + cashAdds - cashWithdraws;
      const discrepancy = actualCash - calculatedCash;
      const admin = administrators.find(a => a.id === adminId);

      await updateDoc(doc(db, 'days', currentDayId), {
          isClosed: true,
          closingCash: actualCash,
          calculatedCash,
          discrepancy,
          closingAdminName: admin ? admin.name : 'Unknown'
      });
  };

  const handleForceCloseShift = async (date: string) => {
      if (days[date]) {
          await updateDoc(doc(db, 'days', date), {
             isClosed: true,
             closingCash: 0,
             discrepancy: 0,
             closingAdminName: 'Admin Force'
          });
          if (currentDayId === date) setCurrentDayId(null);
      }
  };

  const handleReopenShift = async (date: string) => {
      if (days[date]) {
          await updateDoc(doc(db, 'days', date), { isClosed: false });
          const today = getLocalDayString();
          if (date === today) setCurrentDayId(today);
      }
  };

  const handleDeleteDay = async (date: string) => {
      await deleteDoc(doc(db, 'days', date));
      if (currentDayId === date) setCurrentDayId(null);
  };

  // SESSIONS
  const handleAddSession = async (sessionData: any) => {
      if (!currentDayId) return;
      const day = days[currentDayId];
      
      const { price, paymentMethod, useBonuses = 0, accruedBonuses = 0, parentPhone } = sessionData;

      const newSession: Session = {
          id: Date.now().toString(),
          startTime: Date.now(),
          endTime: sessionData.duration > 0 ? Date.now() + sessionData.duration * 60000 : null,
          isActive: true,
          extraItems: [],
          paidWithBonuses: useBonuses,
          accruedBonuses: accruedBonuses,
          discountReason: sessionData.discountReason || null, // Sanitize undefined
          parentPhone: sessionData.parentPhone || null, // Sanitize undefined
          ...sessionData
      };

      const actualMoneyPaid = price - useBonuses;
      let newTransaction: Transaction | null = null;
      
      if (actualMoneyPaid > 0) {
          newTransaction = {
            id: `tx_${Date.now()}`,
            timestamp: Date.now(),
            amount: actualMoneyPaid,
            type: TransactionType.SALE,
            paymentMethod: paymentMethod,
            description: `Сессия: ${sessionData.childName} (${sessionData.tariffName}) ${useBonuses > 0 ? `[Бонусы: ${useBonuses}]` : ''}`,
            relatedSessionId: newSession.id
          };
      }

      const updatedSessions = [...day.sessions, newSession];
      const updatedTransactions = newTransaction ? [...day.transactions, newTransaction] : day.transactions;

      await updateDoc(doc(db, 'days', currentDayId), {
          sessions: updatedSessions,
          transactions: updatedTransactions
      });

      if (parentPhone) {
          updateClientBonuses(parentPhone, useBonuses, accruedBonuses);
      }
  };

  const handleCloseSession = async (sessionId: string) => {
      if (!currentDayId) return;
      const day = days[currentDayId];
      const updatedSessions = day.sessions.map(s => s.id === sessionId ? { ...s, isActive: false } : s);
      await updateDoc(doc(db, 'days', currentDayId), { sessions: updatedSessions });
  };

  const handleAddExtraItem = async (sessionId: string, product: Product) => {
      if (!currentDayId) return;
      const day = days[currentDayId];
      const session = day.sessions.find(s => s.id === sessionId);
      if (!session) return;

      const existingItemIndex = session.extraItems.findIndex(i => i.productId === product.id);
      let newExtraItems = [...session.extraItems];

      if (existingItemIndex >= 0) {
          newExtraItems[existingItemIndex] = {
              ...newExtraItems[existingItemIndex],
              quantity: newExtraItems[existingItemIndex].quantity + 1
          };
      } else {
          newExtraItems.push({
              productId: product.id,
              productName: product.name,
              price: product.price,
              quantity: 1,
              timestamp: Date.now()
          });
      }

      const newTransaction: Transaction = {
         id: `tx_extra_${Date.now()}`,
         timestamp: Date.now(),
         amount: product.price,
         type: TransactionType.SALE,
         paymentMethod: PaymentMethod.CASH, 
         description: `Товар: ${product.name} -> ${session.childName}`,
         relatedSessionId: sessionId
      };

      const updatedSessions = day.sessions.map(s => s.id === sessionId ? { ...s, extraItems: newExtraItems } : s);
      const updatedTransactions = [...day.transactions, newTransaction];

      await updateDoc(doc(db, 'days', currentDayId), {
          sessions: updatedSessions,
          transactions: updatedTransactions
      });
  };

  const handleExtendSession = async (sessionId: string, minutes: number, cost: number, method: PaymentMethod) => {
      if (!currentDayId) return;
      const day = days[currentDayId];
      const session = day.sessions.find(s => s.id === sessionId);
      if (!session || !session.endTime) return;

      const newEndTime = session.endTime + (minutes * 60000);
      const newTransaction: Transaction = {
          id: `tx_ext_${Date.now()}`,
          timestamp: Date.now(),
          amount: cost,
          type: TransactionType.EXTENSION,
          paymentMethod: method,
          description: `Продление: ${session.childName} (+${minutes} мин)`,
          relatedSessionId: sessionId
      };

      const updatedSessions = day.sessions.map(s => s.id === sessionId ? { ...s, endTime: newEndTime } : s);
      const updatedTransactions = [...day.transactions, newTransaction];

      await updateDoc(doc(db, 'days', currentDayId), {
          sessions: updatedSessions,
          transactions: updatedTransactions
      });
  };

  const handleAddTransaction = async (amount: number, type: TransactionType, method: PaymentMethod, description: string, relatedEventId?: string) => {
      if (!currentDayId) {
          alert("Смена не открыта!");
          return;
      }
      const day = days[currentDayId];
      const newTransaction: Transaction = {
          id: `tx_manual_${Date.now()}`,
          timestamp: Date.now(),
          amount,
          type,
          paymentMethod: method,
          description,
          relatedEventId: relatedEventId || null
      };
      await updateDoc(doc(db, 'days', currentDayId), {
          transactions: [...day.transactions, newTransaction]
      });
  };

  const handleEventTransaction = async (amount: number, type: TransactionType, method: PaymentMethod, description: string, eventId: string, phone?: string, bonusesUsed: number = 0) => {
      if (bonusesUsed > 0 && phone) {
          await updateClientBonuses(phone, bonusesUsed, 0); 
          const accrual = Math.floor(amount * (bonusPercentage / 100));
          await updateClientBonuses(phone, 0, accrual);
      } else if (phone && amount > 0) {
           const accrual = Math.floor(amount * (bonusPercentage / 100));
           await updateClientBonuses(phone, 0, accrual);
      }
      await handleAddTransaction(amount, type, method, description + (bonusesUsed > 0 ? ` [Бонусы: ${bonusesUsed}]` : ''), eventId);
  };

  const handleAddCashOp = (amount: number, type: TransactionType, description: string) => {
      handleAddTransaction(amount, type, PaymentMethod.CASH, description);
  };

  // ADMIN / CLEANING
  const handleUpdateCleaning = async (shift: 'morning' | 'evening' | 'current', isCompleted: boolean, adminName: string) => {
      const today = getLocalDayString();
      if (!days[today]) return; 
      
      const cleaningLog = days[today].cleaningLog || { morning: { isCompleted: false, completedBy: null, timestamp: null }, evening: { isCompleted: false, completedBy: null, timestamp: null }, current: [] };
      let newLog = { ...cleaningLog } as any;

      if (shift === 'current') {
          const newRecord = { isCompleted: true, completedBy: adminName, timestamp: Date.now() };
          newLog.current = [...(newLog.current || []), newRecord];
      } else {
          newLog[shift] = {
              isCompleted,
              completedBy: isCompleted ? adminName : null,
              timestamp: isCompleted ? Date.now() : null
          };
      }
      await updateDoc(doc(db, 'days', today), { cleaningLog: newLog });
  };

  const handleUpdateSchedule = async (newSchedule: ScheduleShift[]) => {
      newSchedule.forEach(s => {
          setDoc(doc(db, 'schedule', s.id), s);
      });
      // Handle deletion
      if (newSchedule.length < schedule.length) {
          const newIds = new Set(newSchedule.map(s => s.id));
          schedule.forEach(s => {
              if (!newIds.has(s.id)) deleteDoc(doc(db, 'schedule', s.id));
          });
      }
  };

  const handleAddFeedback = async (type: FeedbackType, content: string) => {
      const newFeedback: Feedback = {
          id: Date.now().toString(),
          date: new Date().toISOString(),
          type,
          content,
          isResolved: false
      };
      await setDoc(doc(db, 'feedbacks', newFeedback.id), newFeedback);
  };

  const handleResolveFeedback = async (id: string) => {
      await deleteDoc(doc(db, 'feedbacks', id));
  };

  const handleAddTask = async (description: string) => {
      const newTask: AdminTask = {
          id: Date.now().toString(),
          description,
          createdAt: new Date().toISOString(),
          isCompleted: false
      };
      await setDoc(doc(db, 'adminTasks', newTask.id), newTask);
  };

  const handleDeleteTask = async (id: string) => {
      await deleteDoc(doc(db, 'adminTasks', id));
  };

  const handleCompleteTask = async (id: string, adminName: string, comment: string) => {
      await updateDoc(doc(db, 'adminTasks', id), {
          isCompleted: true,
          completedBy: adminName,
          completedAt: new Date().toISOString(),
          completionComment: comment
      });
  };

  // --- RENDER ---
  if (loading) {
      return (
          <div className="h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-500">
              <Loader2 size={48} className="animate-spin mb-4 text-blue-600"/>
              <p>Загрузка данных...</p>
          </div>
      );
  }

  const renderContent = () => {
    const today = getLocalDayString();
    const activeAdminName = currentDayId && days[currentDayId] ? days[currentDayId].adminName : 'Неизвестно';

    switch (activeTab) {
      case 'SESSIONS':
        return (
          <SessionsTab 
            sessions={currentDayId && days[currentDayId] ? days[currentDayId].sessions : []}
            tariffs={tariffs}
            products={products}
            discounts={discounts}
            extensionRate={extensionRate}
            clients={clients}
            bonusPercentage={bonusPercentage}
            onAddSession={handleAddSession}
            onAddExtraItem={handleAddExtraItem}
            onExtendSession={handleExtendSession}
            onCloseSession={handleCloseSession}
            onCheckClient={handleCheckAndAddClient}
          />
        );
      case 'EVENTS':
        return (
            <EventsTab 
                events={events}
                birthdayRates={birthdayRates}
                staffAnimators={staffAnimators}
                partners={partners}
                clients={clients}
                bonusPercentage={bonusPercentage}
                onUpdateEvents={handleUpdateEvents}
                onAddTransaction={handleEventTransaction}
                onCheckClient={handleCheckAndAddClient}
            />
        );
      case 'FINANCE':
        return (
            <FinanceTab 
                days={days}
                currentDayId={currentDayId}
                administrators={administrators}
                onAddCashOp={handleAddCashOp}
                onCloseDay={handleCloseDay}
                isShiftOpen={!!(currentDayId && days[currentDayId] && !days[currentDayId].isClosed)}
                onOpenDay={handleOpenDay}
            />
        );
      case 'GOODS':
        return (
            <GoodsTab 
                tariffs={tariffs}
                products={products}
                categories={categories}
                birthdayRates={birthdayRates}
                extensionRate={extensionRate}
            />
        );
      case 'CLIENTS':
        return (
            <ClientsTab
                clients={clients}
                onUpdateClients={handleUpdateClients}
                onDeleteClient={handleDeleteClient}
                onIssueCard={handleIssueBonusCard}
                onAddFeedback={handleAddFeedback}
            />
        );
      case 'ADMIN':
        return (
            <AdminTab
                administrators={administrators}
                schedule={schedule}
                currentDayLog={days[today]?.cleaningLog}
                currentDate={today}
                currentAdminName={activeAdminName}
                documents={documents}
                miniGameSettings={miniGameSettings}
                adminTasks={adminTasks}
                onUpdateSchedule={handleUpdateSchedule}
                onUpdateCleaning={handleUpdateCleaning}
                onCompleteTask={handleCompleteTask}
            />
        );
      case 'OWNER':
        return (
            <OwnerTab 
                events={events}
                days={days}
                tariffs={tariffs}
                products={products}
                categories={categories}
                discounts={discounts}
                extensionRate={extensionRate}
                birthdayRates={birthdayRates}
                staffAnimators={staffAnimators}
                partners={partners}
                administrators={administrators}
                bonusPercentage={bonusPercentage}
                documents={documents}
                miniGameSettings={miniGameSettings}
                feedbacks={feedbacks}
                adminTasks={adminTasks}
                onUpdateTariffs={(v) => saveSettings('tariffs', v)}
                onUpdateProducts={(v) => saveSettings('products', v)}
                onUpdateCategories={(v) => saveSettings('categories', v)}
                onUpdateDiscounts={(v) => saveSettings('discounts', v)}
                onUpdateExtensionRate={(v) => saveSettings('extensionRate', v)}
                onUpdateEvents={handleUpdateEvents}
                onUpdateBirthdayRates={(v) => saveSettings('birthdayRates', v)}
                onUpdateStaffAnimators={(v) => saveSettings('staffAnimators', v)}
                onUpdatePartners={(v) => saveSettings('partners', v)}
                onUpdateAdministrators={(v) => saveSettings('administrators', v)}
                onUpdateBonusPercentage={(v) => saveSettings('bonusPercentage', v)}
                onReopenShift={handleReopenShift}
                onUpdateDocuments={(v) => saveSettings('documents', v)}
                onUpdateMiniGames={(v) => saveSettings('miniGameSettings', v)}
                onResolveFeedback={handleResolveFeedback}
                onAddTask={handleAddTask}
                onDeleteTask={handleDeleteTask}
            />
        );
        case 'ANALYTICS':
            return (
                <AnalyticsTab 
                    days={days}
                    events={events}
                    clients={clients}
                    products={products}
                    categories={categories}
                    tariffs={tariffs}
                    customTrackers={customTrackers}
                    onUpdateCustomTrackers={(v) => saveSettings('customTrackers', v)}
                />
            );
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans">
      {/* Sidebar Navigation */}
      <aside className="w-20 lg:w-64 bg-white border-r border-gray-200 flex flex-col justify-between transition-all duration-300">
        <div>
            <div className="h-20 flex items-center justify-center lg:justify-start lg:px-6 border-b border-gray-100">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
                    CRM
                </div>
                <span className="ml-3 font-bold text-xl text-gray-800 hidden lg:block">PlayRoom</span>
            </div>
            
            <nav className="mt-6 px-2 space-y-2">
                <NavButton active={activeTab === 'SESSIONS'} onClick={() => setActiveTab('SESSIONS')} icon={<LayoutDashboard size={22}/>} label="Игровая" />
                <NavButton active={activeTab === 'EVENTS'} onClick={() => setActiveTab('EVENTS')} icon={<CalendarDays size={22}/>} label="Праздники" />
                <NavButton active={activeTab === 'FINANCE'} onClick={() => setActiveTab('FINANCE')} icon={<BadgeDollarSign size={22}/>} label="Касса" />
                <NavButton active={activeTab === 'GOODS'} onClick={() => setActiveTab('GOODS')} icon={<Coffee size={22}/>} label="Товары" />
                <NavButton active={activeTab === 'CLIENTS'} onClick={() => setActiveTab('CLIENTS')} icon={<Users size={22}/>} label="Клиенты" />
                <NavButton active={activeTab === 'ADMIN'} onClick={() => setActiveTab('ADMIN')} icon={<ShieldCheck size={22}/>} label="Админ" />
                <NavButton active={activeTab === 'ANALYTICS'} onClick={() => setActiveTab('ANALYTICS')} icon={<BarChart3 size={22}/>} label="Аналитика" />
                <div className="pt-4 mt-4 border-t border-gray-100">
                   <NavButton active={activeTab === 'OWNER'} onClick={() => setActiveTab('OWNER')} icon={<UserCog size={22}/>} label="Владелец" />
                </div>
            </nav>
        </div>
        
        <div className="p-4 border-t border-gray-100">
             {currentDayId && !days[currentDayId]?.isClosed ? (
                 <div className="hidden lg:block bg-green-50 p-3 rounded-xl border border-green-100">
                     <p className="text-xs text-green-600 font-bold uppercase tracking-wider mb-1">Смена открыта</p>
                     <p className="text-sm font-bold text-gray-800">{days[currentDayId].adminName}</p>
                 </div>
             ) : (
                 <div className="hidden lg:block bg-red-50 p-3 rounded-xl border border-red-100">
                     <p className="text-xs text-red-600 font-bold uppercase tracking-wider mb-1">Смена закрыта</p>
                     <p className="text-xs text-gray-500">Откройте смену в разделе "Касса"</p>
                 </div>
             )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {renderContent()}
      </main>
    </div>
  );
};

const NavButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
    <button 
        onClick={onClick}
        className={`w-full flex items-center justify-center lg:justify-start gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative ${active ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-blue-50 hover:text-blue-600'}`}
    >
        <span className={`transition-transform duration-200 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>{icon}</span>
        <span className="font-medium hidden lg:block">{label}</span>
        {/* Tooltip for mobile */}
        <span className="lg:hidden absolute left-14 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap pointer-events-none">
            {label}
        </span>
    </button>
);

export default App;