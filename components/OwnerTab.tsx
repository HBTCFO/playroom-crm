
import React, { useState, useRef } from 'react';
import { Tariff, Product, Discount, CalendarEvent, BirthdayRateSettings, StaffAnimator, Category, Partner, Administrator, DayData, ImportantDocument, MiniGameSettings, DocumentType, Feedback, AdminTask, SubscriptionPlan } from '../types';
import { OWNER_PASSWORD } from '../constants';
import { Lock, Trash2, Plus, Save, Clock, PartyPopper, Coffee, Tag, Briefcase, Handshake, CheckCircle, XCircle, Users, History, RotateCcw, FileText, Percent, FileCheck, Sparkles, CalendarDays, Upload, FileType, Link as LinkIcon, MessageSquare, Lightbulb, MessageSquareWarning, Check, ClipboardList, Clock3 } from 'lucide-react';

interface OwnerTabProps {
  events: CalendarEvent[];
  days: Record<string, DayData>;
  tariffs: Tariff[];
  products: Product[];
  categories: Category[];
  discounts: Discount[];
  extensionRate: number;
  birthdayRates: BirthdayRateSettings;
  staffAnimators: StaffAnimator[];
  partners: Partner[];
  administrators: Administrator[];
  bonusPercentage: number;
  subscriptionPlans: SubscriptionPlan[];
  documents: ImportantDocument[];
  miniGameSettings: MiniGameSettings;
  feedbacks: Feedback[];
  adminTasks: AdminTask[];
  staffPassword: string;
  onUpdateTariffs: (tariffs: Tariff[]) => void;
  onUpdateProducts: (products: Product[]) => void;
  onUpdateCategories: (categories: Category[]) => void;
  onUpdateDiscounts: (discounts: Discount[]) => void;
  onUpdateExtensionRate: (rate: number) => void;
  onUpdateEvents: (events: CalendarEvent[]) => void;
  onUpdateBirthdayRates: (rates: BirthdayRateSettings) => void;
  onUpdateStaffAnimators: (animators: StaffAnimator[]) => void;
  onUpdatePartners: (partners: Partner[]) => void;
  onUpdateAdministrators: (admins: Administrator[]) => void;
  onUpdateBonusPercentage: (percentage: number) => void;
  onUpdateSubscriptionPlans: (plans: SubscriptionPlan[]) => void;
  onReopenShift: (date: string) => void;
  onUpdateDocuments: (docs: ImportantDocument[]) => void;
  onUpdateMiniGames: (settings: MiniGameSettings) => void;
  onResolveFeedback: (id: string) => void;
  onAddTask: (desc: string) => void;
  onDeleteTask: (id: string) => void;
  onUpdateStaffPassword: (password: string) => Promise<void>;
  onExportSettings: () => void;
  onExportClients: () => void;
  onExportFullBackup: () => void;
  onImportSettings: (file: File) => Promise<void>;
}

const OwnerTab: React.FC<OwnerTabProps> = ({ 
    events, days, tariffs, products, categories, discounts, extensionRate, birthdayRates, staffAnimators, partners, administrators, bonusPercentage, subscriptionPlans, documents, miniGameSettings, feedbacks, adminTasks, staffPassword,
    onUpdateTariffs, onUpdateProducts, onUpdateCategories, onUpdateDiscounts, onUpdateExtensionRate, onUpdateEvents, onUpdateBirthdayRates, onUpdateStaffAnimators, onUpdatePartners, onUpdateAdministrators, onUpdateBonusPercentage, onUpdateSubscriptionPlans, onReopenShift, onUpdateDocuments, onUpdateMiniGames, onResolveFeedback, onAddTask, onDeleteTask, onUpdateStaffPassword, onExportSettings, onExportClients, onExportFullBackup, onImportSettings
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [error, setError] = useState('');

  // Local state for editing
  const [localTariffs, setLocalTariffs] = useState<Tariff[]>(tariffs);
  const [localProducts, setLocalProducts] = useState<Product[]>(products);
  const [localCategories, setLocalCategories] = useState<Category[]>(categories);
  const [localDiscounts, setLocalDiscounts] = useState<Discount[]>(discounts);
  const [localExtensionRate, setLocalExtensionRate] = useState<number>(extensionRate);
  const [localBirthdayRates, setLocalBirthdayRates] = useState<BirthdayRateSettings>(birthdayRates);
  const [localStaffAnimators, setLocalStaffAnimators] = useState<StaffAnimator[]>(staffAnimators);
  const [localPartners, setLocalPartners] = useState<Partner[]>(partners);
  const [localAdministrators, setLocalAdministrators] = useState<Administrator[]>(administrators);
  const [localBonusPercentage, setLocalBonusPercentage] = useState<number>(bonusPercentage);
  const [localSubscriptionPlans, setLocalSubscriptionPlans] = useState<SubscriptionPlan[]>(subscriptionPlans);
  const [localMiniGames, setLocalMiniGames] = useState<MiniGameSettings>(miniGameSettings);

  // New Category Management State
  const [activeProductCategory, setActiveProductCategory] = useState<string>('ALL');
  const [newCategoryName, setNewCategoryName] = useState('');
  
  // New Partner Form State
  const [newPartnerName, setNewPartnerName] = useState('');
  const [newPartnerType, setNewPartnerType] = useState<Partner['type']>('ANIMATOR');
  const [newPartnerPhone, setNewPartnerPhone] = useState('');

  // New Staff Form State
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffRole, setNewStaffRole] = useState('');
  const [newStaffPrice, setNewStaffPrice] = useState('');

  // New Admin Form State
  const [newAdminName, setNewAdminName] = useState('');
  const [newSubscriptionName, setNewSubscriptionName] = useState('');
  const [newSubscriptionHours, setNewSubscriptionHours] = useState('');
  const [newSubscriptionPrice, setNewSubscriptionPrice] = useState('');
  const [newSubscriptionValidityDays, setNewSubscriptionValidityDays] = useState('30');

  // New Task Form State
  const [newTaskDesc, setNewTaskDesc] = useState('');

  // New Document Form State
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocUrl, setNewDocUrl] = useState('');
  const [newDocType, setNewDocType] = useState<DocumentType>('GOOGLE');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Memo File Input Ref
  const memoFileInputRef = useRef<HTMLInputElement>(null);

  const [newStaffPassword, setNewStaffPassword] = useState('');
  const [confirmStaffPassword, setConfirmStaffPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!OWNER_PASSWORD) {
      setError('VITE_OWNER_PASSWORD не настроен');
      return;
    }
    if (passwordInput === OWNER_PASSWORD) {
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('Неверный пароль');
    }
  };

  // --- Tariff Logic ---
  const handleTariffChange = (id: string, field: keyof Tariff, value: any) => {
    setLocalTariffs(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
  };
  const addTariff = () => {
    const newTariff: Tariff = { id: Date.now().toString(), name: 'Новый тариф', durationMinutes: 60, price: 0 };
    setLocalTariffs([...localTariffs, newTariff]);
  };
  const removeTariff = (id: string) => {
    setLocalTariffs(localTariffs.filter(t => t.id !== id));
  };
  const saveTariffs = () => {
    onUpdateTariffs(localTariffs);
    onUpdateExtensionRate(localExtensionRate);
    alert('Настройки игровой комнаты сохранены!');
  };

  // --- Category Logic ---
  const addCategory = () => {
      if (!newCategoryName.trim()) return;
      const id = newCategoryName.toUpperCase().replace(/\s+/g, '_').slice(0, 10) + '_' + Date.now();
      const newCat: Category = { id, name: newCategoryName };
      setLocalCategories([...localCategories, newCat]);
      setNewCategoryName('');
  };
  const updateCategoryName = (id: string, name: string) => {
      setLocalCategories(prev => prev.map(c => c.id === id ? { ...c, name } : c));
  };
  const removeCategory = (id: string) => {
      if (window.confirm('Вы уверены? Товары в этой категории останутся, но категория исчезнет.')) {
          setLocalCategories(localCategories.filter(c => c.id !== id));
      }
  };
  const saveCategories = () => {
      onUpdateCategories(localCategories);
      alert('Категории обновлены!');
  };

  // --- Product Logic ---
  const handleProductChange = (id: string, field: keyof Product, value: any) => {
    setLocalProducts(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };
  const addProduct = (categoryId: string) => {
    const newProduct: Product = { 
        id: Date.now().toString(), 
        name: 'Новый товар', 
        price: 0, 
        category: categoryId 
    };
    setLocalProducts([...localProducts, newProduct]);
  };
  const removeProduct = (id: string) => {
    setLocalProducts(localProducts.filter(p => p.id !== id));
  };
  const saveProducts = () => {
    onUpdateProducts(localProducts);
    alert('Каталог товаров сохранен!');
  };

  // --- Partner Logic ---
  const addPartner = () => {
      if (!newPartnerName) return;
      const newPartner: Partner = {
          id: Date.now().toString(),
          name: newPartnerName,
          type: newPartnerType,
          phone: newPartnerPhone
      };
      setLocalPartners([...localPartners, newPartner]);
      setNewPartnerName('');
      setNewPartnerPhone('');
  };
  const removePartner = (id: string) => {
      setLocalPartners(localPartners.filter(p => p.id !== id));
  };
  const savePartners = () => {
      onUpdatePartners(localPartners);
      alert('Список партнеров сохранен!');
  };

  // --- Staff Animator Logic ---
  const addStaff = () => {
      if (!newStaffName) return;
      const newStaff: StaffAnimator = {
          id: 'sa_' + Date.now(),
          name: newStaffName,
          roles: newStaffRole.split(',').map(r => r.trim()).filter(r => r),
          defaultPrice: parseFloat(newStaffPrice) || 0
      };
      setLocalStaffAnimators([...localStaffAnimators, newStaff]);
      setNewStaffName('');
      setNewStaffRole('');
      setNewStaffPrice('');
  };
  const removeStaff = (id: string) => {
      setLocalStaffAnimators(localStaffAnimators.filter(s => s.id !== id));
  };
  const updateStaff = (id: string, field: keyof StaffAnimator, value: any) => {
    setLocalStaffAnimators(prev => prev.map(s => s.id === id ? {...s, [field]: value} : s));
  };
  const saveStaff = () => {
      onUpdateStaffAnimators(localStaffAnimators);
      alert('Персонал обновлен!');
  };

  // --- Administrator Logic ---
  const addAdmin = () => {
      if (!newAdminName) return;
      const newAdmin: Administrator = {
          id: 'adm_' + Date.now(),
          name: newAdminName,
          isActive: true
      };
      setLocalAdministrators([...localAdministrators, newAdmin]);
      setNewAdminName('');
  };
  const removeAdmin = (id: string) => {
      setLocalAdministrators(localAdministrators.filter(a => a.id !== id));
  };
  const saveAdmins = () => {
      onUpdateAdministrators(localAdministrators);
      alert('Список администраторов обновлен!');
  };

  const saveSettings = () => {
      onUpdateBonusPercentage(localBonusPercentage);
      alert('Общие настройки сохранены!');
  };

  const addSubscriptionPlan = () => {
      const name = newSubscriptionName.trim();
      const hours = Number(newSubscriptionHours);
      const price = Number(newSubscriptionPrice);
      const validityDays = Number(newSubscriptionValidityDays);
      if (!name || !Number.isFinite(hours) || hours <= 0 || !Number.isFinite(price) || price < 0 || !Number.isFinite(validityDays) || validityDays < 1) {
          alert('Заполните название, часы, цену и срок действия.');
          return;
      }
      const newPlan: SubscriptionPlan = {
          id: `subplan_${Date.now()}`,
          name,
          totalMinutes: Math.round(hours * 60),
          price: Math.round(price),
          validityDays: Math.round(validityDays),
          isActive: true,
          description: null
      };
      setLocalSubscriptionPlans(prev => [...prev, newPlan]);
      setNewSubscriptionName('');
      setNewSubscriptionHours('');
      setNewSubscriptionPrice('');
      setNewSubscriptionValidityDays('30');
  };

  const updateSubscriptionPlan = (id: string, patch: Partial<SubscriptionPlan>) => {
      setLocalSubscriptionPlans(prev => prev.map(plan => plan.id === id ? { ...plan, ...patch } : plan));
  };

  const removeSubscriptionPlan = (id: string) => {
      if (!window.confirm('Удалить шаблон абонемента? Уже проданные абонементы клиентов не удалятся.')) return;
      setLocalSubscriptionPlans(prev => prev.filter(plan => plan.id !== id));
  };

  const saveSubscriptionPlans = () => {
      onUpdateSubscriptionPlans(localSubscriptionPlans);
      alert('Шаблоны абонементов сохранены!');
  };

  // --- Task Logic ---
  const handleCreateTask = () => {
      if(newTaskDesc.trim()) {
          onAddTask(newTaskDesc);
          setNewTaskDesc('');
      }
  };

  // --- Document Logic ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
        alert('Файл слишком большой (макс 5МБ)');
        return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
        const result = ev.target?.result as string;
        setNewDocUrl(result);
        setNewDocTitle(file.name);
        
        // Auto-detect type
        if (file.name.match(/\.(doc|docx)$/i)) setNewDocType('WORD');
        else if (file.name.match(/\.pdf$/i)) setNewDocType('PDF');
        else if (file.name.match(/\.(xls|xlsx|csv)$/i)) setNewDocType('OTHER'); 
        else setNewDocType('OTHER');
    };
    reader.readAsDataURL(file);
  };

  const addDocument = () => {
      if (!newDocTitle || !newDocUrl) return;
      const newDoc: ImportantDocument = {
          id: Date.now().toString(),
          title: newDocTitle,
          url: newDocUrl,
          type: newDocType
      };
      onUpdateDocuments([...documents, newDoc]);
      setNewDocTitle('');
      setNewDocUrl('');
      setNewDocType('GOOGLE');
      if (fileInputRef.current) fileInputRef.current.value = '';
  };
  const removeDocument = (id: string) => {
      onUpdateDocuments(documents.filter(d => d.id !== id));
  };

  // --- Mini Games Logic ---
  const handleMemoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
        alert('Файл слишком большой (макс 5МБ)');
        return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
        const result = ev.target?.result as string;
        setLocalMiniGames(prev => ({
            ...prev,
            memoUrl: result,
            memoName: file.name
        }));
    };
    reader.readAsDataURL(file);
  };

  const saveMiniGames = () => {
      onUpdateMiniGames(localMiniGames);
      alert('Настройки мини-игр обновлены!');
  };

  const handleStaffPasswordSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newStaffPassword || !confirmStaffPassword) {
          setPasswordMessage('Заполните оба поля');
          return;
      }
      if (newStaffPassword !== confirmStaffPassword) {
          setPasswordMessage('Пароли не совпадают');
          return;
      }

      try {
          await onUpdateStaffPassword(newStaffPassword);
          setPasswordMessage('Пароль обновлен');
          setNewStaffPassword('');
          setConfirmStaffPassword('');
      } catch (error) {
          setPasswordMessage('Не удалось обновить пароль. Попробуйте ещё раз.');
      }
  };

  const handleSettingsImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
          await onImportSettings(file);
          setBackupMessage('Настройки успешно импортированы');
      } catch (error) {
          setBackupMessage('Ошибка импорта. Проверьте JSON-файл');
      }
      e.target.value = '';
  };

  const handleSettingsExport = () => {
      onExportSettings();
      setBackupMessage('Файл настроек выгружен');
  };

  const handleClientsExport = () => {
      onExportClients();
      setBackupMessage('Файл клиентской базы выгружен (телефоны, бонусы и т.д.)');
  };

  const handleFullBackupExport = () => {
      onExportFullBackup();
      setBackupMessage('Полный бэкап (settings + clients) выгружен');
  };
  
  const handleGameActivityChange = (weekType: 'ODD' | 'EVEN', gameIndex: number, val: string) => {
      if (weekType === 'ODD') {
          const newGames = [...localMiniGames.oddWeekGames];
          newGames[gameIndex] = { ...newGames[gameIndex], activity: val };
          setLocalMiniGames({ ...localMiniGames, oddWeekGames: newGames });
      } else {
          const newGames = [...localMiniGames.evenWeekGames];
          newGames[gameIndex] = { ...newGames[gameIndex], activity: val };
          setLocalMiniGames({ ...localMiniGames, evenWeekGames: newGames });
      }
  };


  // --- Save Birthday Rates ---
  const saveBirthdayRates = () => {
      onUpdateBirthdayRates(localBirthdayRates);
      alert('Цены на праздники сохранены!');
  };

  // --- Event Cost Update (Instant) ---
  const handleEventUpdate = (eventId: string, target: 'ANIMATOR' | 'REGISTRATION', field: 'COST' | 'PAID', value: any) => {
      const updatedEvents = events.map(e => {
          if (e.id !== eventId) return e;
          
          if (target === 'ANIMATOR' && e.animator) {
              if (field === 'COST') return { ...e, animator: { ...e.animator, costToUs: value } };
              if (field === 'PAID') return { ...e, animator: { ...e.animator, isPaidToVendor: value } };
          }
          if (target === 'REGISTRATION' && e.registration) {
              if (field === 'COST') return { ...e, registration: { ...e.registration, costToUs: value } };
              if (field === 'PAID') return { ...e, registration: { ...e.registration, isPaidToVendor: value } };
          }
          return e;
      });
      onUpdateEvents(updatedEvents);
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-10">
        <div className="bg-white p-8 rounded-2xl shadow-lg max-w-sm w-full text-center border border-gray-100">
          <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="text-blue-500" />
          </div>
          <h2 className="text-xl font-bold mb-2 text-gray-900">Вход для Владельца</h2>
          <p className="text-gray-500 mb-6 text-sm">Введите пароль для доступа к настройкам</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input 
              type="password" 
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              className="w-full border border-gray-300 bg-white p-3 rounded-lg text-center tracking-widest text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="••••••••"
            />
            {error && <p className="text-red-500 text-xs">{error}</p>}
            <button type="submit" className="w-full bg-gray-900 text-white py-3 rounded-lg font-bold hover:bg-black transition-colors shadow-lg">
              Войти
            </button>
          </form>
        </div>
      </div>
    );
  }

  const externalEvents = events.filter(e => 
      (e.animator?.type === 'EXTERNAL') || (e.registration?.type === 'EXTERNAL')
  ).sort((a, b) => b.date.localeCompare(a.date));

  const sortedDays = Object.values(days).sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-12 pb-24">
      <div className="flex justify-between items-center border-b border-gray-200 pb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Панель Управления</h1>
            <p className="text-gray-500">Настройки цен, товаров и расчеты</p>
          </div>
          <button onClick={() => setIsAuthenticated(false)} className="px-4 py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg transition-colors font-medium">Выйти</button>
      </div>

      {/* Feedback Section */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <MessageSquare size={20} /> Книга Жалоб и Предложений
              </h2>
              {feedbacks.length > 0 && <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full font-bold">{feedbacks.length} активных</span>}
          </div>
          <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {feedbacks.length === 0 ? (
                      <div className="col-span-2 text-center py-8 text-gray-400 italic">
                          Нет новых сообщений от администраторов
                      </div>
                  ) : (
                      feedbacks.map(fb => (
                          <div key={fb.id} className={`rounded-xl p-4 border-2 flex flex-col gap-3 ${fb.type === 'COMPLAINT' ? 'border-red-100 bg-red-50' : 'border-blue-100 bg-blue-50'}`}>
                               <div className="flex justify-between items-start">
                                   <div className="flex items-center gap-2 font-bold text-sm uppercase">
                                       {fb.type === 'COMPLAINT' ? (
                                           <span className="text-red-700 flex items-center gap-1"><MessageSquareWarning size={16}/> Жалоба</span>
                                       ) : (
                                           <span className="text-blue-700 flex items-center gap-1"><Lightbulb size={16}/> Предложение</span>
                                       )}
                                       <span className="text-gray-400 text-xs font-normal normal-case">• {new Date(fb.date).toLocaleDateString()}</span>
                                   </div>
                               </div>
                               <p className="text-gray-800 text-sm whitespace-pre-wrap">{fb.content}</p>
                               <button 
                                  onClick={() => onResolveFeedback(fb.id)}
                                  className="self-end text-xs font-bold flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-gray-600"
                               >
                                   <Check size={14}/> Отметить как решено
                               </button>
                          </div>
                      ))
                  )}
              </div>
          </div>
      </section>

      <section className="bg-white rounded-xl shadow-sm border border-indigo-100 overflow-hidden">
          <div className="p-6 bg-indigo-50 border-b border-indigo-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-indigo-900 flex items-center gap-2">
                  <FileText size={20} /> Резервная копия настроек
              </h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <button onClick={handleSettingsExport} className="bg-indigo-600 text-white px-4 py-2 rounded font-bold hover:bg-indigo-700">
                  Экспорт settings/config
              </button>
              <button onClick={handleClientsExport} className="bg-cyan-600 text-white px-4 py-2 rounded font-bold hover:bg-cyan-700">
                  Экспорт клиентов
              </button>
              <button onClick={handleFullBackupExport} className="bg-emerald-600 text-white px-4 py-2 rounded font-bold hover:bg-emerald-700">
                  Полный бэкап
              </button>
              <label className="bg-white border border-indigo-300 text-indigo-700 px-4 py-2 rounded font-bold text-center cursor-pointer hover:bg-indigo-50">
                  Импорт settings JSON
                  <input type="file" accept="application/json,.json" className="hidden" onChange={handleSettingsImport} />
              </label>
              {backupMessage && <p className="md:col-span-2 xl:col-span-4 text-sm text-gray-600">{backupMessage}</p>}
          </div>
      </section>

      {/* Staff Access Password */}
      <section className="bg-white rounded-xl shadow-sm border border-purple-100 overflow-hidden">
          <div className="p-6 bg-purple-50 border-b border-purple-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-purple-900 flex items-center gap-2">
                  <Lock size={20} /> Доступ для сотрудников
              </h2>
          </div>
          <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">Текущий пароль: <span className="font-mono font-bold text-gray-900">{staffPassword}</span></p>
              <form onSubmit={handleStaffPasswordSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Новый пароль</label>
                      <input 
                          type="password"
                          value={newStaffPassword}
                          onChange={(e) => setNewStaffPassword(e.target.value)}
                          className="w-full border border-gray-300 p-2 rounded bg-white text-gray-900"
                          placeholder="Например: 3567"
                      />
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Повторите пароль</label>
                      <input 
                          type="password"
                          value={confirmStaffPassword}
                          onChange={(e) => setConfirmStaffPassword(e.target.value)}
                          className="w-full border border-gray-300 p-2 rounded bg-white text-gray-900"
                          placeholder="Ещё раз"
                      />
                  </div>
                  <div className="md:col-span-2 flex flex-col md:flex-row gap-3 items-start md:items-center">
                      <button type="submit" className="bg-purple-600 text-white px-4 py-2 rounded font-bold hover:bg-purple-700">Сохранить</button>
                      {passwordMessage && <span className="text-sm text-gray-600">{passwordMessage}</span>}
                  </div>
              </form>
          </div>
      </section>

      {/* Admin Tasks Section (NEW) */}
      <section className="bg-white rounded-xl shadow-sm border border-teal-100 overflow-hidden">
          <div className="p-6 bg-teal-50 border-b border-teal-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-teal-900 flex items-center gap-2">
                  <ClipboardList size={20} /> Задания для Администраторов
              </h2>
          </div>
          <div className="p-6">
              <div className="flex gap-4 items-end mb-6">
                  <div className="flex-1">
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Новое задание</label>
                      <input 
                          value={newTaskDesc}
                          onChange={e => setNewTaskDesc(e.target.value)}
                          className="w-full border border-gray-300 p-2 rounded text-sm bg-white text-gray-900"
                          placeholder="Например: Проверить наличие стаканчиков"
                      />
                  </div>
                  <button onClick={handleCreateTask} className="bg-teal-600 text-white px-4 py-2 rounded font-bold hover:bg-teal-700 h-10">Добавить</button>
              </div>

              <div className="space-y-3">
                  {adminTasks.map(task => (
                      <div key={task.id} className={`p-4 rounded-xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${task.isCompleted ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                          <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                  {task.isCompleted ? (
                                      <span className="flex items-center gap-1 text-xs font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                          <CheckCircle size={12}/> Выполнено: {task.completedBy}
                                      </span>
                                  ) : (
                                      <span className="flex items-center gap-1 text-xs font-bold bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                                          <Clock3 size={12}/> В процессе
                                      </span>
                                  )}
                                  <span className="text-xs text-gray-400">{new Date(task.createdAt).toLocaleDateString()}</span>
                              </div>
                              <p className={`font-medium ${task.isCompleted ? 'text-gray-600 line-through' : 'text-gray-900'}`}>{task.description}</p>
                              {task.isCompleted && task.completionComment && (
                                  <div className="mt-2 text-sm text-green-800 bg-green-100/50 p-2 rounded-lg border border-green-100">
                                      <span className="font-bold text-xs uppercase text-green-600 mr-2">Комментарий:</span> 
                                      {task.completionComment}
                                  </div>
                              )}
                          </div>
                          <button onClick={() => onDeleteTask(task.id)} className="text-gray-400 hover:text-red-500 p-2"><Trash2 size={18}/></button>
                      </div>
                  ))}
                  {adminTasks.length === 0 && <p className="text-gray-400 italic text-center py-4">Нет активных заданий</p>}
              </div>
          </div>
      </section>

      {/* 0. General Settings & Admin Management */}
      <section className="bg-white rounded-xl shadow-sm border border-indigo-100 overflow-hidden">
          <div className="p-6 bg-indigo-50 border-b border-indigo-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-indigo-900 flex items-center gap-2">
                  <Clock size={20} /> Абонементы (шаблоны)
              </h2>
              <button onClick={saveSubscriptionPlans} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 flex items-center gap-2">
                  <Save size={16}/> Сохранить
              </button>
          </div>
          <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <input
                      value={newSubscriptionName}
                      onChange={e => setNewSubscriptionName(e.target.value)}
                      className="border border-gray-300 rounded-lg p-2 bg-white text-gray-900"
                      placeholder="Название (например, 10 часов)"
                  />
                  <input
                      type="number"
                      min="1"
                      step="0.5"
                      value={newSubscriptionHours}
                      onChange={e => setNewSubscriptionHours(e.target.value)}
                      className="border border-gray-300 rounded-lg p-2 bg-white text-gray-900"
                      placeholder="Часы"
                  />
                  <input
                      type="number"
                      min="0"
                      value={newSubscriptionPrice}
                      onChange={e => setNewSubscriptionPrice(e.target.value)}
                      className="border border-gray-300 rounded-lg p-2 bg-white text-gray-900"
                      placeholder="Цена"
                  />
                  <div className="flex gap-2">
                      <input
                          type="number"
                          min="1"
                          value={newSubscriptionValidityDays}
                          onChange={e => setNewSubscriptionValidityDays(e.target.value)}
                          className="flex-1 border border-gray-300 rounded-lg p-2 bg-white text-gray-900"
                          placeholder="Срок (дн.)"
                      />
                      <button onClick={addSubscriptionPlan} type="button" className="bg-indigo-600 text-white px-3 rounded-lg hover:bg-indigo-700">
                          <Plus size={18}/>
                      </button>
                  </div>
              </div>

              <div className="space-y-2">
                  {localSubscriptionPlans.map(plan => (
                      <div key={plan.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center border border-indigo-100 rounded-lg p-3 bg-indigo-50/30">
                          <input
                              value={plan.name}
                              onChange={e => updateSubscriptionPlan(plan.id, { name: e.target.value })}
                              className="md:col-span-4 border border-gray-300 rounded p-2 bg-white text-gray-900"
                          />
                          <input
                              type="number"
                              min="1"
                              step="1"
                              value={Math.round((plan.totalMinutes || 0) / 60)}
                              onChange={e => updateSubscriptionPlan(plan.id, { totalMinutes: Math.max(1, Math.round(Number(e.target.value) || 1)) * 60 })}
                              className="md:col-span-2 border border-gray-300 rounded p-2 bg-white text-gray-900"
                              title="Часы"
                          />
                          <input
                              type="number"
                              min="0"
                              value={plan.price}
                              onChange={e => updateSubscriptionPlan(plan.id, { price: Math.max(0, Math.round(Number(e.target.value) || 0)) })}
                              className="md:col-span-2 border border-gray-300 rounded p-2 bg-white text-gray-900"
                              title="Цена"
                          />
                          <input
                              type="number"
                              min="1"
                              value={plan.validityDays}
                              onChange={e => updateSubscriptionPlan(plan.id, { validityDays: Math.max(1, Math.round(Number(e.target.value) || 1)) })}
                              className="md:col-span-2 border border-gray-300 rounded p-2 bg-white text-gray-900"
                              title="Срок действия (дни)"
                          />
                          <div className="md:col-span-2 flex items-center justify-end gap-2">
                              <button
                                  type="button"
                                  onClick={() => updateSubscriptionPlan(plan.id, { isActive: !plan.isActive })}
                                  className={`px-2 py-1 rounded text-xs font-bold ${plan.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                              >
                                  {plan.isActive ? 'Активен' : 'Выключен'}
                              </button>
                              <button type="button" onClick={() => removeSubscriptionPlan(plan.id)} className="text-red-500 hover:text-red-700 p-1">
                                  <Trash2 size={16}/>
                              </button>
                          </div>
                      </div>
                  ))}
                  {localSubscriptionPlans.length === 0 && (
                      <p className="text-sm text-gray-400 italic">Шаблоны абонементов еще не добавлены.</p>
                  )}
              </div>
          </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* General Settings (Bonus) */}
          <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
             <div className="p-6 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                 <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                     <Percent size={20} /> Общие Настройки
                 </h2>
                 <button onClick={saveSettings} className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-black flex items-center gap-2"><Save size={16}/> Сохранить</button>
             </div>
             <div className="p-6">
                <div className="mb-4">
                    <label className="block text-sm font-bold text-gray-700 mb-1">Процент начисления бонусов</label>
                    <div className="relative">
                        <input 
                           type="number" 
                           min="0" max="100"
                           value={localBonusPercentage}
                           onChange={e => setLocalBonusPercentage(parseInt(e.target.value))}
                           className="w-full p-3 border border-gray-300 rounded-lg text-lg font-bold bg-white text-gray-900 focus:ring-2 focus:ring-blue-100 outline-none" 
                        />
                        <span className="absolute right-4 top-3.5 font-bold text-gray-400">%</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Этот процент будет возвращаться клиентам на карту от суммы оплаты.</p>
                </div>
             </div>
          </section>

          {/* Admin Management Section */}
          <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
             <div className="p-6 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                 <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                     <Users size={20} /> Администраторы
                 </h2>
                 <button onClick={saveAdmins} className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-black flex items-center gap-2"><Save size={16}/> Сохранить</button>
             </div>
             <div className="p-6">
                <div className="flex gap-4 items-end mb-6">
                    <div className="flex-1">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Имя нового администратора</label>
                        <input 
                           value={newAdminName}
                           onChange={e => setNewAdminName(e.target.value)}
                           className="w-full border border-gray-300 p-2 rounded text-sm bg-white text-gray-900"
                           placeholder="Например: Ирина"
                        />
                    </div>
                    <button onClick={addAdmin} className="bg-blue-600 text-white px-4 py-2 rounded font-bold hover:bg-blue-700 h-10">Добавить</button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {localAdministrators.map(admin => (
                        <div key={admin.id} className="flex items-center justify-between p-3 border border-gray-200 rounded bg-gray-50">
                            <span className="font-bold text-gray-900">{admin.name}</span>
                            <button onClick={() => removeAdmin(admin.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={16}/></button>
                        </div>
                    ))}
                    {localAdministrators.length === 0 && <span className="text-gray-400 italic">Нет администраторов</span>}
                </div>
             </div>
          </section>
      </div>

      {/* Important Documents Management */}
      <section className="bg-white rounded-xl shadow-sm border border-yellow-100 overflow-hidden">
          <div className="p-6 bg-yellow-50 border-b border-yellow-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-yellow-900 flex items-center gap-2">
                  <FileCheck size={20} /> Документы и Инструкции (Админ Инфо)
              </h2>
          </div>
          <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">Добавьте важную информацию: Google Docs, Word файлы (инструкции к играм), PDF или ссылки.</p>
              
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6">
                  <div className="flex flex-col md:flex-row gap-4 mb-4">
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Заголовок</label>
                            <input 
                                value={newDocTitle}
                                onChange={e => setNewDocTitle(e.target.value)}
                                className="w-full border border-gray-300 p-2 rounded text-sm bg-white text-gray-900"
                                placeholder="Напр: Описание Игр"
                            />
                        </div>
                        <div className="w-full md:w-40">
                             <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Тип</label>
                             <select 
                                value={newDocType} 
                                onChange={e => setNewDocType(e.target.value as DocumentType)}
                                className="w-full border border-gray-300 p-2 rounded text-sm bg-white text-gray-900"
                             >
                                 <option value="GOOGLE">Google Doc</option>
                                 <option value="WORD">Word (.docx)</option>
                                 <option value="PDF">PDF</option>
                                 <option value="OTHER">Ссылка</option>
                             </select>
                        </div>
                  </div>
                  
                  <div className="flex flex-col md:flex-row gap-4 items-end">
                      <div className="flex-1 w-full">
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Ссылка (URL) или Загрузка</label>
                          <div className="flex gap-2">
                              <div className="relative flex-1">
                                  <LinkIcon className="absolute left-2 top-2.5 text-gray-400" size={14}/>
                                  <input 
                                      value={newDocUrl}
                                      onChange={e => setNewDocUrl(e.target.value)}
                                      className="w-full border border-gray-300 p-2 pl-8 rounded text-sm bg-white text-gray-900"
                                      placeholder="https://..."
                                  />
                              </div>
                              <span className="flex items-center text-xs text-gray-400 font-bold">ИЛИ</span>
                              <div className="relative">
                                  <input 
                                      type="file" 
                                      ref={fileInputRef}
                                      onChange={handleFileUpload}
                                      className="hidden"
                                      accept=".doc,.docx,.pdf,.txt"
                                  />
                                  <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded text-sm font-medium hover:bg-gray-50 flex items-center gap-2"
                                  >
                                      <Upload size={14}/> Загрузить
                                  </button>
                              </div>
                          </div>
                      </div>
                      <button onClick={addDocument} className="bg-yellow-600 text-white px-6 py-2 rounded font-bold hover:bg-yellow-700 h-10 w-full md:w-auto">Добавить</button>
                  </div>
              </div>

              <div className="space-y-2">
                  {documents.map(doc => (
                      <div key={doc.id} className="flex items-center justify-between p-3 border border-gray-200 rounded bg-white hover:bg-gray-50">
                          <div className="flex items-center gap-3 overflow-hidden">
                              <div className={`p-2 rounded-lg ${doc.type === 'WORD' ? 'bg-blue-100 text-blue-600' : doc.type === 'GOOGLE' ? 'bg-yellow-100 text-yellow-600' : doc.type === 'PDF' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
                                  {doc.type === 'WORD' ? <FileType size={20}/> : doc.type === 'PDF' ? <FileText size={20}/> : <FileCheck size={20}/>}
                              </div>
                              <div className="flex flex-col overflow-hidden">
                                  <span className="font-bold text-gray-900 truncate">{doc.title}</span>
                                  <a href={doc.url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline truncate max-w-xs">{doc.url.startsWith('data:') ? 'Файл загружен' : doc.url}</a>
                              </div>
                          </div>
                          <button onClick={() => removeDocument(doc.id)} className="text-gray-400 hover:text-red-500 p-2"><Trash2 size={16}/></button>
                      </div>
                  ))}
                  {documents.length === 0 && <span className="text-gray-400 italic">Документы не добавлены</span>}
              </div>
          </div>
      </section>

      {/* Mini Games Management */}
      <section className="bg-white rounded-xl shadow-sm border border-indigo-100 overflow-hidden">
          <div className="p-6 bg-indigo-50 border-b border-indigo-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-indigo-900 flex items-center gap-2">
                  <Sparkles size={20} /> Расписание Развивашек (По неделям)
              </h2>
              <button onClick={saveMiniGames} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-indigo-700 flex items-center gap-2"><Save size={16}/> Сохранить</button>
          </div>
          <div className="p-6">
              <div className="mb-6 bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                      <FileText size={16}/> Общая памятка / план игр
                  </label>
                  
                  <div className="flex flex-col md:flex-row gap-4 items-end">
                      <div className="flex-1 w-full">
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Ссылка (URL) или Загрузка файла</label>
                          <div className="flex gap-2">
                              <div className="relative flex-1">
                                  <LinkIcon className="absolute left-2 top-2.5 text-gray-400" size={14}/>
                                  <input 
                                      value={localMiniGames.memoUrl}
                                      onChange={e => setLocalMiniGames({...localMiniGames, memoUrl: e.target.value})}
                                      className="w-full border border-gray-300 p-2 pl-8 rounded text-sm bg-white text-gray-900"
                                      placeholder="https://... или загрузите файл"
                                  />
                              </div>
                              <span className="flex items-center text-xs text-gray-400 font-bold">ИЛИ</span>
                              <div className="relative">
                                  <input 
                                      type="file" 
                                      ref={memoFileInputRef}
                                      onChange={handleMemoFileUpload}
                                      className="hidden"
                                      accept=".doc,.docx,.pdf,.txt"
                                  />
                                  <button 
                                    onClick={() => memoFileInputRef.current?.click()}
                                    className="bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded text-sm font-medium hover:bg-gray-50 flex items-center gap-2"
                                  >
                                      <Upload size={14}/> Загрузить
                                  </button>
                              </div>
                          </div>
                      </div>
                  </div>
                  {localMiniGames.memoName && (
                      <div className="mt-2 text-xs text-green-600 flex items-center gap-1 font-medium">
                          <CheckCircle size={12}/> Загружен файл: {localMiniGames.memoName}
                      </div>
                  )}
                  <p className="text-xs text-gray-500 mt-2">Прикрепите Word, PDF или ссылку на Google Doc с подробным описанием игр.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Odd Week Schedule */}
                  <div className="border border-indigo-200 rounded-xl overflow-hidden">
                      <div className="bg-indigo-100 px-4 py-3 border-b border-indigo-200 font-bold text-indigo-900 flex items-center gap-2">
                          <CalendarDays size={18}/> Нечетная неделя (1, 3, 5...)
                      </div>
                      <div className="p-4 bg-indigo-50/50 space-y-3">
                          <p className="text-xs text-gray-500 mb-2">Эти 5 игр будут повторяться каждый день в нечетные недели года.</p>
                          {localMiniGames.oddWeekGames.map((game, idx) => (
                              <div key={idx} className="flex gap-3 items-center">
                                  <input 
                                      value={game.time}
                                      className="w-20 border border-gray-300 p-2 rounded text-sm bg-white text-gray-900 font-bold text-center"
                                      readOnly 
                                  />
                                  <input 
                                      value={game.activity}
                                      onChange={e => handleGameActivityChange('ODD', idx, e.target.value)}
                                      className="flex-1 border border-gray-300 p-2 rounded text-sm bg-white text-gray-900 focus:ring-1 focus:ring-indigo-200 outline-none"
                                      placeholder="Активность..."
                                  />
                              </div>
                          ))}
                      </div>
                  </div>

                  {/* Even Week Schedule */}
                  <div className="border border-green-200 rounded-xl overflow-hidden">
                      <div className="bg-green-100 px-4 py-3 border-b border-green-200 font-bold text-green-900 flex items-center gap-2">
                          <CalendarDays size={18}/> Четная неделя (2, 4, 6...)
                      </div>
                      <div className="p-4 bg-green-50/50 space-y-3">
                          <p className="text-xs text-gray-500 mb-2">Эти 5 игр будут повторяться каждый день в четные недели года.</p>
                          {localMiniGames.evenWeekGames.map((game, idx) => (
                              <div key={idx} className="flex gap-3 items-center">
                                  <input 
                                      value={game.time}
                                      className="w-20 border border-gray-300 p-2 rounded text-sm bg-white text-gray-900 font-bold text-center"
                                      readOnly
                                  />
                                  <input 
                                      value={game.activity}
                                      onChange={e => handleGameActivityChange('EVEN', idx, e.target.value)}
                                      className="flex-1 border border-gray-300 p-2 rounded text-sm bg-white text-gray-900 focus:ring-1 focus:ring-green-200 outline-none"
                                      placeholder="Активность..."
                                  />
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
          </div>
      </section>
      
      {/* 0. Shift History & Management */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <History size={20} /> История Смен (Управление)
              </h2>
          </div>
          <div className="p-6">
             <div className="overflow-x-auto max-h-64 overflow-y-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-900 font-bold uppercase text-xs sticky top-0">
                        <tr>
                            <th className="p-3 rounded-l-lg">Дата</th>
                            <th className="p-3">Администратор</th>
                            <th className="p-3 text-right">Выручка (Нал/Карта)</th>
                            <th className="p-3 text-center">Статус</th>
                            <th className="p-3 rounded-r-lg text-center">Действие</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {sortedDays.length === 0 && (
                            <tr><td colSpan={5} className="p-6 text-center text-gray-400">История пуста</td></tr>
                        )}
                        {sortedDays.map(day => {
                            const revenue = (day.transactions || [])
                                .filter(t => (t.type === 'SALE' || t.type === 'EXTENSION' || t.type === 'PREPAYMENT'))
                                .reduce((sum, t) => sum + t.amount, 0);

                            return (
                                <tr key={day.id} className="hover:bg-gray-50">
                                    <td className="p-3 font-mono text-gray-600">{new Date(day.date).toLocaleDateString()}</td>
                                    <td className="p-3">
                                        <div className="font-bold text-gray-900">{day.adminName}</div>
                                        {day.closingAdminName && day.closingAdminName !== day.adminName && (
                                            <div className="text-xs text-gray-400">Закрыл: {day.closingAdminName}</div>
                                        )}
                                    </td>
                                    <td className="p-3 text-right font-bold text-gray-900">
                                        {revenue.toLocaleString()} ₽
                                    </td>
                                    <td className="p-3 text-center">
                                        {day.isClosed ? (
                                            <span className="px-2 py-1 bg-red-100 text-red-600 text-xs font-bold rounded border border-red-200">ЗАКРЫТА</span>
                                        ) : (
                                            <span className="px-2 py-1 bg-green-100 text-green-600 text-xs font-bold rounded border border-green-200">ОТКРЫТА</span>
                                        )}
                                    </td>
                                    <td className="p-3 text-center">
                                        {day.isClosed ? (
                                            <button 
                                                onClick={() => {
                                                    if (window.confirm(`Вы уверены, что хотите заново открыть смену за ${day.date}?`)) {
                                                        onReopenShift(day.date);
                                                    }
                                                }}
                                                className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded hover:bg-blue-100 font-bold flex items-center gap-1 mx-auto border border-blue-200"
                                            >
                                                <RotateCcw size={12} /> Открыть заново
                                            </button>
                                        ) : (
                                            <span className="text-xs text-gray-400">Активна</span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
             </div>
          </div>
      </section>

      {/* 1. Contractor Settlements */}
      <section className="bg-white rounded-xl shadow-sm border border-green-100 overflow-hidden">
         <div className="p-6 bg-green-50 border-b border-green-100 flex justify-between items-center">
             <h2 className="text-lg font-bold text-green-900 flex items-center gap-2">
                 <Handshake size={20} /> Расчеты с Подрядчиками
             </h2>
         </div>
         <div className="p-6">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-900 font-bold uppercase text-xs">
                        <tr>
                            <th className="p-3 rounded-l-lg">Дата</th>
                            <th className="p-3">Событие</th>
                            <th className="p-3">Подрядчик</th>
                            <th className="p-3 text-right text-green-700">Доход (Клиент)</th>
                            <th className="p-3 text-right text-red-700">Расход (Нам)</th>
                            <th className="p-3 text-right text-gray-700">Маржа</th>
                            <th className="p-3 rounded-r-lg text-center">Статус Оплаты</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {externalEvents.length === 0 && (
                            <tr><td colSpan={7} className="p-6 text-center text-gray-400">Нет событий с внешними подрядчиками</td></tr>
                        )}
                        {externalEvents.map(e => {
                            const rows = [];
                            if (e.animator?.type === 'EXTERNAL') {
                                const profit = (e.animator.priceToClient || 0) - (e.animator.costToUs || 0);
                                const isPaid = e.animator.isPaidToVendor;
                                rows.push(
                                    <tr key={`${e.id}_anim`} className="hover:bg-gray-50">
                                        <td className="p-3 font-mono text-gray-600">{new Date(e.date).toLocaleDateString()}</td>
                                        <td className="p-3 font-medium text-gray-900">{e.childName || e.title} <span className="text-xs text-gray-500 bg-gray-100 px-1 rounded ml-1 border border-gray-200">Аниматор</span></td>
                                        <td className="p-3 text-gray-800">{e.animator.name || e.animator.organization}</td>
                                        <td className="p-3 text-right font-bold text-green-700">{e.animator.priceToClient} ₽</td>
                                        <td className="p-3 text-right">
                                            <input 
                                                type="number" 
                                                value={e.animator.costToUs || ''} 
                                                onChange={(ev) => handleEventUpdate(e.id, 'ANIMATOR', 'COST', parseFloat(ev.target.value))}
                                                className="w-24 p-1 border border-gray-300 rounded bg-white text-right font-bold text-red-600 focus:ring-2 focus:ring-red-200 outline-none"
                                                placeholder="0"
                                            />
                                        </td>
                                        <td className="p-3 text-right font-bold">
                                            <span className={profit > 0 ? 'text-green-600' : 'text-gray-400'}>{profit} ₽</span>
                                        </td>
                                        <td className="p-3 text-center">
                                            <button 
                                                onClick={() => handleEventUpdate(e.id, 'ANIMATOR', 'PAID', !isPaid)}
                                                className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold transition-colors mx-auto ${isPaid ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-500 border border-gray-200 hover:bg-gray-200'}`}
                                            >
                                                {isPaid ? <CheckCircle size={14}/> : <XCircle size={14}/>}
                                                {isPaid ? 'Оплачено' : 'Не оплачено'}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            }
                            if (e.registration?.type === 'EXTERNAL') {
                                const profit = (e.registration.priceToClient || 0) - (e.registration.costToUs || 0);
                                const isPaid = e.registration.isPaidToVendor;
                                rows.push(
                                    <tr key={`${e.id}_reg`} className="hover:bg-gray-50">
                                        <td className="p-3 font-mono text-gray-600">{new Date(e.date).toLocaleDateString()}</td>
                                        <td className="p-3 font-medium text-gray-900">{e.childName || e.title} <span className="text-xs text-gray-500 bg-gray-100 px-1 rounded ml-1 border border-gray-200">Оформление</span></td>
                                        <td className="p-3 text-gray-800">{e.registration.organization}</td>
                                        <td className="p-3 text-right font-bold text-green-700">{e.registration.priceToClient} ₽</td>
                                        <td className="p-3 text-right">
                                            <input 
                                                type="number" 
                                                value={e.registration.costToUs || ''} 
                                                onChange={(ev) => handleEventUpdate(e.id, 'REGISTRATION', 'COST', parseFloat(ev.target.value))}
                                                className="w-24 p-1 border border-gray-300 rounded bg-white text-right font-bold text-red-600 focus:ring-2 focus:ring-red-200 outline-none"
                                                placeholder="0"
                                            />
                                        </td>
                                        <td className="p-3 text-right font-bold">
                                            <span className={profit > 0 ? 'text-green-600' : 'text-gray-400'}>{profit} ₽</span>
                                        </td>
                                        <td className="p-3 text-center">
                                            <button 
                                                onClick={() => handleEventUpdate(e.id, 'REGISTRATION', 'PAID', !isPaid)}
                                                className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold transition-colors mx-auto ${isPaid ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-500 border border-gray-200 hover:bg-gray-200'}`}
                                            >
                                                {isPaid ? <CheckCircle size={14}/> : <XCircle size={14}/>}
                                                {isPaid ? 'Оплачено' : 'Не оплачено'}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            }
                            return rows;
                        })}
                    </tbody>
                </table>
            </div>
         </div>
      </section>

      {/* 1. Game Room Settings */}
      <section className="bg-white rounded-xl shadow-sm border border-blue-100 overflow-hidden">
          <div className="p-6 bg-blue-50 border-b border-blue-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-blue-900 flex items-center gap-2">
                  <Clock size={20} /> Тарифы Игровой Комнаты
              </h2>
              <button onClick={saveTariffs} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-blue-700 flex items-center gap-2"><Save size={16}/> Сохранить</button>
          </div>
          <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                      <h3 className="font-bold text-gray-700 mb-3 text-sm uppercase">Список тарифов</h3>
                      <div className="space-y-3">
                          {localTariffs.map(t => (
                              <div key={t.id} className="flex gap-3 items-center bg-white p-2 rounded border border-gray-100 shadow-sm">
                                  <input 
                                      value={t.name}
                                      onChange={(e) => handleTariffChange(t.id, 'name', e.target.value)}
                                      className="flex-1 border border-gray-300 p-2 rounded bg-white text-gray-900"
                                      placeholder="Название"
                                  />
                                  <input 
                                      type="number"
                                      value={t.durationMinutes}
                                      onChange={(e) => handleTariffChange(t.id, 'durationMinutes', parseInt(e.target.value))}
                                      className="w-20 border border-gray-300 p-2 rounded bg-white text-gray-900 text-center"
                                      placeholder="Мин"
                                  />
                                  <input 
                                      type="number"
                                      value={t.price}
                                      onChange={(e) => handleTariffChange(t.id, 'price', parseFloat(e.target.value))}
                                      className="w-24 border border-gray-300 p-2 rounded bg-white text-gray-900 font-bold"
                                      placeholder="Цена"
                                  />
                                  <button onClick={() => removeTariff(t.id)} className="text-red-400 hover:text-red-600"><Trash2 size={18}/></button>
                              </div>
                          ))}
                          <button onClick={addTariff} className="text-blue-600 font-bold text-sm flex items-center gap-1 hover:bg-blue-50 p-2 rounded w-fit"><Plus size={16}/> Добавить тариф</button>
                      </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 h-fit">
                      <h3 className="font-bold text-gray-700 mb-3 text-sm uppercase">Дополнительно</h3>
                      <div>
                          <label className="block text-sm text-gray-600 mb-1">Стоимость продления (₽/мин)</label>
                          <input 
                              type="number"
                              value={localExtensionRate}
                              onChange={(e) => setLocalExtensionRate(parseFloat(e.target.value))}
                              className="w-full border border-gray-300 p-2 rounded bg-white text-gray-900 font-bold"
                          />
                      </div>
                  </div>
              </div>
          </div>
      </section>

      {/* 2. Birthday Rates */}
      <section className="bg-white rounded-xl shadow-sm border border-pink-100 overflow-hidden">
          <div className="p-6 bg-pink-50 border-b border-pink-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-pink-900 flex items-center gap-2">
                  <PartyPopper size={20} /> Цены на Праздники
              </h2>
              <button onClick={saveBirthdayRates} className="bg-pink-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-pink-700 flex items-center gap-2"><Save size={16}/> Сохранить</button>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
               <div>
                   <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><Briefcase size={16}/> Будние дни</h3>
                   <div className="space-y-4">
                       <div>
                           <label className="block text-sm font-medium text-gray-600 mb-1">Аренда комнаты (2 часа)</label>
                           <input 
                               type="number"
                               value={localBirthdayRates.weekday.room2h}
                               onChange={(e) => setLocalBirthdayRates({...localBirthdayRates, weekday: {...localBirthdayRates.weekday, room2h: parseFloat(e.target.value)}})}
                               className="w-full border border-gray-300 p-2 rounded bg-white text-gray-900 font-bold"
                           />
                       </div>
                       <div>
                           <label className="block text-sm font-medium text-gray-600 mb-1">Игровая зона (1 час / ребенок)</label>
                           <input 
                               type="number"
                               value={localBirthdayRates.weekday.zone1h}
                               onChange={(e) => setLocalBirthdayRates({...localBirthdayRates, weekday: {...localBirthdayRates.weekday, zone1h: parseFloat(e.target.value)}})}
                               className="w-full border border-gray-300 p-2 rounded bg-white text-gray-900 font-bold"
                           />
                       </div>
                   </div>
               </div>
               <div>
                   <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><PartyPopper size={16}/> Выходные</h3>
                   <div className="space-y-4">
                       <div>
                           <label className="block text-sm font-medium text-gray-600 mb-1">Аренда комнаты (2 часа)</label>
                           <input 
                               type="number"
                               value={localBirthdayRates.weekend.room2h}
                               onChange={(e) => setLocalBirthdayRates({...localBirthdayRates, weekend: {...localBirthdayRates.weekend, room2h: parseFloat(e.target.value)}})}
                               className="w-full border border-gray-300 p-2 rounded bg-white text-gray-900 font-bold"
                           />
                       </div>
                       <div>
                           <label className="block text-sm font-medium text-gray-600 mb-1">Игровая зона (1 час / ребенок)</label>
                           <input 
                               type="number"
                               value={localBirthdayRates.weekend.zone1h}
                               onChange={(e) => setLocalBirthdayRates({...localBirthdayRates, weekend: {...localBirthdayRates.weekend, zone1h: parseFloat(e.target.value)}})}
                               className="w-full border border-gray-300 p-2 rounded bg-white text-gray-900 font-bold"
                           />
                       </div>
                   </div>
               </div>
          </div>
      </section>

      {/* 3. Products Management */}
      <section className="bg-white rounded-xl shadow-sm border border-orange-100 overflow-hidden">
          <div className="p-6 bg-orange-50 border-b border-orange-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-orange-900 flex items-center gap-2">
                  <Coffee size={20} /> Товары и Категории
              </h2>
              <button onClick={saveProducts} className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-orange-700 flex items-center gap-2"><Save size={16}/> Сохранить товары</button>
          </div>
          
          <div className="p-6 space-y-8">
              {/* Category Manager */}
              <div className="bg-white p-4 rounded-xl border border-gray-200">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-gray-800 text-sm uppercase">Управление категориями</h3>
                      <button onClick={saveCategories} className="text-xs bg-gray-800 text-white px-3 py-1 rounded hover:bg-black">Сохранить категории</button>
                  </div>
                  <div className="flex gap-2 mb-4">
                      <input 
                          value={newCategoryName}
                          onChange={e => setNewCategoryName(e.target.value)}
                          className="border border-gray-300 p-2 rounded text-sm flex-1 bg-white text-gray-900"
                          placeholder="Новая категория..."
                      />
                      <button onClick={addCategory} className="bg-blue-600 text-white px-3 py-1 rounded text-sm font-bold hover:bg-blue-700">Добавить</button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                      {localCategories.map(cat => (
                          <div key={cat.id} className="flex items-center gap-1 bg-gray-100 px-3 py-1 rounded-full border border-gray-200">
                              {cat.isSystem ? (
                                  <span className="font-bold text-gray-700 text-sm px-1">{cat.name}</span>
                              ) : (
                                  <>
                                      <input 
                                          value={cat.name}
                                          onChange={(e) => updateCategoryName(cat.id, e.target.value)}
                                          className="bg-transparent border-b border-transparent focus:border-gray-400 outline-none text-sm font-bold text-gray-700 w-24"
                                      />
                                      <button onClick={() => removeCategory(cat.id)} className="text-gray-400 hover:text-red-500 ml-1"><XCircle size={14}/></button>
                                  </>
                              )}
                          </div>
                      ))}
                  </div>
              </div>

              {/* Product Manager */}
              <div>
                   <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
                       <button 
                          onClick={() => setActiveProductCategory('ALL')}
                          className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-colors ${activeProductCategory === 'ALL' ? 'bg-orange-100 text-orange-700' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                       >
                           Все товары
                       </button>
                       {localCategories.map(cat => (
                           <button 
                              key={cat.id}
                              onClick={() => setActiveProductCategory(cat.id)}
                              className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-colors ${activeProductCategory === cat.id ? 'bg-orange-100 text-orange-700' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                           >
                               {cat.name}
                           </button>
                       ))}
                   </div>
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                       {localProducts.filter(p => activeProductCategory === 'ALL' || p.category === activeProductCategory).map(p => (
                           <div key={p.id} className="flex gap-2 items-center bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                               <div className="flex-1 space-y-2">
                                   <input 
                                      value={p.name}
                                      onChange={(e) => handleProductChange(p.id, 'name', e.target.value)}
                                      className="w-full border border-gray-300 p-2 rounded text-sm bg-white text-gray-900 font-medium"
                                      placeholder="Название"
                                   />
                                   <div className="flex gap-2">
                                       <input 
                                          type="number"
                                          value={p.price}
                                          onChange={(e) => handleProductChange(p.id, 'price', parseFloat(e.target.value))}
                                          className="w-20 border border-gray-300 p-2 rounded text-sm bg-white text-gray-900 font-bold"
                                          placeholder="Цена"
                                       />
                                       <select 
                                           value={p.category}
                                           onChange={(e) => handleProductChange(p.id, 'category', e.target.value)}
                                           className="flex-1 border border-gray-300 p-2 rounded text-xs bg-white text-gray-900"
                                       >
                                           {localCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                       </select>
                                   </div>
                               </div>
                               <button onClick={() => removeProduct(p.id)} className="text-gray-300 hover:text-red-500 p-1"><Trash2 size={18}/></button>
                           </div>
                       ))}
                       <button 
                          onClick={() => addProduct(activeProductCategory === 'ALL' ? (localCategories[0]?.id || 'OTHER') : activeProductCategory)}
                          className="border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 hover:border-orange-300 hover:text-orange-500 font-bold min-h-[100px]"
                       >
                           <Plus size={24}/>
                       </button>
                   </div>
              </div>
          </div>
      </section>

      {/* 4. Staff & Partners */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Staff Animators */}
          <section className="bg-white rounded-xl shadow-sm border border-purple-100 overflow-hidden">
             <div className="p-6 bg-purple-50 border-b border-purple-100 flex justify-between items-center">
                 <h2 className="text-lg font-bold text-purple-900 flex items-center gap-2">
                     <Users size={20} /> Штатные Аниматоры
                 </h2>
                 <button onClick={saveStaff} className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-purple-700 flex items-center gap-2"><Save size={16}/> Сохранить</button>
             </div>
             <div className="p-6">
                 <div className="mb-4 bg-gray-50 p-3 rounded-lg border border-gray-200">
                     <h3 className="font-bold text-xs uppercase text-gray-500 mb-2">Добавить сотрудника</h3>
                     <div className="flex flex-col gap-2">
                         <div className="flex gap-2">
                             <input value={newStaffName} onChange={e => setNewStaffName(e.target.value)} placeholder="Имя" className="flex-1 p-2 border rounded text-sm bg-white text-gray-900" />
                             <input value={newStaffPrice} onChange={e => setNewStaffPrice(e.target.value)} placeholder="Ставка" className="w-20 p-2 border rounded text-sm bg-white text-gray-900" />
                         </div>
                         <input value={newStaffRole} onChange={e => setNewStaffRole(e.target.value)} placeholder="Роли (через запятую)" className="w-full p-2 border rounded text-sm bg-white text-gray-900" />
                         <button onClick={addStaff} className="bg-purple-600 text-white p-2 rounded text-sm font-bold hover:bg-purple-700 mt-1">Добавить</button>
                     </div>
                 </div>
                 <div className="space-y-3">
                     {localStaffAnimators.map(s => (
                         <div key={s.id} className="border border-gray-200 rounded p-3 relative">
                             <div className="flex justify-between mb-2">
                                 <input value={s.name} onChange={e => updateStaff(s.id, 'name', e.target.value)} className="font-bold text-gray-900 border-none bg-transparent focus:ring-0 p-0 w-1/2" />
                                 <div className="flex items-center gap-1">
                                     <input type="number" value={s.defaultPrice} onChange={e => updateStaff(s.id, 'defaultPrice', parseFloat(e.target.value))} className="w-16 text-right font-bold text-gray-900 border-none bg-transparent p-0" />
                                     <span className="text-xs text-gray-500">₽</span>
                                 </div>
                             </div>
                             <input 
                                value={s.roles.join(', ')} 
                                onChange={e => updateStaff(s.id, 'roles', e.target.value.split(',').map(r => r.trim()))}
                                className="w-full text-xs text-gray-500 border border-gray-100 rounded bg-gray-50 p-1"
                             />
                             <button onClick={() => removeStaff(s.id)} className="absolute -top-2 -right-2 bg-white text-red-400 hover:text-red-600 rounded-full p-1 border shadow-sm"><XCircle size={16}/></button>
                         </div>
                     ))}
                 </div>
             </div>
          </section>
          
          {/* External Partners */}
          <section className="bg-white rounded-xl shadow-sm border border-teal-100 overflow-hidden">
             <div className="p-6 bg-teal-50 border-b border-teal-100 flex justify-between items-center">
                 <h2 className="text-lg font-bold text-teal-900 flex items-center gap-2">
                     <Handshake size={20} /> Партнеры
                 </h2>
                 <button onClick={savePartners} className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-teal-700 flex items-center gap-2"><Save size={16}/> Сохранить</button>
             </div>
             <div className="p-6">
                 <div className="mb-4 bg-gray-50 p-3 rounded-lg border border-gray-200">
                     <h3 className="font-bold text-xs uppercase text-gray-500 mb-2">Добавить партнера</h3>
                     <div className="flex flex-col gap-2">
                         <input value={newPartnerName} onChange={e => setNewPartnerName(e.target.value)} placeholder="Название / Имя" className="w-full p-2 border rounded text-sm bg-white text-gray-900" />
                         <div className="flex gap-2">
                             <select value={newPartnerType} onChange={e => setNewPartnerType(e.target.value as any)} className="flex-1 p-2 border rounded text-xs bg-white text-gray-900">
                                 <option value="ANIMATOR">Аниматор</option>
                                 <option value="DECORATION">Декор</option>
                                 <option value="MASTER_CLASS">МК</option>
                                 <option value="OTHER">Другое</option>
                             </select>
                             <input value={newPartnerPhone} onChange={e => setNewPartnerPhone(e.target.value)} placeholder="Телефон" className="flex-1 p-2 border rounded text-sm bg-white text-gray-900" />
                         </div>
                         <button onClick={addPartner} className="bg-teal-600 text-white p-2 rounded text-sm font-bold hover:bg-teal-700 mt-1">Добавить</button>
                     </div>
                 </div>
                 <div className="space-y-2 max-h-60 overflow-y-auto">
                     {localPartners.map(p => (
                         <div key={p.id} className="flex justify-between items-center border border-gray-200 rounded p-2 text-sm bg-white">
                             <div>
                                 <div className="font-bold text-gray-900">{p.name}</div>
                                 <div className="text-xs text-gray-500">{p.type} • {p.phone}</div>
                             </div>
                             <button onClick={() => removePartner(p.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={16}/></button>
                         </div>
                     ))}
                 </div>
             </div>
          </section>
      </div>
    </div>
  );
};

export default OwnerTab;
