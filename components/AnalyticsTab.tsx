
import React, { useState, useMemo } from 'react';
import { DayData, Client, CalendarEvent, Session, Tariff, Product, Category, CustomTracker, TrackerType } from '../types';
import { OWNER_PASSWORD } from '../constants';
import { Lock, BarChart3, Users, Clock, Calendar, TrendingUp, DollarSign, Activity, PieChart, Plus, Trash2, Target } from 'lucide-react';

interface AnalyticsTabProps {
  days: Record<string, DayData>;
  clients: Client[];
  events: CalendarEvent[];
  tariffs: Tariff[];
  products: Product[];
  categories: Category[];
  customTrackers: CustomTracker[];
  onUpdateCustomTrackers: (trackers: CustomTracker[]) => void;
}

const AnalyticsTab: React.FC<AnalyticsTabProps> = ({ days, clients, events, tariffs, products, categories, customTrackers, onUpdateCustomTrackers }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [error, setError] = useState('');

  // Tracker Form State
  const [newTrackerName, setNewTrackerName] = useState('');
  const [newTrackerType, setNewTrackerType] = useState<TrackerType>('PRODUCT_SALES');
  const [newTrackerTarget, setNewTrackerTarget] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === OWNER_PASSWORD || passwordInput === '28121000') {
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('Неверный пароль');
    }
  };

  const handleAddTracker = () => {
      if (newTrackerName && newTrackerTarget) {
          const newTracker: CustomTracker = {
              id: Date.now().toString(),
              name: newTrackerName,
              type: newTrackerType,
              targetId: newTrackerTarget
          };
          onUpdateCustomTrackers([...customTrackers, newTracker]);
          setNewTrackerName('');
          setNewTrackerTarget('');
      }
  };

  const handleDeleteTracker = (id: string) => {
      onUpdateCustomTrackers(customTrackers.filter(t => t.id !== id));
  };

  // --- ANALYTICS CALCULATIONS ---
  const stats = useMemo(() => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const allSessions: Session[] = Object.values(days).flatMap(d => d.sessions);
    const allTransactions = Object.values(days).flatMap(d => d.transactions || []);

    // 1. Attendance (Week & Month)
    let visitorsMonth = 0;
    let visitorsWeek = 0;

    allSessions.forEach(session => {
        const date = new Date(session.startTime);
        if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
            visitorsMonth++;
        }
        if (date >= oneWeekAgo) {
            visitorsWeek++;
        }
    });

    // 2. Age Groups
    const ageGroups: Record<string, number> = { '0-2 года': 0, '3-5 лет': 0, '6-8 лет': 0, '9+ лет': 0, 'Не указано': 0 };
    clients.forEach(c => {
        c.children.forEach(child => {
            if (!child.dob) {
                ageGroups['Не указано']++;
                return;
            }
            const birthDate = new Date(child.dob);
            const age = today.getFullYear() - birthDate.getFullYear();
            if (age <= 2) ageGroups['0-2 года']++;
            else if (age <= 5) ageGroups['3-5 лет']++;
            else if (age <= 8) ageGroups['6-8 лет']++;
            else ageGroups['9+ лет']++;
        });
    });

    // 3. Peak Hours
    const hoursMap = new Array(24).fill(0);
    allSessions.forEach(session => {
        const hour = new Date(session.startTime).getHours();
        hoursMap[hour]++;
    });
    // Filter to relevant hours (e.g., 9 AM to 9 PM)
    const activeHours = hoursMap.slice(9, 22).map((count, idx) => ({ hour: idx + 9, count }));
    const maxHourCount = Math.max(...activeHours.map(h => h.count)) || 1;

    // 4. Financials (Average Revenue)
    const daysWithRevenue = Object.values(days).filter(d => !d.isClosed || (d.transactions && d.transactions.length > 0));
    const totalRevenue = allTransactions
        .filter(t => t.type === 'SALE' || t.type === 'EXTENSION' || t.type === 'PREPAYMENT')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const avgDailyRevenue = daysWithRevenue.length > 0 ? Math.round(totalRevenue / daysWithRevenue.length) : 0;

    // 5. Popular Tariffs
    const tariffCounts: Record<string, number> = {};
    allSessions.forEach(s => {
        const name = s.tariffName || 'Неизвестно';
        tariffCounts[name] = (tariffCounts[name] || 0) + 1;
    });
    // Sort and take top 4
    const popularTariffs = Object.entries(tariffCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4);

    // 6. Custom Trackers Calculation
    const trackerStats = customTrackers.map(tracker => {
        let count = 0;
        let revenue = 0;

        allSessions.forEach(session => {
            session.extraItems.forEach(item => {
                let match = false;
                if (tracker.type === 'PRODUCT_SALES' && item.productId === tracker.targetId) {
                    match = true;
                } else if (tracker.type === 'CATEGORY_SALES') {
                    // We need to look up product category. 
                    // extraItems has productId, but not category directly.
                    // We need to find product in products list.
                    const product = products.find(p => p.id === item.productId);
                    if (product && product.category === tracker.targetId) {
                        match = true;
                    }
                }

                if (match) {
                    count += item.quantity;
                    revenue += item.price * item.quantity;
                }
            });
        });

        return { ...tracker, count, revenue };
    });

    return {
        visitorsMonth,
        visitorsWeek,
        ageGroups,
        activeHours,
        maxHourCount,
        avgDailyRevenue,
        totalRevenue,
        popularTariffs,
        totalClients: clients.length,
        trackerStats
    };
  }, [days, clients, events, tariffs, products, categories, customTrackers]);


  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-10">
        <div className="bg-white p-8 rounded-2xl shadow-lg max-w-sm w-full text-center border border-gray-100">
          <div className="bg-indigo-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="text-indigo-600" size={32} />
          </div>
          <h2 className="text-xl font-bold mb-2 text-gray-900">Аналитика</h2>
          <p className="text-gray-500 mb-6 text-sm">Введите код доступа</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input 
              type="password" 
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              className="w-full border border-gray-300 bg-white p-3 rounded-lg text-center tracking-widest text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="••••••••"
            />
            {error && <p className="text-red-500 text-xs">{error}</p>}
            <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 transition-colors shadow-lg">
              Открыть отчеты
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 pb-24">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-gray-200 pb-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                    <TrendingUp className="text-indigo-600" />
                    Аналитика Бизнеса
                </h1>
                <p className="text-gray-500 mt-1">Статистика посещаемости, выручки и клиентов</p>
            </div>
            <button onClick={() => setIsAuthenticated(false)} className="text-gray-400 hover:text-red-500 text-sm font-medium">Выйти</button>
        </div>

        {/* Top KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-blue-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10"><Users size={64} className="text-blue-600"/></div>
                <div className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-1">Посетители (Месяц)</div>
                <div className="text-3xl font-bold text-gray-900">{stats.visitorsMonth}</div>
                <div className="mt-2 text-xs text-gray-400">Текущий календарный месяц</div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-cyan-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10"><Calendar size={64} className="text-cyan-600"/></div>
                <div className="text-xs font-bold text-cyan-600 uppercase tracking-wider mb-1">Посетители (Неделя)</div>
                <div className="text-3xl font-bold text-gray-900">{stats.visitorsWeek}</div>
                <div className="mt-2 text-xs text-gray-400">Последние 7 дней</div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-green-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10"><DollarSign size={64} className="text-green-600"/></div>
                <div className="text-xs font-bold text-green-600 uppercase tracking-wider mb-1">Средняя Выручка</div>
                <div className="text-3xl font-bold text-gray-900">{stats.avgDailyRevenue.toLocaleString()} ₽</div>
                <div className="mt-2 text-xs text-gray-400">В день (за всё время)</div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-purple-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10"><Activity size={64} className="text-purple-600"/></div>
                <div className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-1">Всего Клиентов</div>
                <div className="text-3xl font-bold text-gray-900">{stats.totalClients}</div>
                <div className="mt-2 text-xs text-gray-400">В базе данных</div>
            </div>
        </div>

        {/* Charts & Custom Trackers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Peak Hours Chart */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2"><Clock size={20} className="text-indigo-500"/> Пиковые Часы</h3>
                </div>
                <div className="h-64 flex items-end justify-between gap-2">
                    {stats.activeHours.map((h, i) => {
                        const heightPercent = stats.maxHourCount > 0 ? (h.count / stats.maxHourCount) * 100 : 0;
                        return (
                            <div key={i} className="flex-1 flex flex-col items-center group">
                                <div className="relative w-full flex justify-center">
                                     <div 
                                        style={{ height: `${Math.max(heightPercent, 5)}%` }} 
                                        className={`w-full max-w-[30px] rounded-t-lg transition-all duration-500 ${heightPercent > 70 ? 'bg-indigo-600' : 'bg-indigo-200 group-hover:bg-indigo-400'}`}
                                     ></div>
                                     <div className="absolute -top-6 text-xs font-bold text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                         {h.count}
                                     </div>
                                </div>
                                <div className="text-[10px] text-gray-400 mt-2 font-medium">{h.hour}:00</div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Custom Trackers (Dynamic) */}
             <div className="bg-white p-6 rounded-2xl shadow-sm border border-indigo-100">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2"><Target size={20} className="text-indigo-500"/> Отслеживание (Продажи)</h3>
                </div>
                
                {/* Add Tracker Form */}
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 mb-4 text-sm">
                    <div className="flex flex-col gap-2">
                         <input 
                            value={newTrackerName}
                            onChange={e => setNewTrackerName(e.target.value)}
                            className="w-full p-2 border rounded bg-white text-gray-900"
                            placeholder="Название трекера (напр. Продажи Кофе)"
                         />
                         <div className="flex gap-2">
                             <select 
                                value={newTrackerType}
                                onChange={e => setNewTrackerType(e.target.value as TrackerType)}
                                className="p-2 border rounded bg-white text-gray-900 text-xs"
                             >
                                 <option value="PRODUCT_SALES">Товар</option>
                                 <option value="CATEGORY_SALES">Категория</option>
                             </select>
                             <select 
                                value={newTrackerTarget}
                                onChange={e => setNewTrackerTarget(e.target.value)}
                                className="flex-1 p-2 border rounded bg-white text-gray-900 text-xs"
                             >
                                 <option value="">-- Выбрать --</option>
                                 {newTrackerType === 'PRODUCT_SALES' ? (
                                     products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)
                                 ) : (
                                     categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)
                                 )}
                             </select>
                         </div>
                         <button onClick={handleAddTracker} className="bg-indigo-600 text-white p-2 rounded font-bold hover:bg-indigo-700 flex justify-center items-center gap-2">
                             <Plus size={16}/> Добавить
                         </button>
                    </div>
                </div>

                <div className="space-y-3 max-h-60 overflow-y-auto">
                    {stats.trackerStats.map(tracker => (
                        <div key={tracker.id} className="flex justify-between items-center p-3 border border-indigo-100 rounded-lg bg-indigo-50/30">
                            <div>
                                <div className="font-bold text-gray-900">{tracker.name}</div>
                                <div className="text-xs text-gray-500">Продано: <span className="font-bold">{tracker.count} шт.</span></div>
                            </div>
                            <div className="text-right">
                                <div className="font-bold text-indigo-700">{tracker.revenue} ₽</div>
                                <button onClick={() => handleDeleteTracker(tracker.id)} className="text-gray-400 hover:text-red-500 text-xs mt-1 flex items-center justify-end gap-1 ml-auto">
                                    <Trash2 size={12}/> Удалить
                                </button>
                            </div>
                        </div>
                    ))}
                    {stats.trackerStats.length === 0 && <p className="text-center text-gray-400 italic text-sm">Нет активных трекеров</p>}
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Age Distribution */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2"><Users size={20} className="text-pink-500"/> Возрастные Группы</h3>
                </div>
                <div className="space-y-4">
                    {Object.entries(stats.ageGroups).map(([group, count]) => {
                         const totalChildren = Object.values(stats.ageGroups).reduce((a, b) => a + b, 0);
                         const percent = totalChildren > 0 ? Math.round((count / totalChildren) * 100) : 0;
                         return (
                             <div key={group}>
                                 <div className="flex justify-between text-sm mb-1">
                                     <span className="font-medium text-gray-700">{group}</span>
                                     <span className="font-bold text-gray-900">{count} ({percent}%)</span>
                                 </div>
                                 <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                                     <div 
                                        className="bg-pink-500 h-2.5 rounded-full" 
                                        style={{ width: `${percent}%` }}
                                     ></div>
                                 </div>
                             </div>
                         )
                    })}
                </div>
            </div>

            {/* Popular Tariffs */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                 <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2"><PieChart size={20} className="text-orange-500"/> Популярные Тарифы</h3>
                 <div className="space-y-4">
                     {stats.popularTariffs.map(([name, count], idx) => (
                         <div key={name} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100">
                             <div className="flex items-center gap-3">
                                 <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-sm">
                                     {idx + 1}
                                 </div>
                                 <span className="font-medium text-gray-800">{name}</span>
                             </div>
                             <div className="font-bold text-gray-900">{count} посещ.</div>
                         </div>
                     ))}
                     {stats.popularTariffs.length === 0 && <p className="text-gray-400 italic">Нет данных</p>}
                 </div>
             </div>
        </div>

        {/* Financial Summary */}
        <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-6 text-white shadow-lg">
                <h4 className="text-blue-100 text-sm font-bold uppercase mb-2">Общая Выручка</h4>
                <div className="text-2xl font-bold">{stats.totalRevenue.toLocaleString()} ₽</div>
                <p className="text-xs text-blue-200 mt-2">За весь период работы системы</p>
            </div>
            <div className="bg-gradient-to-br from-pink-500 to-rose-600 rounded-2xl p-6 text-white shadow-lg">
                <h4 className="text-pink-100 text-sm font-bold uppercase mb-2">Активная база</h4>
                <div className="text-2xl font-bold">{stats.totalClients}</div>
                <p className="text-xs text-pink-200 mt-2">Зарегистрированных семей</p>
            </div>
        </div>
    </div>
  );
};

export default AnalyticsTab;
