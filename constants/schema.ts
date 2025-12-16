export type UserRole = 'ADMIN' | 'INSTRUCTOR' | 'STUDENT';

export type UserAccount = {
  id: string;
  email: string;
  role: UserRole;
  status: 'active' | 'inactive' | 'invited';
  createdAt: string;
  updatedAt: string;
};

export type InstructorProfile = {
  id: string;
  userId: string;
  fullName: string;
  bio: string;
  specialties: string[];
  certifications: string[];
  hourlyRate: number;
  languages: string[];
  experienceYears: number;
  availability: Array<{
    day: string;
    start: string;
    end: string;
  }>;
};

export type StudentProfile = {
  id: string;
  userId: string;
  fullName: string;
  phone: string;
  birthDate: string;
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  goals: string[];
  medicalNotes?: string;
  emergencyContact: {
    name: string;
    phone: string;
  };
};

export type TrainingClass = {
  id: string;
  title: string;
  description: string;
  level: 'all' | 'beginner' | 'intermediate' | 'advanced';
  category: 'crossfit' | 'weightlifting' | 'mobility' | 'conditioning';
  capacity: number;
  schedule: Array<{
    day: string;
    start: string;
    end: string;
    location: string;
    startDate?: string;
    endDate?: string;
  }>;
  tags: string[];
  instructorId: string;
  createdAt: string;
  updatedAt: string;
};

export type PlanOption = {
  id: string;
  weeklyClasses: number;
  durationMonths: number;
  priceMonthly: number;
  priceUpfront: number;
  currency: Payment['currency'];
};

export type StudentPlan = {
  id: string;
  studentId: string;
  planOptionId: string;
  billing: 'upfront' | 'recurring';
  startDate: string;
  endDate: string;
  status: 'active' | 'expired' | 'paused';
};

export type SessionBooking = {
  id: string;
  studentId: string;
  sessionId: string;
  weekStart: string;
  createdAt: string;
  status: 'booked' | 'cancelled';
};

export type CreditReinstatement = {
  id: string;
  studentId: string;
  weekStart: string;
  amount: number;
  createdAt: string;
  notes?: string;
};

export type ClassSession = {
  id: string;
  classId: string;
  startTime: string;
  endTime: string;
  capacity: number;
  location: string;
  coachNotes?: string;
  tags?: string[];
};

export type Enrollment = {
  id: string;
  studentId: string;
  classId: string;
  status: 'active' | 'waitlist' | 'cancelled';
  createdAt: string;
  updatedAt: string;
};

export type Attendance = {
  id: string;
  sessionId: string;
  enrollmentId: string;
  status: 'present' | 'absent' | 'late';
  checkedInAt?: string;
  notes?: string;
};

export type Payment = {
  id: string;
  studentId: string;
  enrollmentId?: string;
  amount: number;
  currency: 'USD' | 'BRL' | 'EUR';
  method: 'credit_card' | 'pix' | 'cash';
  status: 'pending' | 'paid' | 'failed';
  dueDate: string;
  paidAt?: string;
  description?: string;
  invoiceId?: string;
  receiptId?: string;
};

export type PaymentIntent = {
  id: string;
  paymentId: string;
  enrollmentId: string;
  amount: number;
  currency: Payment['currency'];
  paymentMethod: Payment['method'];
  status: 'requires_payment_method' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  clientSecret: string;
};

export type PaymentSession = {
  id: string;
  intentId: string;
  status: 'open' | 'completed' | 'expired';
  checkoutUrl: string;
  createdAt: string;
  expiresAt: string;
  lastWebhookStatus?: 'succeeded' | 'failed';
  failureReason?: string;
};

export type Invoice = {
  id: string;
  paymentId: string;
  enrollmentId: string;
  issueDate: string;
  reference: string;
  total: number;
  currency: Payment['currency'];
  status: 'open' | 'paid' | 'void';
  notes?: string;
};

export type Receipt = {
  id: string;
  paymentId: string;
  enrollmentId: string;
  issuedAt: string;
  downloadUrl: string;
  reference: string;
};

export type Settlement = {
  id: string;
  period: string;
  gross: number;
  fees: number;
  net: number;
  depositedAt: string;
  receiptIds: string[];
};

export type EvaluationQuestionnaire = {
  trainingFrequency: string;
  goalsFocus: string;
  mobility: string;
  nutrition: string;
  sleepQuality: string;
  stressLevel?: string;
  weightKg?: number;
  heightMeters?: number;
  heightCentimeters?: number;
};

export type Evaluation = {
  id: string;
  studentId: string;
  date: string;
  questionnaire: EvaluationQuestionnaire;
  notes?: string;
};

export type Goal = {
  id: string;
  studentId: string;
  target: string;
  metric: string;
  startDate: string;
  endDate: string;
  progress: number;
  status: 'active' | 'completed' | 'archived';
};

export type DatabaseSchema = {
  users: UserAccount[];
  instructorProfiles: InstructorProfile[];
  studentProfiles: StudentProfile[];
  classes: TrainingClass[];
  sessions: ClassSession[];
  enrollments: Enrollment[];
  attendance: Attendance[];
  payments: Payment[];
  invoices: Invoice[];
  receipts: Receipt[];
  paymentIntents: PaymentIntent[];
  paymentSessions: PaymentSession[];
  settlements: Settlement[];
  evaluations: Evaluation[];
  goals: Goal[];
  planOptions: PlanOption[];
  studentPlans: StudentPlan[];
  sessionBookings: SessionBooking[];
  creditReinstatements: CreditReinstatement[];
};
