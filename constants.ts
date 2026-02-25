
import { Tariff, Product, Discount, BirthdayRateSettings, StaffAnimator, Category, Partner, Administrator, Client, MiniGameSettings, SubscriptionPlan } from './types';

export const DEFAULT_TARIFFS: Tariff[] = [
  { id: 't1', name: '30 Минут', durationMinutes: 30, price: 300 },
  { id: 't2', name: '1 Час', durationMinutes: 60, price: 500 },
  { id: 't3', name: 'Безлимит', durationMinutes: 0, price: 1200 },
];

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'DRINK', name: 'Напитки' },
  { id: 'SNACK', name: 'Снеки и Еда' },
  { id: 'SERVICE', name: 'Услуги' },
  { id: 'RENTAL', name: 'Аренда' },
  { id: 'OTHER', name: 'Прочее' }
];

export const DEFAULT_PRODUCTS: Product[] = [
  { id: 'p1', name: 'Вода 0.5л', price: 100, category: 'DRINK' },
  { id: 'p2', name: 'Сок 0.2л', price: 150, category: 'DRINK' },
  { id: 'p3', name: 'Чай / Кофе', price: 100, category: 'DRINK' },
  { id: 'p4', name: 'Шоколад', price: 150, category: 'SNACK' },
  { id: 'p5', name: 'Чипсы', price: 200, category: 'SNACK' },
  { id: 'p6', name: 'Носки', price: 150, category: 'OTHER' },
  { id: 'p7', name: 'Аренда Фотозоны', price: 1500, category: 'RENTAL' },
  { id: 'p8', name: 'Гелиевый Шар', price: 150, category: 'SERVICE' },
];

export const DEFAULT_DISCOUNTS: Discount[] = [
  { id: 'd1', name: 'Купон' },
  { id: 'd2', name: 'Многодетная семья' },
  { id: 'd3', name: 'Утренняя скидка' },
  { id: 'd4', name: 'Друг владельца' },
];

export const DEFAULT_PARTNERS: Partner[] = [
  { id: 'pt1', name: 'Агентство "Праздник"', type: 'ANIMATOR', phone: '8-900-111-22-33' },
  { id: 'pt2', name: 'Шоу Мыльных Пузырей', type: 'ANIMATOR', phone: '8-900-444-55-66' },
];

export const DEFAULT_ADMINISTRATORS: Administrator[] = [
  { id: 'adm1', name: 'Мария', isActive: true },
  { id: 'adm2', name: 'Ольга', isActive: true },
];

export const DEFAULT_CLIENTS: Client[] = [
  { 
    id: 'c1', 
    name: 'Елена Иванова', 
    phone: '8-900-123-45-67', 
    socialMedia: '@elena_iva', 
    children: [{ id: 'ch1', name: 'Миша', dob: '2019-05-15' }], 
    registrationDate: '2023-10-01', 
    notes: 'Любит кофе, приходит по утрам', 
    bonusCardNumber: '1001', 
    bonusBalance: 150 
  },
  { 
    id: 'c2', 
    name: 'Сергей Петров', 
    phone: '8-900-987-65-43', 
    socialMedia: '', 
    children: [
        { id: 'ch2', name: 'Аня', dob: '2021-03-10' }, 
        { id: 'ch3', name: 'Ваня', dob: '2018-08-20' }
    ], 
    registrationDate: '2023-11-15',
    bonusCardNumber: '1002',
    bonusBalance: 0
  },
  { 
    id: 'c3', 
    name: 'Анна Смирнова', 
    phone: '8-911-555-44-33', 
    socialMedia: 'vk.com/anna_smir', 
    children: [{ id: 'ch4', name: 'София', dob: '2020-12-05' }], 
    registrationDate: '2023-12-05', 
    notes: 'Аллергия на орехи у ребенка', 
    bonusCardNumber: '1003', 
    bonusBalance: 500 
  }
];

export const DEFAULT_MINI_GAME_SETTINGS: MiniGameSettings = {
    memoUrl: '',
    memoName: '',
    oddWeekGames: [
        { time: '10:00', activity: 'Утренняя зарядка' },
        { time: '12:00', activity: 'Рисование' },
        { time: '14:00', activity: 'Аппликация' },
        { time: '16:00', activity: 'Лепка' },
        { time: '18:00', activity: 'Танцы' },
    ],
    evenWeekGames: [
        { time: '10:00', activity: 'Музыкальная разминка' },
        { time: '12:00', activity: 'Конструктор' },
        { time: '14:00', activity: 'Чтение сказок' },
        { time: '16:00', activity: 'Кинетический песок' },
        { time: '18:00', activity: 'Дискотека' },
    ]
};

export const DEFAULT_SUBSCRIPTION_PLANS: SubscriptionPlan[] = [];

export const DEFAULT_EXTENSION_RATE = 10; // Rubles per minute

export const OWNER_PASSWORD = import.meta.env.VITE_OWNER_PASSWORD || '';
export const DEFAULT_STAFF_PASSWORD = import.meta.env.VITE_DEFAULT_STAFF_PASSWORD || '';

export const DEFAULT_BIRTHDAY_RATES: BirthdayRateSettings = {
  weekday: {
    room2h: 1500, // Price for 2 hours of room
    zone1h: 100   // Price per hour per child for game zone
  },
  weekend: {
    room2h: 2000,
    zone1h: 150
  }
};

export const DEFAULT_STAFF_ANIMATORS: StaffAnimator[] = [
  { 
    id: 'sa1', 
    name: 'Катя', 
    roles: ['Козочка', 'Принцесса', 'Пират'], 
    defaultPrice: 3000 
  },
  { 
    id: 'sa2', 
    name: 'Анна', 
    roles: ['Эльза', 'Барби', 'Уэнсдей'], 
    defaultPrice: 3500 
  }
];

export const DEFAULT_BONUS_PERCENTAGE = 20; // 20% cashback
