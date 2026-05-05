export type Role = 'ADMIN' | 'MEMBER';
export type TourStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'LOCKED' | 'CANCELLED';
export type SplitType = 'EQUAL' | 'CUSTOM' | 'PERCENTAGE';
export type LoanType = 'TOUR_FUND' | 'MEMBER_TO_MEMBER';
export type PaymentMethod = 'CASH' | 'BKASH' | 'NAGAD' | 'BANK' | 'OTHER';
export type SettlementStatus = 'PENDING' | 'CONFIRMED';
export type SettlementSource = 'MANUAL' | 'LOAN' | 'EXPENSE' | 'FUEL';

export type User = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: Role;
  avatarUrl?: string | null;
  drivingLicenseNumber?: string | null;
  motorcycleRegistrationNumber?: string | null;
  motorcycleModel?: string | null;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  tourMembers?: Array<{
    id: string;
    isActive: boolean;
    joinedAt: string;
    tour: Pick<Tour, 'id' | 'title' | 'startLocation' | 'destination' | 'startDate' | 'endDate' | 'status'>;
  }>;
  _count?: {
    tourMembers?: number;
  };
};

export type Session = {
  accessToken: string;
  refreshToken: string;
  user: User;
};

export type Tour = {
  id: string;
  title: string;
  startLocation?: string | null;
  destination: string;
  startDate: string;
  endDate?: string | null;
  description?: string | null;
  estimatedBudget?: string | null;
  status: TourStatus;
  createdAt: string;
  members?: TourMember[];
  _count?: {
    members: number;
    expenses: number;
    loans: number;
    fuelExpenses: number;
    settlements?: number;
  };
};

export type TourMember = {
  id: string;
  tourId: string;
  userId: string;
  isActive: boolean;
  joinedAt: string;
  user: User;
};

export type Expense = {
  id: string;
  title: string;
  amount: string;
  paidById: string;
  category: string;
  splitType: SplitType;
  expenseDate: string;
  description?: string | null;
  paidBy: User;
  members: Array<{ userId: string; shareAmount: string; user: User }>;
};

export type Loan = {
  id: string;
  lenderId: string;
  borrowerId?: string | null;
  amount: string;
  loanType: LoanType;
  reason?: string | null;
  lender: User;
  borrower?: User | null;
  createdAt: string;
};

export type FuelExpense = {
  id: string;
  vehicleName: string;
  driverId: string;
  paidById: string;
  amount: string;
  fuelLiters?: string | null;
  distance?: string | null;
  note?: string | null;
  driver: User;
  paidBy: User;
  members: Array<{ userId: string; shareAmount: string; user: User }>;
  createdAt: string;
};

export type Settlement = {
  id: string;
  paidById: string;
  receivedById: string;
  amount: string;
  paymentMethod: PaymentMethod;
  status: SettlementStatus;
  source: SettlementSource;
  loanId?: string | null;
  note?: string | null;
  confirmedAt?: string | null;
  paidBy: User;
  receivedBy: User;
  expense?: Pick<Expense, 'id' | 'title' | 'category'> | null;
  fuelExpense?: Pick<FuelExpense, 'id' | 'vehicleName'> | null;
  createdAt: string;
};

export type ReportMember = {
  userId: string;
  name: string;
  email: string;
  isActive: boolean;
  totalPaid: string;
  totalShare: string;
  loanGiven: string;
  loanTaken: string;
  settlementPaid: string;
  settlementReceived: string;
  finalBalance: string;
  status: 'WILL_RECEIVE' | 'WILL_PAY' | 'SETTLED';
};

export type TourReport = {
  tour: Pick<Tour, 'id' | 'title' | 'startLocation' | 'destination' | 'estimatedBudget' | 'status' | 'startDate' | 'endDate'>;
  summary: {
    totalExpense: string;
    totalFuelCost: string;
    totalLoan: string;
    totalMembers: number;
    averageShare: string;
  };
  members: ReportMember[];
  settlementSuggestions: Array<{
    fromUserId: string;
    from: string;
    toUserId: string;
    to: string;
    amount: string;
  }>;
};
