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
  amount: number;
  currency: 'USD' | 'BRL' | 'EUR';
  method: 'credit_card' | 'pix' | 'cash';
  status: 'pending' | 'paid' | 'failed';
  dueDate: string;
  paidAt?: string;
  invoiceId?: string;
};

export type Invoice = {
  id: string;
  paymentId: string;
  issueDate: string;
  reference: string;
  notes?: string;
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
};
