export enum PaymentMethod {
  CASH = 'Наличные',
  CARD = 'Карта',
  BONUS = 'Бонусы'
}

export enum TransactionType {
  SALE = 'SALE', // Session or Goods sold
  ADD_CASH = 'ADD_CASH', // Manual add
  WITHDRAW_CASH = 'WITHDRAW_CASH', // Manual withdraw
  EXTENSION = 'EXTENSION', // Time extension
  PREPAYMENT = 'PREPAYMENT' // Booking deposit
}

export interface Tariff {
  id: string;
  name: string;
  durationMinutes: number; // 0 for unlimited
  price: number;
}

// Changed from union type to string to support dynamic categories
export type ProductCategory = string;

export interface Category {
  id: string;
  name: string;
  isSystem?: boolean; // Optional: to mark categories that shouldn't be deleted easily
}

export interface Partner {
  id: string;
  name: string;
  type: 'ANIMATOR' | 'MASTER_CLASS' | 'DECORATION' | 'OTHER';
  phone?: string | null;
  description?: string | null;
}

export interface Child {
  id: string;
  name: string;
  dob?: string | null; // Date of Birth YYYY-MM-DD
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  socialMedia?: string | null;
  children: Child[];
  notes?: string | null;
  registrationDate: string;
  bonusCardNumber?: string | null;
  bonusBalance?: number | null;
  isAddedToContacts?: boolean | null;
  subscriptions?: ClientSubscription[] | null;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  totalMinutes: number;
  price: number;
  validityDays: number;
  isActive: boolean;
  description?: string | null;
}

export type ClientSubscriptionStatus = 'ACTIVE' | 'USED_UP' | 'EXPIRED' | 'CANCELLED';

export interface ClientSubscription {
  id: string;
  planId: string;
  planName: string;
  totalMinutes: number;
  remainingMinutes: number;
  purchasedAt: string;
  expiresAt: string;
  status: ClientSubscriptionStatus;
  pricePaid: number;
  paymentMethod: PaymentMethod;
  notes?: string | null;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  category: ProductCategory;
}

export interface Discount {
  id: string;
  name: string;
  isCustom?: boolean;
}

export interface CartItem {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  timestamp: number;
}

export interface Session {
  id: string;
  childName: string;
  parentName: string;
  parentPhone?: string | null;
  tariffId: string;
  tariffName: string;
  startTime: number;
  endTime: number | null; // null if unlimited
  initialPrice: number;
  paymentMethod: PaymentMethod;
  isActive: boolean;
  extraItems: CartItem[]; // Juice, water, etc.
  discountReason?: string | null;
  paidWithBonuses?: number | null;
  accruedBonuses?: number | null;
  subscriptionUsage?: {
    subscriptionId: string;
    planName: string;
    minutesUsed: number;
    isReversed?: boolean;
    reversedAt?: string | null;
    reversalReason?: string | null;
  } | null;
}

export interface Transaction {
  id: string;
  timestamp: number;
  amount: number;
  type: TransactionType;
  paymentMethod: PaymentMethod;
  description: string;
  relatedSessionId?: string | null;
  relatedEventId?: string | null;
  isDeleted?: boolean;
  deletedAt?: string | null;
  deletedBy?: string | null;
  deletionReason?: string | null;
}

export interface CleaningRecord {
  isCompleted: boolean;
  completedBy?: string | null;
  timestamp?: number | null;
}

export interface CleaningLog {
  morning: CleaningRecord;
  evening: CleaningRecord;
  current: CleaningRecord[]; // List of spot checks/toy cleanups during the day
}

export interface DayData {
  id: string; // date string YYYY-MM-DD
  date: string;
  adminName: string; // Who opened
  openingCash: number;
  
  // Closing Info
  isClosed: boolean;
  closingAdminName?: string | null; // Who closed
  closingCash?: number | null; // Actual cash counted
  calculatedCash?: number | null; // System calculated cash
  discrepancy?: number | null; // closing - calculated

  sessions: Session[];
  transactions: Transaction[];
  cleaningLog?: CleaningLog;
}

export interface Administrator {
  id: string;
  name: string;
  phone?: string | null;
  isActive: boolean;
}

export interface ScheduleShift {
  id: string;
  date: string; // YYYY-MM-DD
  adminId: string;
  adminName: string;
}

export type DocumentType = 'GOOGLE' | 'WORD' | 'PDF' | 'OTHER';

export interface ImportantDocument {
  id: string;
  title: string;
  url: string;
  type: DocumentType;
}

export interface MiniGame {
  time: string;
  activity: string;
}

export interface MiniGameSettings {
  memoUrl: string;
  memoName?: string | null; // Optional name for the file/link
  oddWeekGames: MiniGame[]; // Games for odd weeks (1, 3, 5...)
  evenWeekGames: MiniGame[]; // Games for even weeks (2, 4, 6...)
}

export type EventType = 'BIRTHDAY' | 'MASTER_CLASS';
export type EventStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';

export type AnimatorType = 'GUEST' | 'STAFF' | 'EXTERNAL';
export type RegistrationType = 'NONE' | 'GUEST' | 'EXTERNAL';
export type MasterClassType = 'INTERNAL' | 'EXTERNAL';

export interface ServiceItem {
    id: string;
    name: string;
    price: number;
    isIncludedInTotal: boolean;
}

export interface Participant {
    id: string;
    childName: string;
    parentPhone: string;
    prepayment: number;
    isFullyPaid: boolean;
}

export interface AnimatorInfo {
    type: AnimatorType;
    name: string; // Name of staff or external animator
    role?: string | null; // Character role (e.g. Spiderman)
    phone?: string | null;
    organization?: string | null; // If external
    costToUs?: number | null; // How much we pay them (for owner view)
    isPaidToVendor?: boolean | null; // Have we paid them?
    priceToClient?: number | null; // How much client pays us
}

export interface RegistrationInfo {
    type: RegistrationType;
    organization?: string | null;
    contact?: string | null;
    costToUs?: number | null;
    isPaidToVendor?: boolean | null;
    priceToClient?: number | null;
}

export interface CalendarEvent {
  id: string;
  type: EventType;
  status: EventStatus;
  cancellationReason?: string | null;
  
  date: string; // YYYY-MM-DD
  startTime?: string | null; // HH:MM
  endTime?: string | null; // HH:MM
  
  // Birthday Specific
  childName?: string;
  parentName?: string;
  phone?: string;
  childCount?: number;
  wishes?: string | null;
  aiWishSuggestion?: string | null;
  
  // Financials (Birthday)
  roomPrice?: number;
  perChildPrice?: number;
  totalCost?: number; // Calculated total
  prepayment: number;
  isPaid?: boolean;

  animator?: AnimatorInfo;
  registration?: RegistrationInfo;
  additionalServices?: ServiceItem[];

  // Master Class Specific
  title?: string;
  masterClassType?: MasterClassType;
  organizationName?: string | null;
  instructorName?: string | null;
  instructorPhone?: string | null;
  pricePerChild?: number;
  participants?: Participant[];
  
  // Financials (Master Class Vendor)
  instructorCost?: number | null;
  isInstructorPaid?: boolean | null;
}

export interface BirthdayRateSettings {
  weekday: {
    room2h: number;
    zone1h: number;
  };
  weekend: {
    room2h: number;
    zone1h: number;
  };
}

export interface StaffAnimator {
    id: string;
    name: string;
    roles: string[];
    defaultPrice: number;
}

export type FeedbackType = 'COMPLAINT' | 'SUGGESTION';

export interface Feedback {
    id: string;
    date: string; // ISO date
    type: FeedbackType;
    content: string;
    isResolved: boolean;
}

export type TrackerType = 'PRODUCT_SALES' | 'CATEGORY_SALES';

export interface CustomTracker {
    id: string;
    name: string;
    type: TrackerType;
    targetId: string;
}

export interface AdminTask {
    id: string;
    description: string;
    createdAt: string; // ISO Date
    isCompleted: boolean;
    completedAt?: string | null;
    completedBy?: string | null;
    completionComment?: string | null;
}
