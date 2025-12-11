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
  }>;
  tags: string[];
  instructorId: string;
  createdAt: string;
  updatedAt: string;
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
};
