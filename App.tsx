import React, { useState, useEffect } from 'react';
import { DayData, Tariff, Product, Session, Transaction, TransactionType, CalendarEvent, PaymentMethod, Discount, BirthdayRateSettings, StaffAnimator, Category, Partner, Administrator, Client, ScheduleShift, ImportantDocument, MiniGameSettings, Feedback, FeedbackType, CustomTracker, AdminTask, SubscriptionPlan, ClientSubscription } from './types';
import { DEFAULT_TARIFFS, DEFAULT_PRODUCTS, DEFAULT_DISCOUNTS, DEFAULT_EXTENSION_RATE, DEFAULT_BIRTHDAY_RATES, DEFAULT_STAFF_ANIMATORS, DEFAULT_CATEGORIES, DEFAULT_PARTNERS, DEFAULT_ADMINISTRATORS, DEFAULT_BONUS_PERCENTAGE, DEFAULT_MINI_GAME_SETTINGS, DEFAULT_STAFF_PASSWORD, DEFAULT_SUBSCRIPTION_PLANS } from './constants';
import SessionsTab from './components/SessionsTab';
import EventsTab from './components/EventsTab';
import FinanceTab from './components/FinanceTab';
import GoodsTab from './components/GoodsTab';
import OwnerTab from './components/OwnerTab';
import ClientsTab from './components/ClientsTab';
import AdminTab from './components/AdminTab';
import AnalyticsTab from './components/AnalyticsTab';
import { LayoutDashboard, CalendarDays, BadgeDollarSign, Coffee, UserCog, LogOut, Users, ShieldCheck, BarChart3, Loader2, AlertTriangle } from 'lucide-react';

// Firebase Imports
import { auth, db } from './firebase';
import { collection, doc, onSnapshot, setDoc, updateDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';

type Tab = 'SESSIONS' | 'EVENTS' | 'FINANCE' | 'GOODS' | 'OWNER' | 'CLIENTS' | 'ADMIN' | 'ANALYTICS';

type SettingsConfig = {
  tariffs: Tariff[];
  products: Product[];
  categories: Category[];
  discounts: Discount[];
  extensionRate: number;
  birthdayRates: BirthdayRateSettings;
  staffAnimators: StaffAnimator[];
  partners: Partner[];
  administrators: Administrator[];
  documents: ImportantDocument[];
  miniGameSettings: MiniGameSettings;
  customTrackers: CustomTracker[];
  bonusPercentage: number;
  staffPassword: string;
  subscriptionPlans: SubscriptionPlan[];
};

const App: React.FC = () => {
  const requireFirebaseAuth = import.meta.env.VITE_REQUIRE_FIREBASE_AUTH === 'true';

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
  const [staffPassword, setStaffPassword] = useState<string>(DEFAULT_STAFF_PASSWORD);
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>(DEFAULT_SUBSCRIPTION_PLANS);
  const [settingsMissing, setSettingsMissing] = useState(false);
  const [isRestoringSettings, setIsRestoringSettings] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authReady, setAuthReady] = useState(!requireFirebaseAuth);
  
  const [activeTab, setActiveTab] = useState<Tab>('SESSIONS');

  // Helper to get local date string YYYY-MM-DD
  const getLocalDayString = () => {
      const d = new Date();
      const offset = d.getTimezoneOffset() * 60000;
      const localISOTime = (new Date(d.getTime() - offset)).toISOString().slice(0, 10);
      return localISOTime;
  };

  const toEndOfDayIsoAfterDays = (validityDays: number) => {
      const now = new Date();
      const target = new Date(now);
      target.setDate(target.getDate() + Math.max(0, Math.floor(validityDays)));
      target.setHours(23, 59, 59, 999);
      return target.toISOString();
  };

  const getSubscriptionComputedStatus = (subscription: ClientSubscription, nowIso = new Date().toISOString()): ClientSubscription['status'] => {
      if (subscription.status === 'CANCELLED') return 'CANCELLED';
      if ((subscription.remainingMinutes || 0) <= 0) return 'USED_UP';
      if (subscription.expiresAt && subscription.expiresAt < nowIso) return 'EXPIRED';
      return 'ACTIVE';
  };

  const getClientActiveSubscriptions = (client?: Client | null) => {
      if (!client?.subscriptions) return [] as ClientSubscription[];
      const nowIso = new Date().toISOString();
      return client.subscriptions
          .map(sub => ({ ...sub, status: getSubscriptionComputedStatus(sub, nowIso) }))
          .filter(sub => sub.status === 'ACTIVE' && (sub.remainingMinutes || 0) > 0)
          .sort((a, b) => a.expiresAt.localeCompare(b.expiresAt));
  };

  const buildDefaultSettings = (): SettingsConfig => ({
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
    bonusPercentage: DEFAULT_BONUS_PERCENTAGE,
    staffPassword: DEFAULT_STAFF_PASSWORD,
    subscriptionPlans: DEFAULT_SUBSCRIPTION_PLANS
  });

  const applySettings = (data: Partial<SettingsConfig>) => {
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
    setStaffPassword(data.staffPassword || DEFAULT_STAFF_PASSWORD);
    setSubscriptionPlans(data.subscriptionPlans || DEFAULT_SUBSCRIPTION_PLANS);
  };

  const logAudit = async (action: string, details: Record<string, unknown>) => {
    try {
      await addDoc(collection(db, 'auditLogs'), {
        action,
        details,
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      console.warn('Audit log failed', error);
    }
  };

  const restoreSettingsConfig = async (settings: SettingsConfig, source: 'default' | 'import') => {
    setIsRestoringSettings(true);
    try {
      await setDoc(doc(db, 'settings', 'config'), settings);
      await logAudit('settings_restore', { source });
      setSettingsMissing(false);
    } finally {
      setIsRestoringSettings(false);
    }
  };

  useEffect(() => {
    if (requireFirebaseAuth) {
      return;
    }
    try {
      const savedAuth = localStorage.getItem('playroom_staff_auth');
      if (savedAuth === 'true') {
          setIsAuthorized(true);
      }
    } catch (error) {
      console.warn('LocalStorage is not available', error);
    }
  }, [requireFirebaseAuth]);

  useEffect(() => {
    if (!requireFirebaseAuth) {
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthorized(!!user);
      setAuthReady(true);
    });

    return unsubscribe;
  }, [requireFirebaseAuth]);

  // --- FIREBASE SUBSCRIPTIONS ---
  useEffect(() => {
    if (requireFirebaseAuth && !isAuthorized) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // 1. Subscribe to Days
    const handleSnapshotError = (error: Error) => {
        console.error('Firestore subscription error', error);
        setDbError(error.message || 'Firestore error');
        setLoading(false);
    };

    const unsubDays = onSnapshot(collection(db, 'days'), (snapshot) => {
        setDbError(null);
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
    }, handleSnapshotError);

    // 2. Subscribe to Clients
    const unsubClients = onSnapshot(collection(db, 'clients'), (snapshot) => {
        setClients(snapshot.docs.map(d => d.data() as Client));
    }, handleSnapshotError);

    // 3. Subscribe to Events
    const unsubEvents = onSnapshot(collection(db, 'events'), (snapshot) => {
        setEvents(snapshot.docs.map(d => d.data() as CalendarEvent));
    }, handleSnapshotError);

    // 4. Subscribe to Feedback & Tasks & Schedule
    const unsubFeedback = onSnapshot(collection(db, 'feedbacks'), (snapshot) => {
        setFeedbacks(snapshot.docs.map(d => d.data() as Feedback));
    }, handleSnapshotError);
    const unsubTasks = onSnapshot(collection(db, 'adminTasks'), (snapshot) => {
        setAdminTasks(snapshot.docs.map(d => d.data() as AdminTask));
    }, handleSnapshotError);
    const unsubSchedule = onSnapshot(collection(db, 'schedule'), (snapshot) => {
        setSchedule(snapshot.docs.map(d => d.data() as ScheduleShift));
    }, handleSnapshotError);

    // 5. Subscribe to Settings (Single Doc)
    const unsubSettings = onSnapshot(doc(db, 'settings', 'config'), (docSnap) => {
        setDbError(null);
        if (docSnap.exists()) {
            applySettings(docSnap.data() as Partial<SettingsConfig>);
            setSettingsMissing(false);
        } else {
            setSettingsMissing(true);
        }
        setLoading(false);
    }, handleSnapshotError);

    return () => {
        unsubDays();
        unsubClients();
        unsubEvents();
        unsubFeedback();
        unsubTasks();
        unsubSchedule();
        unsubSettings();
    };
  }, [isAuthorized, requireFirebaseAuth]);

  // --- DB Helper Wrappers ---
  const saveSettings = async (field: string, value: any) => {
      if (settingsMissing) {
          throw new Error('settings/config is missing');
      }
      await updateDoc(doc(db, 'settings', 'config'), { [field]: value });
      await logAudit('settings_update', { field });
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
            isAddedToContacts: false,
            subscriptions: []
        };
        await setDoc(doc(db, 'clients', newClient.id), newClient);
    }
  };

  const handleUpdateClients = async (newClients: Client[]) => {
      await Promise.all(
          newClients.map(c => {
              const sanitized = JSON.parse(JSON.stringify(c)) as Client;
              return setDoc(doc(db, 'clients', c.id), sanitized);
          })
      );
  };

  const handleDeleteClient = async (clientId: string) => {
      await deleteDoc(doc(db, 'clients', clientId));
  };

  const updateClientSubscriptions = async (
      clientId: string,
      updater: (client: Client) => { nextClient: Client; audit?: { action: string; details: Record<string, unknown> } }
  ) => {
      const client = clients.find(c => c.id === clientId);
      if (!client) throw new Error('Client not found');

      const { nextClient, audit } = updater(client);
      const sanitized = JSON.parse(JSON.stringify(nextClient)) as Client;
      await setDoc(doc(db, 'clients', clientId), sanitized);
      if (audit) {
          await logAudit(audit.action, { clientId, ...audit.details });
      }
  };

  const handleIssueBonusCard = async (clientId: string, initialBonus: number = 0) => {
      const normalizedInitialBonus = Math.max(0, Math.floor(Number(initialBonus) || 0));
      await updateDoc(doc(db, 'clients', clientId), {
          bonusCardNumber: Math.floor(100000 + Math.random() * 900000).toString(),
          bonusBalance: normalizedInitialBonus
      });
      await logAudit('client_bonus_card_issued', { clientId, initialBonus: normalizedInitialBonus });
  };

  const handleAddClientBonusesManual = async (clientId: string, amount: number) => {
      const normalizedAmount = Math.max(0, Math.floor(Number(amount) || 0));
      if (!normalizedAmount) return;

      const client = clients.find(c => c.id === clientId);
      if (!client) return;

      const current = client.bonusBalance || 0;
      const next = current + normalizedAmount;

      await updateDoc(doc(db, 'clients', clientId), {
          bonusBalance: next
      });
      await logAudit('client_bonus_manual_add', {
          clientId,
          added: normalizedAmount,
          previousBalance: current,
          newBalance: next
      });
  };

  const handleSellClientSubscription = async (
      clientId: string,
      planId: string,
      method: PaymentMethod,
      note?: string
  ) => {
      const plan = subscriptionPlans.find(p => p.id === planId && p.isActive);
      if (!plan) throw new Error('Subscription plan not found');
      if (!currentDayId || !days[currentDayId] || days[currentDayId].isClosed) {
          throw new Error('Open shift is required to sell subscription');
      }

      const day = days[currentDayId];
      const client = clients.find(c => c.id === clientId);
      if (!client) throw new Error('Client not found');

      const purchasedAt = new Date().toISOString();
      const newSubscription: ClientSubscription = {
          id: `sub_${Date.now()}`,
          planId: plan.id,
          planName: plan.name,
          totalMinutes: plan.totalMinutes,
          remainingMinutes: plan.totalMinutes,
          purchasedAt,
          expiresAt: toEndOfDayIsoAfterDays(plan.validityDays),
          status: 'ACTIVE',
          pricePaid: plan.price,
          paymentMethod: method,
          notes: note?.trim() || null
      };

      const updatedClient: Client = {
          ...client,
          subscriptions: [...(client.subscriptions || []), newSubscription]
      };

      const tx: Transaction = {
          id: `tx_sub_${Date.now()}`,
          timestamp: Date.now(),
          amount: plan.price,
          type: TransactionType.SALE,
          paymentMethod: method,
          description: `Абонемент: ${plan.name} -> ${client.name}`,
          relatedSessionId: null,
          relatedEventId: null
      };

      const sanitizedClient = JSON.parse(JSON.stringify(updatedClient)) as Client;
      await Promise.all([
          setDoc(doc(db, 'clients', clientId), sanitizedClient),
          updateDoc(doc(db, 'days', currentDayId), {
              transactions: [...(day.transactions || []), tx]
          })
      ]);

      await logAudit('client_subscription_sold', {
          clientId,
          subscriptionId: newSubscription.id,
          planId: plan.id,
          planName: plan.name,
          totalMinutes: plan.totalMinutes,
          price: plan.price,
          paymentMethod: method,
          dayId: currentDayId,
          note: note?.trim() || null
      });
  };

  const handleAdjustClientSubscriptionMinutes = async (
      clientId: string,
      subscriptionId: string,
      deltaMinutes: number,
      reason: string
  ) => {
      const normalizedDelta = Math.trunc(deltaMinutes);
      if (!normalizedDelta) throw new Error('Delta minutes is zero');
      const normalizedReason = reason.trim();
      if (!normalizedReason) throw new Error('Reason is required');

      await updateClientSubscriptions(clientId, (client) => {
          const subscriptions = [...(client.subscriptions || [])];
          const index = subscriptions.findIndex(s => s.id === subscriptionId);
          if (index < 0) throw new Error('Subscription not found');

          const currentSub = subscriptions[index];
          const nextRemaining = Math.max(0, (currentSub.remainingMinutes || 0) + normalizedDelta);
          const updatedSub: ClientSubscription = {
              ...currentSub,
              remainingMinutes: nextRemaining,
          };
          updatedSub.status = getSubscriptionComputedStatus(updatedSub);
          subscriptions[index] = updatedSub;

          return {
              nextClient: { ...client, subscriptions },
              audit: {
                  action: 'client_subscription_minutes_adjusted',
                  details: {
                      subscriptionId,
                      planName: currentSub.planName,
                      deltaMinutes: normalizedDelta,
                      reason: normalizedReason,
                      previousRemainingMinutes: currentSub.remainingMinutes || 0,
                      newRemainingMinutes: nextRemaining
                  }
              }
          };
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
      
      const transactions = (day.transactions || []).filter(t => !t.isDeleted);
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
      await logAudit('day_deleted', { date });
      if (currentDayId === date) setCurrentDayId(null);
  };

  // SESSIONS
  const handleAddSession = async (sessionData: any) => {
      if (!currentDayId) return;
      const day = days[currentDayId];
      
      const { price, paymentMethod, useBonuses = 0, accruedBonuses = 0, parentPhone, subscriptionUsage } = sessionData;
      const isSubscriptionPayment = !!subscriptionUsage;
      const safeBonusesUsed = isSubscriptionPayment ? 0 : useBonuses;
      const safeAccruedBonuses = isSubscriptionPayment ? 0 : accruedBonuses;
      const subscriptionClient = isSubscriptionPayment && parentPhone ? clients.find(c => c.phone === parentPhone) : null;
      const targetSubscription = isSubscriptionPayment && subscriptionClient && subscriptionUsage
          ? (subscriptionClient.subscriptions || []).find(s => s.id === subscriptionUsage.subscriptionId)
          : null;

      if (isSubscriptionPayment) {
          if (!subscriptionClient || !targetSubscription) {
              alert('Не удалось списать абонементные минуты. Проверьте клиента и повторите попытку.');
              return;
          }
          const computedStatus = getSubscriptionComputedStatus(targetSubscription);
          if (computedStatus !== 'ACTIVE' || (targetSubscription.remainingMinutes || 0) < (subscriptionUsage.minutesUsed || 0)) {
              alert('Абонемент недоступен или недостаточно минут.');
              return;
          }
      }

      const newSession: Session = {
          id: Date.now().toString(),
          startTime: Date.now(),
          endTime: sessionData.duration > 0 ? Date.now() + sessionData.duration * 60000 : null,
          isActive: true,
          extraItems: [],
          paidWithBonuses: safeBonusesUsed,
          accruedBonuses: safeAccruedBonuses,
          discountReason: sessionData.discountReason || null, // Sanitize undefined
          parentPhone: sessionData.parentPhone || null, // Sanitize undefined
          subscriptionUsage: subscriptionUsage || null,
          ...sessionData
      };

      const actualMoneyPaid = isSubscriptionPayment ? 0 : (price - safeBonusesUsed);
      let newTransaction: Transaction | null = null;
      
      if (actualMoneyPaid > 0) {
          newTransaction = {
            id: `tx_${Date.now()}`,
            timestamp: Date.now(),
            amount: actualMoneyPaid,
            type: TransactionType.SALE,
            paymentMethod: paymentMethod,
            description: `Сессия: ${sessionData.childName} (${sessionData.tariffName}) ${safeBonusesUsed > 0 ? `[Бонусы: ${safeBonusesUsed}]` : ''}`,
            relatedSessionId: newSession.id
          };
      }

      const updatedSessions = [...day.sessions, newSession];
      const updatedTransactions = newTransaction ? [...day.transactions, newTransaction] : day.transactions;

      const writes: Promise<unknown>[] = [
          updateDoc(doc(db, 'days', currentDayId), {
              sessions: updatedSessions,
              transactions: updatedTransactions
          })
      ];

      if (isSubscriptionPayment && subscriptionUsage && subscriptionClient && targetSubscription) {
          const subscriptions = [...(subscriptionClient.subscriptions || [])];
          const index = subscriptions.findIndex(s => s.id === subscriptionUsage.subscriptionId);
          const nextRemaining = Math.max(0, (targetSubscription.remainingMinutes || 0) - (subscriptionUsage.minutesUsed || 0));
          const updatedSub: ClientSubscription = {
              ...targetSubscription,
              remainingMinutes: nextRemaining,
          };
          updatedSub.status = getSubscriptionComputedStatus(updatedSub);
          subscriptions[index] = updatedSub;
          const updatedClient: Client = { ...subscriptionClient, subscriptions };
          const sanitizedClient = JSON.parse(JSON.stringify(updatedClient)) as Client;
          writes.push(setDoc(doc(db, 'clients', subscriptionClient.id), sanitizedClient));
          writes.push(logAudit('client_subscription_minutes_used', {
              clientId: subscriptionClient.id,
              dayId: currentDayId,
              sessionId: newSession.id,
              subscriptionId: targetSubscription.id,
              planName: targetSubscription.planName,
              minutesUsed: subscriptionUsage.minutesUsed,
              previousRemainingMinutes: targetSubscription.remainingMinutes || 0,
              newRemainingMinutes: nextRemaining
          }));
      }

      await Promise.all(writes);

      if (parentPhone) {
          updateClientBonuses(parentPhone, safeBonusesUsed, safeAccruedBonuses);
      }
  };

  const handleCloseSession = async (sessionId: string) => {
      if (!currentDayId) return;
      const day = days[currentDayId];
      const updatedSessions = day.sessions.map(s => s.id === sessionId ? { ...s, isActive: false } : s);
      await updateDoc(doc(db, 'days', currentDayId), { sessions: updatedSessions });
  };

  const handleReverseSessionSubscriptionUsage = async (dayId: string, sessionId: string, reason: string) => {
      const day = days[dayId];
      if (!day) {
          throw new Error('Day not found');
      }
      const session = day.sessions.find(s => s.id === sessionId);
      if (!session?.subscriptionUsage) {
          throw new Error('Subscription usage not found in session');
      }
      if (session.subscriptionUsage.isReversed) {
          throw new Error('Subscription usage already reversed');
      }
      if (!session.parentPhone) {
          throw new Error('Session client phone is missing');
      }

      const client = clients.find(c => c.phone === session.parentPhone);
      if (!client) {
          throw new Error('Client not found');
      }

      const subscriptions = [...(client.subscriptions || [])];
      const subIndex = subscriptions.findIndex(s => s.id === session.subscriptionUsage!.subscriptionId);
      if (subIndex < 0) {
          throw new Error('Client subscription not found');
      }

      const targetSub = subscriptions[subIndex];
      const previousRemaining = targetSub.remainingMinutes || 0;
      const nextRemaining = previousRemaining + (session.subscriptionUsage.minutesUsed || 0);
      const updatedSub: ClientSubscription = {
          ...targetSub,
          remainingMinutes: nextRemaining
      };
      updatedSub.status = getSubscriptionComputedStatus(updatedSub);
      subscriptions[subIndex] = updatedSub;

      const updatedSessions = day.sessions.map(s => {
          if (s.id !== sessionId || !s.subscriptionUsage) return s;
          return {
              ...s,
              subscriptionUsage: {
                  ...s.subscriptionUsage,
                  isReversed: true,
                  reversedAt: new Date().toISOString(),
                  reversalReason: reason
              }
          };
      });

      const updatedClient: Client = { ...client, subscriptions };
      const sanitizedClient = JSON.parse(JSON.stringify(updatedClient)) as Client;

      await Promise.all([
          updateDoc(doc(db, 'days', dayId), { sessions: updatedSessions }),
          setDoc(doc(db, 'clients', client.id), sanitizedClient),
      ]);

      await logAudit('client_subscription_minutes_reversed', {
          dayId,
          sessionId,
          clientId: client.id,
          subscriptionId: targetSub.id,
          planName: targetSub.planName,
          minutesRestored: session.subscriptionUsage.minutesUsed,
          previousRemainingMinutes: previousRemaining,
          newRemainingMinutes: nextRemaining,
          reason
      });
  };

  const handleAddExtraItem = async (sessionId: string, product: Product, method: PaymentMethod) => {
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
         paymentMethod: method,
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

  const handleSoftDeleteTransaction = async (dayId: string, transactionId: string, reason: string) => {
      const day = days[dayId];
      if (!day) return;

      const existingTx = (day.transactions || []).find(t => t.id === transactionId);
      if (!existingTx || existingTx.isDeleted) return;

      const updatedTransactions = (day.transactions || []).map(t => {
          if (t.id !== transactionId) return t;
          return {
              ...t,
              isDeleted: true,
              deletedAt: new Date().toISOString(),
              deletedBy: day.adminName || 'Unknown',
              deletionReason: reason
          };
      });

      await updateDoc(doc(db, 'days', dayId), { transactions: updatedTransactions });
      await logAudit('transaction_soft_deleted', {
          dayId,
          transactionId,
          reason,
          amount: existingTx.amount,
          type: existingTx.type,
          paymentMethod: existingTx.paymentMethod,
          description: existingTx.description,
          relatedSessionId: existingTx.relatedSessionId || null,
          relatedEventId: existingTx.relatedEventId || null
      });
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

  const handleUpdateStaffPassword = async (newPassword: string) => {
      await saveSettings('staffPassword', newPassword);
      setStaffPassword(newPassword);
      await logAudit('staff_password_updated', {});
  };

  const handleInitializeDefaultSettings = async () => {
      await restoreSettingsConfig(buildDefaultSettings(), 'default');
  };

  const handleImportSettings = async (file: File) => {
      const raw = await file.text();
      const parsed = JSON.parse(raw) as Partial<SettingsConfig>;
      const merged: SettingsConfig = {
          ...buildDefaultSettings(),
          ...parsed
      };
      await restoreSettingsConfig(merged, 'import');
  };

  const downloadJsonFile = (filename: string, payload: unknown) => {
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
  };

  const buildSettingsPayload = (): SettingsConfig => ({
      tariffs,
      products,
      categories,
      discounts,
      extensionRate,
      birthdayRates,
      staffAnimators,
      partners,
      administrators,
      documents,
      miniGameSettings,
      customTrackers,
      bonusPercentage,
      staffPassword,
      subscriptionPlans
  });

  const handleExportSettings = () => {
      downloadJsonFile(
          `settings-config-backup-${new Date().toISOString().slice(0, 10)}.json`,
          buildSettingsPayload()
      );
      logAudit('settings_exported', {});
  };

  const handleExportClients = () => {
      downloadJsonFile(
          `clients-backup-${new Date().toISOString().slice(0, 10)}.json`,
          {
              exportedAt: new Date().toISOString(),
              totalClients: clients.length,
              clients
          }
      );
      logAudit('clients_exported', { totalClients: clients.length });
  };

  const handleExportFullBackup = () => {
      downloadJsonFile(
          `full-backup-settings-clients-${new Date().toISOString().slice(0, 10)}.json`,
          {
              exportedAt: new Date().toISOString(),
              settings: buildSettingsPayload(),
              totalClients: clients.length,
              clients
          }
      );
      logAudit('full_backup_exported', { totalClients: clients.length });
  };

  const handleAuthSubmit = (password: string) => {
      if (requireFirebaseAuth) {
          return;
      }
      if (!password) {
          setAuthError('Введите пароль');
          return;
      }

      if (password === staffPassword) {
          setIsAuthorized(true);
          setAuthError('');
          try {
              localStorage.setItem('playroom_staff_auth', 'true');
          } catch (error) {
              console.warn('Unable to save auth flag', error);
          }
      } else {
          setAuthError('Неверный пароль');
      }
  };

  const handleFirebaseAuthSubmit = async (email: string, password: string) => {
      if (!email || !password) {
          setAuthError('Введите email и пароль');
          return;
      }
      try {
          setDbError(null);
          await signInWithEmailAndPassword(auth, email.trim(), password);
          setAuthError('');
      } catch (error) {
          setAuthError('Неверный email или пароль');
      }
  };

  const handleLogout = async () => {
      if (requireFirebaseAuth) {
          await signOut(auth);
          setDbError(null);
          return;
      }
      setIsAuthorized(false);
      try {
          localStorage.removeItem('playroom_staff_auth');
      } catch (error) {
          console.warn('Unable to clear auth flag', error);
      }
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

  if (!authReady) {
      return (
          <div className="h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-500">
              <Loader2 size={48} className="animate-spin mb-4 text-blue-600"/>
              <p>Проверка авторизации...</p>
          </div>
      );
  }

  if (dbError) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-red-50 p-4">
              <div className="bg-white max-w-xl w-full rounded-2xl shadow-xl p-8 border border-red-100">
                  <h1 className="text-xl font-bold text-red-700 mb-3">Ошибка доступа к Firestore</h1>
                  <p className="text-gray-700 mb-2">Проверьте Firestore Rules и Firebase Authentication.</p>
                  <p className="text-sm text-red-600 font-mono break-all">{dbError}</p>
              </div>
          </div>
      );
  }

  if (!isAuthorized) {
      if (requireFirebaseAuth) {
          return <FirebaseLoginScreen onSubmit={handleFirebaseAuthSubmit} error={authError} />;
      }
      return <LoginScreen onSubmit={handleAuthSubmit} error={authError} />;
  }

  if (settingsMissing) {
      return (
          <SettingsRecoveryScreen
              isRestoring={isRestoringSettings}
              onInitializeDefaults={handleInitializeDefaultSettings}
              onImportSettings={handleImportSettings}
          />
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
            subscriptionPlans={subscriptionPlans}
            bonusPercentage={bonusPercentage}
            onAddSession={handleAddSession}
            onAddExtraItem={handleAddExtraItem}
            onExtendSession={handleExtendSession}
            onCloseSession={handleCloseSession}
            onReverseSubscriptionUsage={(sessionId, reason) => {
              if (!currentDayId) {
                return Promise.reject(new Error('Нет открытой смены'));
              }
              return handleReverseSessionSubscriptionUsage(currentDayId, sessionId, reason);
            }}
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
                onSoftDeleteTransaction={handleSoftDeleteTransaction}
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
                subscriptionPlans={subscriptionPlans}
                days={days}
                isShiftOpen={!!(currentDayId && days[currentDayId] && !days[currentDayId].isClosed)}
                onUpdateClients={handleUpdateClients}
                onDeleteClient={handleDeleteClient}
                onIssueCard={handleIssueBonusCard}
                onAddBonusesManual={handleAddClientBonusesManual}
                onSellSubscription={handleSellClientSubscription}
                onAdjustSubscriptionMinutes={handleAdjustClientSubscriptionMinutes}
                onReverseSubscriptionUsageByDay={handleReverseSessionSubscriptionUsage}
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
                subscriptionPlans={subscriptionPlans}
                documents={documents}
                miniGameSettings={miniGameSettings}
                feedbacks={feedbacks}
                adminTasks={adminTasks}
                staffPassword={staffPassword}
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
                onUpdateSubscriptionPlans={(v) => saveSettings('subscriptionPlans', v)}
                onReopenShift={handleReopenShift}
                onUpdateDocuments={(v) => saveSettings('documents', v)}
                onUpdateMiniGames={(v) => saveSettings('miniGameSettings', v)}
                onResolveFeedback={handleResolveFeedback}
                onAddTask={handleAddTask}
                onDeleteTask={handleDeleteTask}
                onUpdateStaffPassword={handleUpdateStaffPassword}
                onExportSettings={handleExportSettings}
                onExportClients={handleExportClients}
                onExportFullBackup={handleExportFullBackup}
                onImportSettings={handleImportSettings}
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
             <button 
                onClick={handleLogout}
                className="mt-4 w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 rounded-lg transition-colors"
             >
                <LogOut size={16}/> Выйти
             </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {renderContent()}
      </main>
    </div>
  );
};

const LoginScreen: React.FC<{ onSubmit: (password: string) => void; error: string }> = ({ onSubmit, error }) => {
    const [value, setValue] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(value.trim());
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 p-4">
            <div className="bg-white max-w-md w-full rounded-2xl shadow-xl p-8 border border-blue-100">
                <div className="text-center mb-6">
                    <div className="text-2xl font-bold text-gray-900">PlayRoom CRM</div>
                    <p className="text-sm text-gray-500 mt-2">Введите общий пароль для сотрудников</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Пароль</label>
                        <input 
                            type="password"
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-400 outline-none text-gray-900"
                            placeholder="Введите пароль"
                        />
                    </div>
                    {error && <p className="text-sm text-red-600">{error}</p>}
                    <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-md transition-colors">
                        Войти
                    </button>
                </form>
                <p className="text-xs text-gray-400 mt-4 text-center">Пароль можно изменить в кабинете владельца</p>
            </div>
        </div>
    );
};

const FirebaseLoginScreen: React.FC<{ onSubmit: (email: string, password: string) => void; error: string }> = ({ onSubmit, error }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(email, password);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 p-4">
            <div className="bg-white max-w-md w-full rounded-2xl shadow-xl p-8 border border-blue-100">
                <div className="text-center mb-6">
                    <div className="text-2xl font-bold text-gray-900">PlayRoom CRM</div>
                    <p className="text-sm text-gray-500 mt-2">Вход через Firebase Authentication</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-400 outline-none text-gray-900"
                            placeholder="you@company.com"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Пароль</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-400 outline-none text-gray-900"
                            placeholder="Введите пароль"
                        />
                    </div>
                    {error && <p className="text-sm text-red-600">{error}</p>}
                    <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-md transition-colors">
                        Войти
                    </button>
                </form>
            </div>
        </div>
    );
};

const SettingsRecoveryScreen: React.FC<{
    isRestoring: boolean;
    onInitializeDefaults: () => Promise<void>;
    onImportSettings: (file: File) => Promise<void>;
}> = ({ isRestoring, onInitializeDefaults, onImportSettings }) => {
    const [importError, setImportError] = useState('');

    const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setImportError('');
        try {
            await onImportSettings(file);
        } catch (error) {
            setImportError('Не удалось импортировать файл. Проверьте JSON и попробуйте снова.');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-red-50 p-4">
            <div className="bg-white max-w-2xl w-full rounded-2xl shadow-xl p-8 border border-red-100">
                <div className="flex items-center gap-3 mb-4 text-red-700">
                    <AlertTriangle size={28} />
                    <h1 className="text-xl font-bold">Отсутствует settings/config</h1>
                </div>
                <p className="text-gray-700 mb-6">
                    Конфигурация CRM не найдена. Автоматический сброс отключен. Восстановите настройки из бэкапа или выполните явную инициализацию.
                </p>
                <div className="space-y-3">
                    <label className="block">
                        <span className="text-sm font-medium text-gray-700">Импорт JSON-бэкапа</span>
                        <input
                            type="file"
                            accept="application/json,.json"
                            onChange={handleImport}
                            disabled={isRestoring}
                            className="mt-2 block w-full text-sm text-gray-700 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-blue-700"
                        />
                    </label>
                    <button
                        onClick={onInitializeDefaults}
                        disabled={isRestoring}
                        className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg disabled:opacity-60"
                    >
                        Инициализировать дефолтные настройки
                    </button>
                    {importError && <p className="text-sm text-red-600">{importError}</p>}
                    {isRestoring && <p className="text-sm text-gray-500">Восстановление данных...</p>}
                </div>
            </div>
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
