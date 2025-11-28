import React, { useState } from 'react';
import { Client, Child, FeedbackType } from '../types';
import { Users, Search, Plus, Trash2, Edit2, Phone, ExternalLink, User, X, CreditCard, Check, BookUser, Calendar, Cake, Baby, School, Backpack, Filter, MessageSquareWarning, Lightbulb, Send } from 'lucide-react';

interface ClientsTabProps {
  clients: Client[];
  onUpdateClients: (clients: Client[]) => void;
  onDeleteClient: (id: string) => void;
  onIssueCard: (clientId: string) => void;
  onAddFeedback: (type: FeedbackType, content: string) => void;
}

// Age Filter Types
type AgeFilterType = 'ALL' | '0-1' | '2-3' | '4-6' | '7+';

const ClientsTab: React.FC<ClientsTabProps> = ({ clients, onUpdateClients, onDeleteClient, onIssueCard, onAddFeedback }) => {
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

  const handleSave = (e: React.FormEvent) => {
      e.preventDefault();
      
      const clientData: Client = {
          id: editingClient ? editingClient.id : Date.now().toString(),
          name,
          phone,
          socialMedia,
          children: childrenList,
          notes,
          registrationDate: editingClient ? editingClient.registrationDate : new Date().toISOString().slice(0, 10),
          bonusCardNumber: editingClient ? editingClient.bonusCardNumber : undefined,
          bonusBalance: editingClient ? editingClient.bonusBalance : undefined,
          isAddedToContacts: editingClient ? editingClient.isAddedToContacts : false
      };

      if (editingClient) {
          onUpdateClients(clients.map(c => c.id === editingClient.id ? clientData : c));
      } else {
          onUpdateClients([...clients, clientData]);
      }
      setIsModalOpen(false);
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
                                        <div className="text-2xl font-bold">{client.bonusBalance} Б</div>
                                        <div className="text-[10px] opacity-80">Баланс баллов</div>
                                    </div>
                                </div>
                            ) : (
                                <button 
                                    onClick={() => onIssueCard(client.id)}
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
