
import React from 'react';
import { Tariff, Product, BirthdayRateSettings, Category } from '../types';
import { Coffee, Clock, PartyPopper, Box, Tag } from 'lucide-react';

interface GoodsTabProps {
  tariffs: Tariff[];
  products: Product[];
  categories: Category[];
  birthdayRates: BirthdayRateSettings;
  extensionRate: number;
}

const GoodsTab: React.FC<GoodsTabProps> = ({ tariffs, products, categories, birthdayRates, extensionRate }) => {
  
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 pb-20">
       {/* Section 1: Rentals & Tariffs */}
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Game Room Pricing */}
          <div className="bg-white rounded-2xl shadow-sm border border-blue-100 overflow-hidden">
             <div className="bg-blue-50 p-4 border-b border-blue-100 flex items-center gap-2">
                <Clock className="text-blue-600" />
                <h2 className="text-lg font-bold text-blue-900">Игровая Комната</h2>
             </div>
             <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {tariffs.map(t => (
                        <div key={t.id} className="border border-blue-100 rounded-xl p-4 flex flex-col justify-between bg-white hover:shadow-md transition-shadow">
                            <span className="text-gray-500 text-xs font-bold uppercase tracking-wider">{t.durationMinutes === 0 ? 'Безлимит' : `${t.durationMinutes} минут`}</span>
                            <div className="flex justify-between items-end mt-2">
                                <span className="font-bold text-gray-900 text-lg">{t.name}</span>
                                <span className="font-bold text-blue-600 text-xl">{t.price} ₽</span>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center text-sm">
                    <span className="text-gray-600">Продление времени:</span>
                    <span className="font-bold text-gray-900">{extensionRate} ₽ / мин</span>
                </div>
             </div>
          </div>

          {/* Birthday Pricing */}
          <div className="bg-white rounded-2xl shadow-sm border border-pink-100 overflow-hidden">
             <div className="bg-pink-50 p-4 border-b border-pink-100 flex items-center gap-2">
                <PartyPopper className="text-pink-600" />
                <h2 className="text-lg font-bold text-pink-900">Праздники и Дни Рождения</h2>
             </div>
             <div className="p-6">
                 <div className="grid grid-cols-2 gap-6">
                     <div>
                         <h3 className="text-sm font-bold text-gray-500 uppercase mb-3 text-center">Будние дни</h3>
                         <div className="space-y-3">
                             <div className="bg-pink-50/50 p-3 rounded-lg text-center border border-pink-100">
                                 <div className="text-xs text-gray-400">Аренда комнаты (2ч)</div>
                                 <div className="font-bold text-pink-700 text-lg">{birthdayRates.weekday.room2h} ₽</div>
                             </div>
                             <div className="bg-pink-50/50 p-3 rounded-lg text-center border border-pink-100">
                                 <div className="text-xs text-gray-400">Игровая зона (1ч/реб)</div>
                                 <div className="font-bold text-pink-700 text-lg">{birthdayRates.weekday.zone1h} ₽</div>
                             </div>
                         </div>
                     </div>
                     <div>
                         <h3 className="text-sm font-bold text-gray-500 uppercase mb-3 text-center">Выходные</h3>
                         <div className="space-y-3">
                             <div className="bg-purple-50/50 p-3 rounded-lg text-center border border-purple-100">
                                 <div className="text-xs text-gray-400">Аренда комнаты (2ч)</div>
                                 <div className="font-bold text-purple-700 text-lg">{birthdayRates.weekend.room2h} ₽</div>
                             </div>
                             <div className="bg-purple-50/50 p-3 rounded-lg text-center border border-purple-100">
                                 <div className="text-xs text-gray-400">Игровая зона (1ч/реб)</div>
                                 <div className="font-bold text-purple-700 text-lg">{birthdayRates.weekend.zone1h} ₽</div>
                             </div>
                         </div>
                     </div>
                 </div>
             </div>
          </div>
       </div>

       {/* Section 2: Goods & Services - Dynamic Rendering */}
       <div className="space-y-6">
           <div className="flex items-center gap-2 mb-4">
                <Coffee className="text-orange-500" />
                <h2 className="text-2xl font-bold text-gray-900">Товары и Услуги</h2>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {categories.map(cat => {
                   const catProducts = products.filter(p => p.category === cat.id);
                   if (catProducts.length === 0) return null; // Hide empty categories in view

                   return (
                       <ProductCard 
                          key={cat.id}
                          category={cat.name} 
                          items={catProducts} 
                          icon={<Tag size={20} className="text-gray-500"/>} 
                          color="gray" // Generic color, could be randomized or mapped
                       />
                   );
               })}
           </div>
           
           {products.length === 0 && (
               <div className="text-center py-10 text-gray-400 italic">
                   Товары не добавлены
               </div>
           )}
       </div>
    </div>
  );
};

const ProductCard = ({ category, items, icon, color }: any) => (
    <div className={`bg-white rounded-xl shadow-sm border border-${color}-100 overflow-hidden h-full`}>
        <div className={`bg-gray-50 p-4 border-b border-gray-100 flex items-center gap-2 font-bold text-gray-900`}>
            {icon} {category}
        </div>
        <div className="p-2">
            <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-50">
                    {items.map((p: Product) => (
                        <tr key={p.id} className="hover:bg-gray-50">
                            <td className="p-3 text-gray-700">{p.name}</td>
                            <td className="p-3 text-right font-bold text-gray-900">{p.price} ₽</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
)

export default GoodsTab;
