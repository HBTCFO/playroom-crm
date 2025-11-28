import React, { useState } from 'react';
import { CalendarEvent } from '../types';
import { Calendar, Gift, Sparkles, User, Phone, Users } from 'lucide-react';
import { generateBirthdayWish } from '../services/geminiService';

interface BirthdaysTabProps {
  birthdays: CalendarEvent[];
  onAddBooking: (booking: CalendarEvent) => void;
}

const BirthdaysTab: React.FC<BirthdaysTabProps> = ({ birthdays, onAddBooking }) => {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [showForm, setShowForm] = useState(false);
  
  // Form Data
  const [parentName, setParentName] = useState('');
  const [childName, setChildName] = useState('');
  const [phone, setPhone] = useState('');
  const [childCount, setChildCount] = useState(5);
  const [wishes, setWishes] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const bookingsOnDate = birthdays.filter(b => b.date === selectedDate && b.type === 'BIRTHDAY');

  const handleGenerateWish = async () => {
    if (!childName) return;
    setIsGenerating(true);
    const wish = await generateBirthdayWish(childName);
    setWishes(wish);
    setIsGenerating(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddBooking({
      id: Date.now().toString(),
      type: 'BIRTHDAY',
      status: 'SCHEDULED',
      date: selectedDate,
      parentName,
      childName,
      phone,
      childCount,
      wishes,
      aiWishSuggestion: wishes,
      prepayment: 0
    });
    setShowForm(false);
    setParentName('');
    setChildName('');
    setPhone('');
    setWishes('');
    setChildCount(5);
  };

  return (
    <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      {/* Calendar Side */}
      <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm h-fit border border-pink-100">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-900">
            <Calendar className="text-pink-500" />
            Календарь
        </h2>
        <div className="mb-4">
            <input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full p-3 border-2 border-pink-200 rounded-lg text-lg font-medium text-gray-900 bg-white focus:border-pink-400 outline-none"
            />
        </div>
        <div className="mt-6">
            <h3 className="font-semibold text-gray-500 text-sm uppercase tracking-wider mb-3">События на этот день</h3>
            {bookingsOnDate.length === 0 ? (
                <p className="text-gray-400 text-sm italic">Нет запланированных праздников</p>
            ) : (
                <div className="space-y-3">
                    {bookingsOnDate.map(b => (
                        <div key={b.id} className="bg-pink-50 border border-pink-100 p-3 rounded-lg shadow-sm">
                            <div className="flex justify-between font-bold text-pink-800">
                                <span>{b.childName}</span>
                                <span className="text-xs bg-white text-pink-600 border border-pink-200 px-2 py-0.5 rounded-full flex items-center">{b.childCount} чел.</span>
                            </div>
                            <p className="text-xs text-pink-600 mt-1">{b.parentName} • {b.phone}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
        
        <button 
            onClick={() => setShowForm(true)}
            className="w-full mt-6 bg-pink-500 hover:bg-pink-600 text-white font-bold py-3 rounded-lg shadow-md flex items-center justify-center gap-2 transition-all"
        >
            <Gift size={20} />
            Забронировать
        </button>
      </div>

      {/* Details / Form Side */}
      <div className="lg:col-span-2">
        {showForm ? (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-6 border-b pb-4">
                    <h2 className="text-2xl font-bold text-gray-900">Бронирование праздника</h2>
                    <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 font-medium">Отмена</button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Имя именинника</label>
                            <div className="relative">
                                <User className="absolute left-3 top-3 text-gray-400" size={18}/>
                                <input required value={childName} onChange={e => setChildName(e.target.value)} className="pl-10 w-full border border-gray-300 bg-white p-2.5 rounded-lg text-gray-900 focus:ring-2 focus:ring-pink-300 outline-none" placeholder="Имя ребенка" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Родитель</label>
                            <div className="relative">
                                <User className="absolute left-3 top-3 text-gray-400" size={18}/>
                                <input required value={parentName} onChange={e => setParentName(e.target.value)} className="pl-10 w-full border border-gray-300 bg-white p-2.5 rounded-lg text-gray-900 focus:ring-2 focus:ring-pink-300 outline-none" placeholder="Имя родителя" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Телефон</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-3 text-gray-400" size={18}/>
                                <input required value={phone} onChange={e => setPhone(e.target.value)} className="pl-10 w-full border border-gray-300 bg-white p-2.5 rounded-lg text-gray-900 focus:ring-2 focus:ring-pink-300 outline-none" placeholder="+7 (999) 000-00-00" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Количество детей</label>
                            <div className="relative">
                                <Users className="absolute left-3 top-3 text-gray-400" size={18}/>
                                <input type="number" required min="1" value={childCount} onChange={e => setChildCount(parseInt(e.target.value))} className="pl-10 w-full border border-gray-300 bg-white p-2.5 rounded-lg text-gray-900 focus:ring-2 focus:ring-pink-300 outline-none" />
                            </div>
                        </div>
                    </div>
                    
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-sm font-medium text-gray-700">Пожелания / Заметки</label>
                            <button 
                                type="button"
                                onClick={handleGenerateWish}
                                disabled={!childName || isGenerating}
                                className="text-xs flex items-center gap-1 text-purple-600 hover:text-purple-800 font-semibold disabled:opacity-50"
                            >
                                <Sparkles size={14} />
                                {isGenerating ? 'Генерация...' : 'AI Поздравление'}
                            </button>
                        </div>
                        <textarea 
                            value={wishes} 
                            onChange={e => setWishes(e.target.value)} 
                            className="w-full border border-gray-300 bg-white p-3 rounded-lg h-32 resize-none focus:ring-2 focus:ring-pink-200 outline-none text-gray-900"
                            placeholder="Особые пожелания, аллергии, тема праздника..."
                        />
                        <p className="text-xs text-gray-400 mt-1">Нажмите "AI Поздравление", чтобы сгенерировать текст открытки.</p>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button type="submit" className="bg-pink-500 hover:bg-pink-600 text-white font-bold py-3 px-8 rounded-lg shadow-lg transition-transform active:scale-95">
                            Сохранить
                        </button>
                    </div>
                </form>
            </div>
        ) : (
            <div className="bg-white rounded-xl shadow-sm p-10 flex flex-col items-center justify-center h-full text-gray-400 border-2 border-dashed border-pink-200">
                <Gift size={64} className="text-pink-200 mb-4" />
                <p className="text-lg font-medium text-gray-600">Выберите дату слева, чтобы посмотреть расписание</p>
                <p>Или нажмите "Забронировать", чтобы создать праздник</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default BirthdaysTab;