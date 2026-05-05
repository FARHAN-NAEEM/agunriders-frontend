export const statusLabel: Record<string, string> = {
  ACTIVE: 'অ্যাকটিভ',
  INACTIVE: 'ইনঅ্যাকটিভ',
  DELETED: 'ডিলিটেড',
  ADMIN: 'অ্যাডমিন',
  MEMBER: 'মেম্বার',
  DRAFT: 'ড্রাফট',
  COMPLETED: 'কমপ্লিটেড',
  LOCKED: 'লকড',
  CANCELLED: 'ক্যানসেলড',
  WILL_RECEIVE: 'পাবে',
  WILL_PAY: 'দেবে',
  SETTLED: 'সেটেলড',
  PENDING: 'পেন্ডিং',
  CONFIRMED: 'কনফার্মড',
  LOAN: 'লোন',
  EXPENSE: 'খরচ',
  FUEL: 'ফুয়েল',
  MANUAL: 'ম্যানুয়াল',
};

export const categoryLabel: Record<string, string> = {
  Food: 'খাবার',
  Hotel: 'হোটেল',
  Transport: 'ট্রান্সপোর্ট',
  Ticket: 'টিকিট',
  Fuel: 'ফুয়েল',
  Shopping: 'শপিং',
  Emergency: 'জরুরি',
  Other: 'অন্যান্য',
};

export const loanTypeLabel: Record<string, string> = {
  MEMBER_TO_MEMBER: 'মেম্বার টু মেম্বার',
  TOUR_FUND: 'ট্যুর ফান্ড',
};

export const paymentMethodLabel: Record<string, string> = {
  CASH: 'ক্যাশ',
  BKASH: 'বিকাশ',
  NAGAD: 'নগদ',
  BANK: 'ব্যাংক',
  OTHER: 'অন্যান্য',
};

export function bnLabel(value: string, labels: Record<string, string>) {
  return labels[value] ?? value.replaceAll('_', ' ');
}
