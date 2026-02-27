
import React, { useState } from 'react';
import { Administrator, ScheduleShift, CleaningLog, ImportantDocument, MiniGameSettings, AdminTask } from '../types';
import { ChevronLeft, ChevronRight, User, CheckCircle, Circle, Trash2, Sun, Moon, CalendarDays, ClipboardCheck, Clock, Sparkles, PlusCircle, FileText, ExternalLink, Info, Gamepad2, FileType, FileCheck, Link as LinkIcon, Download, ClipboardList, Check, X } from 'lucide-react';

interface AdminTabProps {
  administrators: Administrator[];
  schedule: ScheduleShift[];
  currentDayLog?: CleaningLog;
  currentDate: string;
  currentAdminName: string; // For logging cleaning
  documents: ImportantDocument[];
  miniGameSettings: MiniGameSettings;
  adminTasks: AdminTask[];
  onUpdateSchedule: (schedule: ScheduleShift[]) => void;
  onUpdateCleaning: (shift: 'morning' | 'evening' | 'current', isCompleted: boolean, adminName: string) => void;
  onCompleteTask: (id: string, adminName: string, comment: string) => void;
}

const AdminTab: React.FC<AdminTabProps> = ({ 
    administrators, schedule, currentDayLog, currentDate, currentAdminName, documents, miniGameSettings, adminTasks, onUpdateSchedule, onUpdateCleaning, onCompleteTask
}) => {
  
  // Calendar State
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showAddShiftModal, setShowAddShiftModal] = useState(false);
  const [newShiftAdminId, setNewShiftAdminId] = useState('');
  const [newShiftStartTime, setNewShiftStartTime] = useState('10:00');
  const [newShiftEndTime, setNewShiftEndTime] = useState('22:00');

  // Task Completion Modal State
  const [completingTask, setCompletingTask] = useState<AdminTask | null>(null);
  const [taskComment, setTaskComment] = useState('');

  // Calendar Logic
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay(); // 0 = Sun
    const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1; // Mon start
    return { days, firstDay: adjustedFirstDay };
  };

  const handleMonthChange = (increment: number) => {
    const newDate = new Date(calendarDate);
    newDate.setMonth(newDate.getMonth() + increment);
    setCalendarDate(newDate);
  };

  const monthStats = getDaysInMonth(calendarDate);
  const monthName = calendarDate.toLocaleString('ru-RU', { month: 'long', year: 'numeric' });

  const handleDayClick = (dateStr: string) => {
      setSelectedDate(dateStr);
      const firstActiveAdmin = administrators.find(a => a.isActive);
      setNewShiftAdminId(firstActiveAdmin?.id || '');
      setNewShiftStartTime('10:00');
      setNewShiftEndTime('22:00');
      setShowAddShiftModal(true);
  };

  const getShiftsForDate = (date: string) => {
      return schedule
        .filter(s => s.date === date)
        .slice()
        .sort((a, b) => {
            const aStart = a.startTime || '99:99';
            const bStart = b.startTime || '99:99';
            if (aStart !== bStart) return aStart.localeCompare(bStart);
            return a.adminName.localeCompare(b.adminName, 'ru');
        });
  };

  const formatShiftTime = (shift: ScheduleShift) => {
      if (!shift.startTime && !shift.endTime) return 'Без времени';
      if (!shift.startTime) return `до ${shift.endTime}`;
      if (!shift.endTime) return `с ${shift.startTime}`;
      return `${shift.startTime}–${shift.endTime}`;
  };

  const handleAddShift = () => {
      if (!selectedDate) return;
      const admin = administrators.find(a => a.id === newShiftAdminId);
      if (!admin) return;
      if (!newShiftStartTime || !newShiftEndTime) {
          alert('Укажите время начала и окончания смены.');
          return;
      }
      if (newShiftStartTime >= newShiftEndTime) {
          alert('Время окончания должно быть позже времени начала.');
          return;
      }

      const dayShifts = getShiftsForDate(selectedDate);
      const hasDuplicate = dayShifts.some(s => 
          s.adminId === admin.id && (s.startTime || '') === newShiftStartTime && (s.endTime || '') === newShiftEndTime
      );
      if (hasDuplicate) {
          alert('Такая смена уже добавлена на этот день.');
          return;
      }

      const newSchedule = [...schedule, {
          id: Date.now().toString(),
          date: selectedDate,
          adminId: admin.id,
          adminName: admin.name,
          startTime: newShiftStartTime,
          endTime: newShiftEndTime
      }];

      onUpdateSchedule(newSchedule);
  };

  const handleRemoveShift = (shiftId: string) => {
      onUpdateSchedule(schedule.filter(s => s.id !== shiftId));
  };

  const handleRemoveAllShifts = (date: string) => {
      onUpdateSchedule(schedule.filter(s => s.date !== date));
      setShowAddShiftModal(false);
  };

  // Cleaning Logic
  const toggleCleaning = (shift: 'morning' | 'evening') => {
      const isCompleted = currentDayLog?.[shift]?.isCompleted || false;
      onUpdateCleaning(shift, !isCompleted, currentAdminName);
  };

  const addCurrentCleaning = () => {
      onUpdateCleaning('current', true, currentAdminName);
  };

  // Task Logic
  const openCompleteTaskModal = (task: AdminTask) => {
      setCompletingTask(task);
      setTaskComment('');
  };

  const submitTaskCompletion = () => {
      if (completingTask) {
          onCompleteTask(completingTask.id, currentAdminName, taskComment);
          setCompletingTask(null);
          setTaskComment('');
      }
  };

  // Week Calculation
  const getWeekNumber = (d: Date) => {
      d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
      d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
      return weekNo;
  };

  const currentWeekNumber = getWeekNumber(new Date());
  const isEvenWeek = currentWeekNumber % 2 === 0;

  const activeTasks = adminTasks.filter(t => !t.isCompleted);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 pb-20">
       <header className="flex justify-between items-center border-b border-gray-200 pb-6">
           <div>
               <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                   <ClipboardCheck className="text-blue-600" size={32} />
                   Рабочее место Администратора
               </h1>
               <p className="text-gray-500 mt-1">Смена: <span className="font-bold text-gray-900">{currentDate}</span> • Админ: <span className="font-bold text-blue-600">{currentAdminName}</span></p>
           </div>
           <div className="text-right">
               <div className="text-sm font-bold text-gray-400 uppercase">Неделя №{currentWeekNumber}</div>
               <div className={`text-lg font-bold ${isEvenWeek ? 'text-green-600' : 'text-indigo-600'}`}>
                   {isEvenWeek ? 'Четная неделя' : 'Нечетная неделя'}
               </div>
           </div>
       </header>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           {/* Left Column: Tasks & Schedule */}
           <div className="space-y-8">
               {/* Owner Tasks Widget */}
               <div className="bg-white rounded-2xl shadow-sm border border-teal-100 overflow-hidden relative">
                   <div className="bg-teal-50 p-4 border-b border-teal-100 flex items-center justify-between font-bold text-teal-800">
                       <span className="flex items-center gap-2"><ClipboardList size={18}/> Задания от Владельца</span>
                       {activeTasks.length > 0 && (
                           <span className="bg-teal-200 text-teal-800 text-xs px-2 py-0.5 rounded-full">{activeTasks.length}</span>
                       )}
                   </div>
                   <div className="p-4 space-y-3">
                       {activeTasks.length === 0 ? (
                           <p className="text-center text-gray-400 text-sm py-4 italic">Все задания выполнены!</p>
                       ) : (
                           activeTasks.map(task => (
                               <div key={task.id} className="p-3 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                                   <div className="flex justify-between items-start mb-2">
                                       <span className="text-xs text-gray-400">{new Date(task.createdAt).toLocaleDateString()}</span>
                                   </div>
                                   <p className="text-sm font-medium text-gray-900 mb-3">{task.description}</p>
                                   <button 
                                       onClick={() => openCompleteTaskModal(task)}
                                       className="w-full py-1.5 bg-teal-50 text-teal-700 hover:bg-teal-100 rounded-lg text-xs font-bold border border-teal-100 flex items-center justify-center gap-1 transition-colors"
                                   >
                                       <Check size={14}/> Выполнить
                                   </button>
                               </div>
                           ))
                       )}
                   </div>
               </div>

               {/* Cleaning Checklist */}
               <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                   <div className="bg-gray-50 p-4 border-b border-gray-100 flex items-center gap-2 font-bold text-gray-700">
                       <Sparkles size={18} className="text-yellow-500"/> Контроль Чистоты
                   </div>
                   <div className="p-6 space-y-4">
                       {/* Morning */}
                       <div 
                           onClick={() => toggleCleaning('morning')}
                           className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between group ${currentDayLog?.morning.isCompleted ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-blue-300'}`}
                       >
                           <div className="flex items-center gap-3">
                               <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${currentDayLog?.morning.isCompleted ? 'border-green-500 bg-green-500 text-white' : 'border-gray-300 text-transparent'}`}>
                                   <CheckCircle size={16}/>
                               </div>
                               <div>
                                   <div className="font-bold text-gray-900 flex items-center gap-2"><Sun size={16} className="text-orange-400"/> Утро</div>
                                   <div className="text-xs text-gray-500">Открытие смены, проверка зала</div>
                               </div>
                           </div>
                           {currentDayLog?.morning.isCompleted && <span className="text-xs font-bold text-green-600">{currentDayLog.morning.completedBy}</span>}
                       </div>

                       {/* Current Checks */}
                       <div className="border-l-2 border-gray-200 pl-4 py-2 space-y-2">
                           <div className="text-xs font-bold text-gray-400 uppercase">Текущие проверки</div>
                           {currentDayLog?.current.map((log, idx) => (
                               <div key={idx} className="flex justify-between text-sm items-center bg-gray-50 p-2 rounded">
                                   <span className="text-gray-700">{new Date(log.timestamp || 0).toLocaleTimeString().slice(0,5)} — Уборка</span>
                                   <span className="text-xs font-bold text-gray-500">{log.completedBy}</span>
                               </div>
                           ))}
                           <button onClick={addCurrentCleaning} className="w-full py-2 border border-dashed border-blue-300 text-blue-600 rounded-lg text-sm font-bold hover:bg-blue-50 flex items-center justify-center gap-2">
                               <PlusCircle size={16}/> Отметить уборку
                           </button>
                       </div>

                       {/* Evening */}
                       <div 
                           onClick={() => toggleCleaning('evening')}
                           className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between group ${currentDayLog?.evening.isCompleted ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-blue-300'}`}
                       >
                           <div className="flex items-center gap-3">
                               <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${currentDayLog?.evening.isCompleted ? 'border-green-500 bg-green-500 text-white' : 'border-gray-300 text-transparent'}`}>
                                   <CheckCircle size={16}/>
                               </div>
                               <div>
                                   <div className="font-bold text-gray-900 flex items-center gap-2"><Moon size={16} className="text-indigo-400"/> Вечер</div>
                                   <div className="text-xs text-gray-500">Закрытие смены, уборка игрушек</div>
                               </div>
                           </div>
                           {currentDayLog?.evening.isCompleted && <span className="text-xs font-bold text-green-600">{currentDayLog.evening.completedBy}</span>}
                       </div>
                   </div>
               </div>
               
               {/* Documents Section */}
               <div className="bg-white rounded-2xl shadow-sm border border-yellow-100 overflow-hidden">
                   <div className="bg-yellow-50 p-4 border-b border-yellow-100 flex items-center gap-2 font-bold text-yellow-800">
                       <Info size={18}/> Важная Информация
                   </div>
                   <div className="p-4 space-y-2">
                       {documents.map(doc => (
                           <a 
                               key={doc.id} 
                               href={doc.url} 
                               target="_blank" 
                               rel="noreferrer"
                               download={doc.url.startsWith('data:') ? doc.title : undefined}
                               className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 hover:shadow-sm transition-all group"
                           >
                               <div className={`p-2 rounded-lg ${doc.type === 'WORD' ? 'bg-blue-100 text-blue-600' : doc.type === 'GOOGLE' ? 'bg-yellow-100 text-yellow-600' : doc.type === 'PDF' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
                                  {doc.type === 'WORD' ? <FileType size={20}/> : doc.type === 'PDF' ? <FileText size={20}/> : <FileCheck size={20}/>}
                               </div>
                               <div className="flex-1 overflow-hidden">
                                   <div className="font-bold text-gray-900 truncate group-hover:text-blue-600 transition-colors">{doc.title}</div>
                                   <div className="text-xs text-gray-400 truncate">{doc.type}</div>
                               </div>
                               <ExternalLink size={16} className="text-gray-300 group-hover:text-blue-400"/>
                           </a>
                       ))}
                       {documents.length === 0 && <p className="text-center text-gray-400 py-4 text-sm">Нет документов</p>}
                   </div>
               </div>
           </div>

           {/* Center & Right: Games & Schedule */}
           <div className="lg:col-span-2 space-y-8">
               {/* Mini Games Card */}
               <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                   <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                       <div>
                           <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                               <Gamepad2 size={24} className="text-indigo-600"/> 
                               Развивающие Игры
                           </h2>
                           <p className="text-gray-600 text-sm mt-1">
                               Текущая неделя: <span className={isEvenWeek ? 'text-green-600 font-bold' : 'text-indigo-600 font-bold'}>{currentWeekNumber} ({isEvenWeek ? 'Четная' : 'Нечетная'})</span>
                           </p>
                       </div>
                   </div>
                   <div className="p-6">
                       {/* Prominent Memo/Instruction Download Section */}
                       {miniGameSettings.memoUrl && (
                           <div className="mb-6 bg-white p-4 rounded-xl border border-blue-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2">
                               <div className="flex items-center gap-4">
                                    <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center text-blue-600 shrink-0">
                                        {miniGameSettings.memoUrl.startsWith('data:') ? <FileText size={24}/> : <LinkIcon size={24}/>}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900 text-sm md:text-base leading-tight">
                                            {miniGameSettings.memoName || "Инструкция / План занятий"}
                                        </h3>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {miniGameSettings.memoUrl.startsWith('data:') ? 'Загруженный файл (План игр)' : 'Ссылка на ресурс'}
                                        </p>
                                    </div>
                               </div>
                               <a 
                                 href={miniGameSettings.memoUrl} 
                                 target="_blank"
                                 rel="noreferrer"
                                 download={miniGameSettings.memoUrl.startsWith('data:') ? (miniGameSettings.memoName || "Plan_Igr") : undefined}
                                 className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-bold text-sm shadow-md transition-transform active:scale-95 flex items-center justify-center gap-2 shrink-0"
                               >
                                   {miniGameSettings.memoUrl.startsWith('data:') ? <Download size={18}/> : <ExternalLink size={18}/>}
                                   <span>
                                       {miniGameSettings.memoUrl.startsWith('data:') ? 'Скачать файл' : 'Открыть ссылку'}
                                   </span>
                               </a>
                           </div>
                       )}

                       <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Odd Week Column */}
                           <div className={`rounded-xl border-2 p-4 ${!isEvenWeek ? 'border-indigo-400 ring-4 ring-indigo-50 bg-indigo-50/20' : 'border-gray-200 bg-gray-50/50'}`}>
                                <h3 className={`font-bold text-lg mb-4 flex items-center gap-2 ${!isEvenWeek ? 'text-indigo-700' : 'text-gray-500'}`}>
                                    {!isEvenWeek && <CheckCircle size={18}/>} Нечетная неделя
                                </h3>
                                <div className="space-y-3">
                                    {miniGameSettings.oddWeekGames.map((game, idx) => (
                                        <div key={idx} className="bg-white p-3 rounded-lg shadow-sm border border-gray-100 flex items-center gap-3">
                                            <div className="font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded text-sm">
                                                {game.time}
                                            </div>
                                            <div className="font-medium text-gray-800 text-sm">{game.activity}</div>
                                        </div>
                                    ))}
                                    {miniGameSettings.oddWeekGames.length === 0 && <p className="text-gray-400 italic text-sm">Нет игр</p>}
                                </div>
                           </div>

                           {/* Even Week Column */}
                           <div className={`rounded-xl border-2 p-4 ${isEvenWeek ? 'border-green-400 ring-4 ring-green-50 bg-green-50/20' : 'border-gray-200 bg-gray-50/50'}`}>
                                <h3 className={`font-bold text-lg mb-4 flex items-center gap-2 ${isEvenWeek ? 'text-green-700' : 'text-gray-500'}`}>
                                    {isEvenWeek && <CheckCircle size={18}/>} Четная неделя
                                </h3>
                                <div className="space-y-3">
                                    {miniGameSettings.evenWeekGames.map((game, idx) => (
                                        <div key={idx} className="bg-white p-3 rounded-lg shadow-sm border border-gray-100 flex items-center gap-3">
                                            <div className="font-mono font-bold text-green-600 bg-green-50 px-2 py-1 rounded text-sm">
                                                {game.time}
                                            </div>
                                            <div className="font-medium text-gray-800 text-sm">{game.activity}</div>
                                        </div>
                                    ))}
                                    {miniGameSettings.evenWeekGames.length === 0 && <p className="text-gray-400 italic text-sm">Нет игр</p>}
                                </div>
                           </div>
                       </div>
                   </div>
               </div>

               {/* Schedule Calendar */}
               <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                   <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                       <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><CalendarDays size={20} /> График Смен</h2>
                       <div className="flex items-center gap-4 bg-white rounded-lg px-2 py-1 border border-gray-200">
                           <button onClick={() => handleMonthChange(-1)} className="p-1 hover:bg-gray-100 rounded-full"><ChevronLeft size={20}/></button>
                           <span className="font-bold text-gray-700 w-32 text-center capitalize">{monthName}</span>
                           <button onClick={() => handleMonthChange(1)} className="p-1 hover:bg-gray-100 rounded-full"><ChevronRight size={20}/></button>
                       </div>
                   </div>
                   <div className="p-6">
                       <div className="grid grid-cols-7 gap-2 text-center mb-2">
                           {['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(d => <div key={d} className="text-xs font-bold text-gray-400">{d}</div>)}
                       </div>
                       <div className="grid grid-cols-7 gap-2">
                           {Array(monthStats.firstDay).fill(null).map((_, i) => <div key={`empty-${i}`} />)}
                           {Array(monthStats.days).fill(null).map((_, i) => {
                               const d = i + 1;
                               const localDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), d);
                               const dateStr = localDate.toLocaleDateString('en-CA');
                               const dayShifts = getShiftsForDate(dateStr);
                               const isToday = dateStr === new Date().toISOString().slice(0,10);

                               return (
                                   <div 
                                       key={d}
                                       onClick={() => handleDayClick(dateStr)}
                                       className={`min-h-[92px] rounded-xl border transition-all cursor-pointer relative p-2 flex flex-col items-start justify-between hover:shadow-md ${dayShifts.length > 0 ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-100 hover:border-blue-200'} ${isToday ? 'ring-2 ring-blue-500' : ''}`}
                                   >
                                       <span className={`text-sm font-bold ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>{d}</span>
                                       {dayShifts.length > 0 && (
                                           <div className="mt-1 w-full space-y-1">
                                               {dayShifts.slice(0, 2).map(shift => (
                                                   <div key={shift.id} className="bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-[10px] shadow-sm border border-blue-100 w-full">
                                                       <div className="font-bold text-blue-800 truncate">{shift.adminName}</div>
                                                       <div className="text-blue-500 truncate">{formatShiftTime(shift)}</div>
                                                   </div>
                                               ))}
                                               {dayShifts.length > 2 && (
                                                   <div className="text-[10px] font-bold text-blue-600 px-1">
                                                       +{dayShifts.length - 2} еще
                                                   </div>
                                               )}
                                           </div>
                                       )}
                                       {dayShifts.length === 0 && (
                                           <div className="mt-auto self-center opacity-0 hover:opacity-100 text-blue-300">
                                               <PlusCircle size={20}/>
                                           </div>
                                       )}
                                   </div>
                               );
                           })}
                       </div>
                   </div>
               </div>
           </div>
       </div>

       {/* Add Shift Modal */}
       {showAddShiftModal && selectedDate && (
           <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
               <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
                   <h3 className="text-lg font-bold text-gray-900 mb-4">Смена: {new Date(selectedDate).toLocaleDateString()}</h3>
                   <div className="space-y-4">
                       <div className="bg-gray-50 rounded-xl border border-gray-100 p-3">
                           <div className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-2">
                               <Clock size={14}/> Назначенные смены
                           </div>
                           <div className="space-y-2 max-h-56 overflow-y-auto">
                               {getShiftsForDate(selectedDate).length === 0 && (
                                   <div className="text-sm text-gray-400 italic text-center py-3">На этот день смены не назначены</div>
                               )}
                               {getShiftsForDate(selectedDate).map(shift => (
                                   <div key={shift.id} className="flex items-center gap-2 p-2 rounded-lg bg-white border border-gray-200">
                                       <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm shrink-0">
                                           {shift.adminName.charAt(0)}
                                       </div>
                                       <div className="min-w-0 flex-1">
                                           <div className="font-bold text-sm text-gray-800 truncate">{shift.adminName}</div>
                                           <div className="text-xs text-gray-500">{formatShiftTime(shift)}</div>
                                       </div>
                                       <button
                                           type="button"
                                           onClick={() => handleRemoveShift(shift.id)}
                                           className="p-2 rounded-lg text-red-500 hover:bg-red-50"
                                           title="Удалить смену"
                                       >
                                           <Trash2 size={16}/>
                                       </button>
                                   </div>
                               ))}
                           </div>
                       </div>

                       <div className="border border-blue-100 bg-blue-50/50 rounded-xl p-3 space-y-3">
                           <div className="text-xs font-bold text-blue-600 uppercase">Добавить смену</div>
                           <div>
                               <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Администратор</label>
                               <select
                                   value={newShiftAdminId}
                                   onChange={(e) => setNewShiftAdminId(e.target.value)}
                                   className="w-full p-2.5 rounded-lg border border-gray-200 bg-white text-gray-900"
                               >
                                   <option value="">Выберите администратора</option>
                                   {administrators.filter(a => a.isActive).map(admin => (
                                       <option key={admin.id} value={admin.id}>{admin.name}</option>
                                   ))}
                               </select>
                           </div>
                           <div className="grid grid-cols-2 gap-3">
                               <div>
                                   <label className="block text-xs font-bold text-gray-500 uppercase mb-1">С</label>
                                   <input
                                       type="time"
                                       value={newShiftStartTime}
                                       onChange={(e) => setNewShiftStartTime(e.target.value)}
                                       className="w-full p-2.5 rounded-lg border border-gray-200 bg-white text-gray-900"
                                   />
                               </div>
                               <div>
                                   <label className="block text-xs font-bold text-gray-500 uppercase mb-1">До</label>
                                   <input
                                       type="time"
                                       value={newShiftEndTime}
                                       onChange={(e) => setNewShiftEndTime(e.target.value)}
                                       className="w-full p-2.5 rounded-lg border border-gray-200 bg-white text-gray-900"
                                   />
                               </div>
                           </div>
                           <button 
                               type="button"
                               onClick={handleAddShift}
                               className="w-full p-3 rounded-lg border border-blue-200 bg-blue-600 text-white hover:bg-blue-700 font-bold flex items-center justify-center gap-2"
                           >
                               <PlusCircle size={18}/> Добавить смену
                           </button>
                       </div>

                       {getShiftsForDate(selectedDate).length > 0 && (
                           <button 
                               onClick={() => handleRemoveAllShifts(selectedDate)}
                               className="w-full p-3 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 font-bold flex items-center justify-center gap-2"
                           >
                               <Trash2 size={18}/> Очистить день
                           </button>
                       )}
                       {administrators.filter(a => a.isActive).length === 0 && (
                           <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-3">
                               Нет активных администраторов для назначения.
                           </p>
                       )}
                   </div>
                   <button onClick={() => setShowAddShiftModal(false)} className="w-full mt-4 py-2 text-gray-500 font-medium hover:text-gray-700">Отмена</button>
               </div>
           </div>
       )}

       {/* Complete Task Modal */}
       {completingTask && (
           <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
               <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 animate-in zoom-in-95 duration-200">
                   <div className="flex justify-between items-center mb-4">
                       <h3 className="text-lg font-bold text-teal-800">Выполнить задание</h3>
                       <button onClick={() => setCompletingTask(null)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
                   </div>
                   <div className="bg-gray-50 p-3 rounded-lg mb-4 text-sm text-gray-800 border border-gray-200">
                       {completingTask.description}
                   </div>
                   <div>
                       <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Комментарий (необязательно)</label>
                       <textarea 
                           value={taskComment}
                           onChange={e => setTaskComment(e.target.value)}
                           className="w-full border border-gray-300 p-2 rounded text-sm bg-white text-gray-900 h-24 resize-none"
                           placeholder="Например: Сделано, но осталось мало..."
                       />
                   </div>
                   <button 
                       onClick={submitTaskCompletion}
                       className="w-full mt-4 bg-teal-600 text-white font-bold py-2 rounded-lg hover:bg-teal-700 transition-colors"
                   >
                       Подтвердить выполнение
                   </button>
               </div>
           </div>
       )}
    </div>
  );
};

export default AdminTab;
