import type {
  Attendance,
  ClassSession,
  DatabaseSchema,
  Enrollment,
  InstructorProfile,
  Invoice,
  Payment,
  StudentProfile,
  TrainingClass,
  UserAccount,
  UserRole,
} from './schema';

type SeedAccount = UserAccount & {
  password: string;
  displayName: string;
};

export const seedAccounts: SeedAccount[] = [
  {
    id: 'user-admin-1',
    email: 'admin@dottosports.test',
    password: 'Admin@123',
    role: 'ADMIN',
    status: 'active',
    createdAt: '2024-01-01T12:00:00Z',
    updatedAt: '2024-01-05T12:00:00Z',
    displayName: 'Admin Pro',
  },
  {
    id: 'user-instructor-1',
    email: 'brenotebet@live.com',
    password: 'Coach@123',
    role: 'INSTRUCTOR',
    status: 'active',
    createdAt: '2024-01-02T12:00:00Z',
    updatedAt: '2024-01-06T12:00:00Z',
    displayName: 'Coach Marina',
  },
  {
    id: 'user-student-1',
    email: 'aluno@dottosports.test',
    password: 'Aluno@123',
    role: 'STUDENT',
    status: 'active',
    createdAt: '2024-01-03T12:00:00Z',
    updatedAt: '2024-01-07T12:00:00Z',
    displayName: 'Cliente Teste',
  },
];

export const instructorProfiles: InstructorProfile[] = [
  {
    id: 'instructor-1',
    userId: 'user-instructor-1',
    fullName: 'Coach Marina',
    bio: 'Especialista em condicionamento metabólico e força.',
    specialties: ['Crossfit', 'Weightlifting'],
    certifications: ['Crossfit L2', 'Primeiros Socorros'],
    hourlyRate: 180,
    languages: ['pt-BR', 'en-US'],
    experienceYears: 6,
    availability: [
      { day: 'Mon', start: '06:00', end: '10:00' },
      { day: 'Wed', start: '16:00', end: '21:00' },
      { day: 'Fri', start: '06:00', end: '12:00' },
    ],
  },
];

export const studentProfiles: StudentProfile[] = [
  {
    id: 'student-1',
    userId: 'user-student-1',
    fullName: 'Cliente Teste',
    phone: '+55 11 99999-0001',
    birthDate: '1998-08-20',
    experienceLevel: 'intermediate',
    goals: ['Melhorar condicionamento', 'Ganhar força no clean'],
    medicalNotes: 'Sem restrições médicas.',
    emergencyContact: {
      name: 'Fulano de Tal',
      phone: '+55 11 98888-2222',
    },
  },
];

export const classes: TrainingClass[] = [
  {
    id: 'class-1',
    title: 'Cross Training Power',
    description: 'Aula combinando força, técnica e condicionamento.',
    level: 'intermediate',
    category: 'crossfit',
    capacity: 16,
    schedule: [
      { day: 'Mon', start: '06:00', end: '07:00', location: 'Área principal' },
      { day: 'Wed', start: '18:00', end: '19:00', location: 'Área principal' },
    ],
    tags: ['metcon', 'força', 'team'],
    instructorId: 'instructor-1',
    createdAt: '2024-02-01T12:00:00Z',
    updatedAt: '2024-02-05T12:00:00Z',
  },
  {
    id: 'class-2',
    title: 'Técnica de Snatch',
    description: 'Sessão voltada para técnica de levantamento olímpico.',
    level: 'advanced',
    category: 'weightlifting',
    capacity: 10,
    schedule: [
      { day: 'Tue', start: '12:00', end: '13:00', location: 'Plataforma de LPO' },
      { day: 'Thu', start: '19:00', end: '20:15', location: 'Plataforma de LPO' },
    ],
    tags: ['técnica', 'LPO'],
    instructorId: 'instructor-1',
    createdAt: '2024-02-02T12:00:00Z',
    updatedAt: '2024-02-06T12:00:00Z',
  },
];

export const sessions: ClassSession[] = [
  {
    id: 'session-1',
    classId: 'class-1',
    startTime: '2024-12-11T18:00:00Z',
    endTime: '2024-12-11T19:00:00Z',
    capacity: 16,
    location: 'Área principal',
    tags: ['check-in liberado'],
    coachNotes: 'Preparar kettlebells e anilhas leves.',
  },
  {
    id: 'session-2',
    classId: 'class-2',
    startTime: '2024-12-12T12:00:00Z',
    endTime: '2024-12-12T13:00:00Z',
    capacity: 10,
    location: 'Plataforma de LPO',
    tags: ['mobilidade', 'técnica'],
  },
];

export const enrollments: Enrollment[] = [
  {
    id: 'enrollment-1',
    studentId: 'student-1',
    classId: 'class-1',
    status: 'active',
    createdAt: '2024-12-01T12:00:00Z',
    updatedAt: '2024-12-01T12:00:00Z',
  },
];

export const attendance: Attendance[] = [
  {
    id: 'attendance-1',
    sessionId: 'session-1',
    enrollmentId: 'enrollment-1',
    status: 'present',
    checkedInAt: '2024-12-11T17:55:00Z',
    notes: 'Check-in realizado com QR Code.',
  },
];

export const payments: Payment[] = [
  {
    id: 'payment-1',
    studentId: 'student-1',
    amount: 95,
    currency: 'BRL',
    method: 'pix',
    status: 'pending',
    dueDate: '2024-12-15',
    description: 'Mensalidade dezembro',
  },
];

export const invoices: Invoice[] = [
  {
    id: 'invoice-1',
    paymentId: 'payment-1',
    issueDate: '2024-12-10',
    reference: 'DEC/2024-MENSALIDADE',
    notes: 'Gerado automaticamente para cobrança mensal.',
  },
];

export const seededDatabase: DatabaseSchema = {
  users: seedAccounts,
  instructorProfiles,
  studentProfiles,
  classes,
  sessions,
  enrollments,
  attendance,
  payments,
  invoices,
};

export const resolveSeedRole = (email: string): UserRole | null => {
  const match = seedAccounts.find(
    (account) => account.email.toLowerCase() === email.toLowerCase(),
  );
  return match?.role ?? null;
};

export const resolveSeedDisplayName = (email: string): string | null => {
  const match = seedAccounts.find(
    (account) => account.email.toLowerCase() === email.toLowerCase(),
  );
  return match?.displayName ?? null;
};
