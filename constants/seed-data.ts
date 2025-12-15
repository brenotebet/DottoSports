import type {
  Attendance,
  ClassSession,
  DatabaseSchema,
  Enrollment,
  Evaluation,
  Goal,
  InstructorProfile,
  Invoice,
  Payment,
  PaymentIntent,
  PaymentSession,
  Receipt,
  Settlement,
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
    specialties: ['Crossfit', 'Levantamento Olímpico'],
    certifications: ['Crossfit Nível 2', 'Primeiros Socorros'],
    hourlyRate: 180,
    languages: ['pt-BR'],
    experienceYears: 6,
    availability: [
      { day: 'Seg', start: '06:00', end: '10:00' },
      { day: 'Qua', start: '16:00', end: '21:00' },
      { day: 'Sex', start: '06:00', end: '12:00' },
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
    title: 'Cross Training de Potência',
    description: 'Aula combinando força, técnica e condicionamento avançado.',
    level: 'intermediate',
    category: 'crossfit',
    capacity: 16,
    schedule: [
      {
        day: 'Seg',
        start: '06:00',
        end: '07:00',
        location: 'Área principal',
        startDate: '2024-12-01',
        endDate: '2025-02-28',
      },
      {
        day: 'Qua',
        start: '18:00',
        end: '19:00',
        location: 'Área principal',
        startDate: '2024-12-01',
        endDate: '2025-02-28',
      },
    ],
    tags: ['metcon', 'força', 'team'],
    instructorId: 'instructor-1',
    createdAt: '2024-02-01T12:00:00Z',
    updatedAt: '2024-02-05T12:00:00Z',
  },
  {
    id: 'class-2',
    title: 'Técnica de Snatch',
    description: 'Sessão voltada para técnica detalhada de levantamento olímpico.',
    level: 'advanced',
    category: 'weightlifting',
    capacity: 10,
    schedule: [
      {
        day: 'Ter',
        start: '12:00',
        end: '13:00',
        location: 'Plataforma de LPO',
        startDate: '2024-12-01',
        endDate: '2025-01-31',
      },
      {
        day: 'Qui',
        start: '19:00',
        end: '20:15',
        location: 'Plataforma de LPO',
        startDate: '2024-12-01',
        endDate: '2025-01-31',
      },
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

export const evaluations: Evaluation[] = [
  {
    id: 'evaluation-1',
    studentId: 'student-1',
    date: '2024-12-01',
    questionnaire: {
      trainingFrequency: '4x por semana',
      goalsFocus: 'Melhorar condicionamento e técnica de LPO',
      mobility: 'Mobilidade de tornozelo precisa de atenção',
      nutrition: 'Dieta 80/20 com proteína adequada',
      sleepQuality: 'Dormindo 7h em média',
      stressLevel: 'Moderado',
    },
    notes: 'Boa consciência corporal, recomenda-se progredir cargas no clean.',
  },
];

export const goals: Goal[] = [
  {
    id: 'goal-1',
    studentId: 'student-1',
    target: 'Completar benchmark “Helen” abaixo de 11 minutos',
    metric: 'Tempo total',
    startDate: '2024-12-05',
    endDate: '2025-02-05',
    progress: 35,
    status: 'active',
  },
  {
    id: 'goal-2',
    studentId: 'student-1',
    target: 'Atingir 1.25x BW no back squat',
    metric: 'Carga máxima',
    startDate: '2024-11-15',
    endDate: '2025-03-01',
    progress: 55,
    status: 'active',
  },
];

export const payments: Payment[] = [
  {
    id: 'payment-1',
    studentId: 'student-1',
    enrollmentId: 'enrollment-1',
    amount: 95,
    currency: 'BRL',
    method: 'pix',
    status: 'pending',
    dueDate: '2024-12-15',
    description: 'Mensalidade dezembro',
    invoiceId: 'invoice-1',
  },
];

export const invoices: Invoice[] = [
  {
    id: 'invoice-1',
    paymentId: 'payment-1',
    enrollmentId: 'enrollment-1',
    issueDate: '2024-12-10',
    reference: 'DEC/2024-MENSALIDADE',
    total: 95,
    currency: 'BRL',
    status: 'open',
    notes: 'Gerado automaticamente para cobrança mensal.',
  },
];

export const paymentIntents: PaymentIntent[] = [
  {
    id: 'pi-1',
    paymentId: 'payment-1',
    enrollmentId: 'enrollment-1',
    amount: 95,
    currency: 'BRL',
    paymentMethod: 'pix',
    status: 'processing',
    clientSecret: 'secret-pi-1',
  },
];

export const paymentSessions: PaymentSession[] = [
  {
    id: 'ps-1',
    intentId: 'pi-1',
    status: 'open',
    checkoutUrl: 'https://pagamentos.dottosports.test/ps-1',
    createdAt: '2024-12-10T12:00:00Z',
    expiresAt: '2024-12-15T23:59:59Z',
  },
];

export const receipts: Receipt[] = [
  {
    id: 'receipt-1',
    paymentId: 'payment-1',
    enrollmentId: 'enrollment-1',
    issuedAt: '2024-12-11T18:30:00Z',
    downloadUrl: 'https://pagamentos.dottosports.test/recibos/receipt-1.pdf',
    reference: 'REC-DEC-2024-0001',
  },
];

export const settlements: Settlement[] = [
  {
    id: 'settlement-1',
    period: '2024-12-01 a 2024-12-15',
    gross: 95,
    fees: 4.75,
    net: 90.25,
    depositedAt: '2024-12-16T09:00:00Z',
    receiptIds: ['receipt-1'],
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
  receipts,
  paymentIntents,
  paymentSessions,
  settlements,
  evaluations,
  goals,
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
