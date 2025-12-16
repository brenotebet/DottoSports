import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { File, Paths } from 'expo-file-system';

import type {
  Attendance,
  ClassSession,
  Enrollment,
  Evaluation,
  Goal,
  Invoice,
  Payment,
  PaymentIntent,
  PaymentSession,
  Receipt,
  Settlement,
  StudentProfile,
  TrainingClass,
  PlanOption,
  StudentPlan,
  SessionBooking,
  CreditReinstatement,
} from '@/constants/schema';
import {
  attendance as seedAttendance,
  classes as seedClasses,
  enrollments as seedEnrollments,
  evaluations as seedEvaluations,
  goals as seedGoals,
  payments as seedPayments,
  invoices as seedInvoices,
  paymentIntents as seedPaymentIntents,
  paymentSessions as seedPaymentSessions,
  receipts as seedReceipts,
  settlements as seedSettlements,
  sessions as seedSessions,
  planOptions as seedPlanOptions,
  studentPlans as seedStudentPlans,
  sessionBookings as seedSessionBookings,
  creditReinstatements as seedCreditReinstatements,
  studentProfiles,
  seedAccounts,
} from '@/constants/seed-data';

export type RosterEntry = {
  enrollment: Enrollment;
  student: StudentProfile;
  attendance?: Attendance;
  paymentStatus: 'paid' | 'overdue' | 'pending';
  paymentLabel: string;
};

export type CardOnFile = {
  brand: string;
  last4: string;
  expMonth: string;
  expYear: string;
  label: string;
};

type SystemEvent = {
  id: string;
  type:
    | 'enrollment_created'
    | 'payment_posted'
    | 'attendance_marked'
    | 'validation_error'
    | 'enrollment_cancelled';
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
};

type PaymentLedgerEntry = {
  payment: Payment;
  invoice?: Invoice;
  status: Payment['status'] | 'overdue';
};

type StudentAccountSnapshot = {
  enrollments: Enrollment[];
  ledger: PaymentLedgerEntry[];
  outstanding: PaymentLedgerEntry[];
  nextPayment?: PaymentLedgerEntry;
  openBalance: number;
};

type AnalyticsSnapshot = {
  totalRevenue: number;
  pendingRevenue: number;
  averageUtilization: number;
  attendanceRate: number;
  revenueByStudent: Record<string, number>;
  utilizationByClass: Record<string, { capacity: number; active: number; utilization: number }>;
};

type InstructorDataContextValue = {
  classes: TrainingClass[];
  sessions: ClassSession[];
  enrollments: Enrollment[];
  attendance: Attendance[];
  students: StudentProfile[];
  payments: Payment[];
  invoices: Invoice[];
  paymentIntents: PaymentIntent[];
  paymentSessions: PaymentSession[];
  receipts: Receipt[];
  settlements: Settlement[];
  planOptions: PlanOption[];
  studentPlans: StudentPlan[];
  sessionBookings: SessionBooking[];
  creditReinstatements: CreditReinstatement[];
  evaluations: Evaluation[];
  goals: Goal[];
  events: SystemEvent[];
  analytics: AnalyticsSnapshot;
  outstandingBalances: {
    payment: Payment;
    invoice?: Invoice;
    student?: StudentProfile;
    email?: string;
    status: 'pending' | 'overdue' | 'failed';
  }[];
  cardOnFile: CardOnFile;
  rosterByClass: Record<string, RosterEntry[]>;
  getStudentAccountSnapshot: (studentId: string) => StudentAccountSnapshot;
  payOutstandingPayment: (paymentId: string) => { session: PaymentSession; intent: PaymentIntent };
  createClass: (payload: Omit<TrainingClass, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateClass: (id: string, payload: Partial<TrainingClass>) => void;
  deleteClass: (id: string) => void;
  createSession: (payload: Omit<ClassSession, 'id'>) => void;
  updateSession: (id: string, payload: Partial<ClassSession>) => void;
  deleteSession: (id: string) => void;
  ensureStudentProfile: (email: string, displayName: string) => StudentProfile;
  getEnrollmentForStudent: (studentId: string, classId: string) => Enrollment | undefined;
  enrollStudentInClass: (
    studentId: string,
    classId: string,
  ) => { enrollment: Enrollment; isWaitlist: boolean; alreadyEnrolled: boolean };
  getCapacityUsage: (classId: string) => { active: number; capacity: number; available: number };
  toggleAttendance: (
    sessionId: string,
    enrollmentId: string,
    status: Attendance['status'],
  ) => void;
  getActivePlanForStudent: (studentId: string) => StudentPlan | undefined;
  selectPlanForStudent: (studentId: string, planOptionId: string, billing: StudentPlan['billing']) => StudentPlan;
  getWeeklyUsageForStudent: (
    studentId: string,
    referenceDate?: Date,
  ) => { used: number; limit: number; remaining: number; weekStart: string };
  isSessionBooked: (sessionId: string, studentId: string) => boolean;
  bookSessionForStudent: (sessionId: string, studentId: string) => SessionBooking;
  reinstateClassForWeek: (studentId: string, weekStart: string, amount?: number, notes?: string) => CreditReinstatement;
  recordCheckIn: (sessionId: string, enrollmentId: string, method: 'qr' | 'manual') => Attendance;
  chargeStoredCard: (studentId: string, amount: number, description: string) => Payment;
  createOneTimePayment: (
    studentId: string,
    amount: number,
    method: Payment['method'],
    description: string,
  ) => Payment;
  updateCardOnFile: (payload: Partial<CardOnFile>) => void;
  updateEnrollmentStatus: (enrollmentId: string, status: Enrollment['status']) => void;
  createPaymentIntentForEnrollment: (
    enrollmentId: string,
    amount: number,
    method: Payment['method'],
    description: string,
  ) => PaymentIntent;
  startPaymentSession: (intentId: string, fallbackIntent?: PaymentIntent) => PaymentSession;
  processPaymentWebhook: (
    sessionId: string,
    result: 'succeeded' | 'failed',
    failureReason?: string,
    sessionOverride?: PaymentSession,
    intentOverride?: PaymentIntent,
  ) => void;
  cancelEnrollment: (enrollmentId: string) => void;
  createEvaluation: (payload: Omit<Evaluation, 'id'>) => void;
  updateEvaluation: (id: string, payload: Partial<Evaluation>) => void;
  deleteEvaluation: (id: string) => void;
  createGoal: (payload: Omit<Goal, 'id'>) => void;
  updateGoal: (id: string, payload: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;
  getStudentProfileForEmail: (email: string, displayName?: string) => StudentProfile;
  getStudentEvaluations: (studentId: string) => Evaluation[];
};

const InstructorDataContext = createContext<InstructorDataContextValue | undefined>(undefined);

const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.round(Math.random() * 1000)}`;
const findAccountByEmail = (email: string) =>
  seedAccounts.find((account) => account.email.toLowerCase() === email.toLowerCase());

const resolvePaymentStatus = (
  payments: Payment[],
  invoices: Invoice[],
  enrollmentId: string,
) => {
  const relevantPayment = payments
    .filter((payment) => payment.enrollmentId === enrollmentId)
    .sort(
      (a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime(),
    )[0];

  if (!relevantPayment) {
    return { paymentStatus: 'paid' as const, paymentLabel: 'Sem cobranças ativas' };
  }

  const relatedInvoice = invoices.find((invoice) => invoice.paymentId === relevantPayment.id);
  if (relevantPayment.status === 'paid' || relatedInvoice?.status === 'paid') {
    return { paymentStatus: 'paid' as const, paymentLabel: 'Pago' };
  }

  if (relevantPayment.status === 'failed') {
    return { paymentStatus: 'overdue' as const, paymentLabel: 'Falha no pagamento' };
  }

  const isOverdue = new Date(relevantPayment.dueDate) < new Date();
  return {
    paymentStatus: isOverdue ? ('overdue' as const) : ('pending' as const),
    paymentLabel: isOverdue ? 'Em atraso' : 'Pendente',
  };
};

const resolvePaymentLedger = (
  payments: Payment[],
  invoices: Invoice[],
  enrollments: Enrollment[],
  studentId: string,
): PaymentLedgerEntry[] => {
  const cancelledEnrollmentIds = new Set(
    enrollments.filter((item) => item.status === 'cancelled').map((item) => item.id),
  );

  return payments
    .filter(
      (payment) =>
        payment.studentId === studentId && !cancelledEnrollmentIds.has(payment.enrollmentId ?? ''),
    )
    .map((payment) => {
      const invoice = invoices.find((item) => item.paymentId === payment.id);
      const isPaid = payment.status === 'paid' || invoice?.status === 'paid';
      const isOverdue = new Date(payment.dueDate) < new Date();

      return {
        payment,
        invoice,
        status:
          payment.status === 'failed'
            ? 'failed'
            : isPaid
              ? 'paid'
              : isOverdue
                ? 'overdue'
                : payment.status,
      } satisfies PaymentLedgerEntry;
    })
    .sort((a, b) => new Date(a.payment.dueDate).getTime() - new Date(b.payment.dueDate).getTime());
};

const startOfWeekIso = (date: Date) => {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy.toISOString();
};

const defaultCard: CardOnFile = {
  brand: 'Visa',
  last4: '4242',
  expMonth: '12',
  expYear: '26',
  label: 'Visa •••• 4242',
};

const MAX_EVENT_ENTRIES = 50;

type PersistedInstructorData = {
  classes: TrainingClass[];
  sessions: ClassSession[];
  enrollments: Enrollment[];
  attendance: Attendance[];
  payments: Payment[];
  invoices: Invoice[];
  paymentIntents: PaymentIntent[];
  paymentSessions: PaymentSession[];
  receipts: Receipt[];
  settlements: Settlement[];
  students: StudentProfile[];
  evaluations: Evaluation[];
  goals: Goal[];
  planOptions: PlanOption[];
  studentPlans: StudentPlan[];
  sessionBookings: SessionBooking[];
  creditReinstatements: CreditReinstatement[];
  cardOnFile: CardOnFile;
  events: SystemEvent[];
};

const instructorStateFile = (() => {
  const candidates = [
    () => Paths.document,
    () => Paths.cache,
  ];

  for (const getDirectory of candidates) {
    try {
      const directory = getDirectory();

      if (directory?.uri) {
        return new File(directory, 'instructor-data.json');
      }
    } catch (error) {
      console.warn('Não foi possível resolver um diretório para os dados do instrutor', error);
    }
  }

  return null;
})();

export function InstructorDataProvider({ children }: { children: ReactNode }) {
  const [classes, setClasses] = useState<TrainingClass[]>(seedClasses);
  const [sessions, setSessions] = useState<ClassSession[]>(seedSessions);
  const [enrollments, setEnrollments] = useState<Enrollment[]>(seedEnrollments);
  const [attendance, setAttendance] = useState<Attendance[]>(seedAttendance);
  const [payments, setPayments] = useState<Payment[]>(seedPayments);
  const [invoices, setInvoices] = useState<Invoice[]>(seedInvoices);
  const [paymentIntents, setPaymentIntents] = useState<PaymentIntent[]>(seedPaymentIntents);
  const [paymentSessions, setPaymentSessions] = useState<PaymentSession[]>(seedPaymentSessions);
  const [receipts, setReceipts] = useState<Receipt[]>(seedReceipts);
  const [settlements, setSettlements] = useState<Settlement[]>(seedSettlements);
  const [evaluations, setEvaluations] = useState<Evaluation[]>(seedEvaluations);
  const [goals, setGoals] = useState<Goal[]>(seedGoals);
  const [planOptions, setPlanOptions] = useState<PlanOption[]>(seedPlanOptions);
  const [studentPlans, setStudentPlans] = useState<StudentPlan[]>(seedStudentPlans);
  const [sessionBookings, setSessionBookings] = useState<SessionBooking[]>(seedSessionBookings);
  const [creditReinstatements, setCreditReinstatements] = useState<CreditReinstatement[]>(seedCreditReinstatements);
  const [students, setStudents] = useState<StudentProfile[]>(studentProfiles);
  const [cardOnFile, setCardOnFile] = useState<CardOnFile>(defaultCard);
  const [events, setEvents] = useState<SystemEvent[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const logEvent = useCallback(
    (type: SystemEvent['type'], message: string, context?: Record<string, unknown>) => {
      setEvents((prev) =>
        [{ id: generateId('evt'), type, message, timestamp: new Date().toISOString(), context }, ...prev].slice(
          0,
          MAX_EVENT_ENTRIES,
        ),
      );
    },
    [],
  );

  useEffect(() => {
    if (!instructorStateFile) {
      setHydrated(true);
      return;
    }

    const restoreData = async () => {
      try {
        if (!instructorStateFile.exists) {
          setHydrated(true);
          return;
        }

        const storedData = JSON.parse(await instructorStateFile.text()) as Partial<PersistedInstructorData>;

        if (storedData.classes) setClasses(storedData.classes);
        if (storedData.sessions) setSessions(storedData.sessions);
        if (storedData.enrollments) setEnrollments(storedData.enrollments);
        if (storedData.attendance) setAttendance(storedData.attendance);
        if (storedData.payments) setPayments(storedData.payments);
        if (storedData.invoices) setInvoices(storedData.invoices);
        if (storedData.paymentIntents) setPaymentIntents(storedData.paymentIntents);
        if (storedData.paymentSessions) setPaymentSessions(storedData.paymentSessions);
        if (storedData.receipts) setReceipts(storedData.receipts);
        if (storedData.settlements) setSettlements(storedData.settlements);
        if (storedData.evaluations) setEvaluations(storedData.evaluations);
        if (storedData.goals) setGoals(storedData.goals);
        if (storedData.planOptions) setPlanOptions(storedData.planOptions);
        if (storedData.studentPlans) setStudentPlans(storedData.studentPlans);
        if (storedData.sessionBookings) setSessionBookings(storedData.sessionBookings);
        if (storedData.creditReinstatements) setCreditReinstatements(storedData.creditReinstatements);
        if (storedData.students) setStudents(storedData.students);
        if (storedData.cardOnFile) setCardOnFile(storedData.cardOnFile);
        if (storedData.events) setEvents(storedData.events);
      } catch (error) {
        console.warn('Não foi possível restaurar os dados do instrutor', error);
      } finally {
        setHydrated(true);
      }
    };

    void restoreData();
  }, []);

  useEffect(() => {
    if (!instructorStateFile || !hydrated) return;

    try {
      const payload: PersistedInstructorData = {
        classes,
        sessions,
        enrollments,
        attendance,
        payments,
        invoices,
        paymentIntents,
        paymentSessions,
        receipts,
        settlements,
        evaluations,
        goals,
        planOptions,
        studentPlans,
        sessionBookings,
        creditReinstatements,
        students,
        cardOnFile,
        events,
      };

      instructorStateFile.write(JSON.stringify(payload));
    } catch (error) {
      console.warn('Não foi possível salvar os dados do instrutor', error);
    }
  }, [
    attendance,
    cardOnFile,
    classes,
    enrollments,
    hydrated,
    invoices,
    payments,
    paymentIntents,
    paymentSessions,
    receipts,
    evaluations,
    goals,
    sessions,
    settlements,
    students,
    planOptions,
    studentPlans,
    sessionBookings,
    creditReinstatements,
  ]);

  const ensureStudentProfile = useCallback((email: string, displayName: string) => {
    const existingAccount = findAccountByEmail(email);
    const resolvedUserId = existingAccount?.id ?? `user-${email.toLowerCase()}`;
    let resolvedProfile: StudentProfile | undefined;

    setStudents((prev) => {
      resolvedProfile = prev.find((profile) => profile.userId === resolvedUserId);
      if (resolvedProfile) return prev;

      const newProfile: StudentProfile = {
        id: generateId('student'),
        userId: resolvedUserId,
        fullName: displayName || email,
        phone: '+55 11 99999-0000',
        birthDate: '1995-01-01',
        experienceLevel: 'beginner',
        goals: ['Entrar em forma e manter consistência'],
        emergencyContact: { name: 'Contato padrão', phone: '+55 11 98888-0000' },
      };

      resolvedProfile = newProfile;
      return [...prev, newProfile];
    });

    if (!resolvedProfile) {
      const fallbackProfile: StudentProfile = {
        id: generateId('student'),
        userId: resolvedUserId,
        fullName: displayName || email,
        phone: '+55 11 99999-0000',
        birthDate: '1995-01-01',
        experienceLevel: 'beginner',
        goals: ['Entrar em forma e manter consistência'],
        emergencyContact: { name: 'Contato padrão', phone: '+55 11 98888-0000' },
      };

      resolvedProfile = fallbackProfile;
      setStudents((prev) => [...prev, fallbackProfile]);
    }

    return resolvedProfile;
  }, []);

  const getStudentProfileForEmail = useCallback(
    (email: string, displayName?: string) => ensureStudentProfile(email, displayName ?? email),
    [ensureStudentProfile],
  );

  const getActivePlanForStudent = useCallback(
    (studentId: string) =>
      studentPlans.find(
        (plan) => plan.studentId === studentId && plan.status === 'active',
      ),
    [studentPlans],
  );

  const upsertPlanPayment = useCallback(
    (studentId: string, option: PlanOption, billing: StudentPlan['billing']) => {
      const amount = billing === 'recurring' ? option.priceMonthly : option.priceUpfront;
      const issueDate = new Date();
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);

      const issueDateFormatted = issueDate.toISOString().slice(0, 10);
      const dueDateFormatted = dueDate.toISOString().slice(0, 10);
      const description = `${option.weeklyClasses}x semana · ${option.durationMonths}m (${billing === 'recurring' ? 'mensal' : 'à vista'})`;

      const existingEnrollmentId = enrollments.find(
        (enrollment) => enrollment.studentId === studentId && enrollment.status === 'active',
      )?.id;

      let targetedPaymentId: string | undefined;
      let targetedEnrollmentId: string | undefined = existingEnrollmentId;

      setPayments((prev) => {
        let updated = false;
        const next = prev.map((payment) => {
          if (payment.studentId === studentId && payment.status !== 'paid' && !updated) {
            targetedPaymentId = payment.id;
            targetedEnrollmentId = payment.enrollmentId ?? targetedEnrollmentId;
            updated = true;
            return {
              ...payment,
              amount,
              dueDate: dueDateFormatted,
              description,
              status: 'pending',
            } satisfies Payment;
          }

          return payment;
        });

        if (!updated) {
          const payment: Payment = {
            id: generateId('payment'),
            studentId,
            amount,
            currency: 'BRL',
            method: 'pix',
            status: 'pending',
            dueDate: dueDateFormatted,
            description,
          };

          targetedPaymentId = payment.id;
          targetedEnrollmentId = payment.enrollmentId ?? targetedEnrollmentId;
          next.push(payment);
        }

        return next.sort(
          (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
        );
      });

      if (!targetedPaymentId) return;

      const paymentId = targetedPaymentId!;
      const enrollmentId = targetedEnrollmentId ?? `${studentId}-unassigned-plan`;

      setInvoices((prev) => {
        const existing = prev.find((invoice) => invoice.paymentId === paymentId);
        if (existing) {
          return prev.map((invoice) =>
            invoice.paymentId === paymentId
              ? {
                  ...invoice,
                  issueDate: issueDateFormatted,
                  total: amount,
                  status: 'open',
                  reference: invoice.reference ?? `${issueDate.getMonth() + 1}/${issueDate.getFullYear()}`,
                }
              : invoice,
          );
        }

        const invoice: Invoice = {
          id: generateId('invoice'),
          paymentId,
          enrollmentId,
          issueDate: issueDateFormatted,
          reference: `${issueDate.getMonth() + 1}/${issueDate.getFullYear()} - Plano semanal`,
          total: amount,
          currency: 'BRL',
          status: 'open',
        };

        return [...prev, invoice];
      });

      setPaymentIntents((prev) =>
        prev.map((intent) =>
          intent.paymentId === paymentId
            ? { ...intent, amount, enrollmentId }
            : intent,
        ),
      );

      logEvent('payment_posted', 'Cobrança atualizada para refletir novo plano.', {
        studentId,
        paymentId,
        amount,
        billing,
      });
    },
    [enrollments, logEvent],
  );

  const selectPlanForStudent = useCallback(
    (studentId: string, planOptionId: string, billing: StudentPlan['billing']) => {
      const option = planOptions.find((item) => item.id === planOptionId);
      if (!option) {
        throw new Error('Plano selecionado não encontrado.');
      }

      const now = new Date();
      const newPlan: StudentPlan = {
        id: generateId('plan'),
        studentId,
        planOptionId,
        billing,
        startDate: now.toISOString(),
        endDate: new Date(now.getFullYear(), now.getMonth() + option.durationMonths, now.getDate()).toISOString(),
        status: 'active',
      };

      setStudentPlans((prev) => {
        const filtered = prev.filter((plan) => plan.studentId !== studentId);
        return [...filtered, newPlan];
      });

      logEvent('enrollment_created', 'Plano selecionado/atualizado pelo aluno', {
        studentId,
        planOptionId,
        billing,
      });

      upsertPlanPayment(studentId, option, billing);

      return newPlan;
    },
    [logEvent, planOptions, upsertPlanPayment],
  );

  const getWeeklyUsageForStudent = useCallback(
    (studentId: string, referenceDate = new Date()) => {
      const activePlan = getActivePlanForStudent(studentId);
      const weekStart = startOfWeekIso(referenceDate);
      const reinstated = creditReinstatements
        .filter((item) => item.studentId === studentId && item.weekStart === weekStart)
        .reduce((sum, item) => sum + item.amount, 0);
      const limit = (activePlan?.planOptionId
        ? planOptions.find((item) => item.id === activePlan.planOptionId)?.weeklyClasses ?? 0
        : 0) + reinstated;

      const bookingsThisWeek = sessionBookings.filter(
        (booking) => booking.studentId === studentId && booking.weekStart === weekStart && booking.status === 'booked',
      ).length;

      const enrollmentsThisWeek = enrollments.filter(
        (enrollment) =>
          enrollment.studentId === studentId &&
          enrollment.status !== 'cancelled' &&
          startOfWeekIso(new Date(enrollment.createdAt)) === weekStart,
      ).length;

      const used = Math.max(bookingsThisWeek, enrollmentsThisWeek);

      return { used, limit, remaining: Math.max(limit - used, 0), weekStart };
    },
    [creditReinstatements, enrollments, getActivePlanForStudent, planOptions, sessionBookings],
  );

  const isSessionBooked = useCallback(
    (sessionId: string, studentId: string) =>
      sessionBookings.some(
        (booking) => booking.sessionId === sessionId && booking.studentId === studentId && booking.status === 'booked',
      ),
    [sessionBookings],
  );

  const bookSessionForStudent = useCallback(
    (sessionId: string, studentId: string) => {
      const targetSession = sessions.find((item) => item.id === sessionId);
      const activePlan = getActivePlanForStudent(studentId);
      if (!targetSession || !activePlan) {
        throw new Error('Sessão ou plano não localizado para realizar a reserva.');
      }

      const usage = getWeeklyUsageForStudent(studentId, new Date(targetSession.startTime));
      if (isSessionBooked(sessionId, studentId)) {
        throw new Error('Você já tem essa sessão reservada.');
      }

      if (usage.used >= usage.limit) {
        throw new Error('Limite semanal de aulas atingido.');
      }

      const newBooking: SessionBooking = {
        id: generateId('booking'),
        studentId,
        sessionId,
        weekStart: usage.weekStart,
        createdAt: new Date().toISOString(),
        status: 'booked',
      };

      setSessionBookings((prev) => [...prev, newBooking]);
      logEvent('enrollment_created', 'Reserva realizada com base no plano semanal', {
        studentId,
        sessionId,
        weekStart: usage.weekStart,
      });

      return newBooking;
    },
    [getActivePlanForStudent, getWeeklyUsageForStudent, isSessionBooked, logEvent, sessions],
  );

  const reinstateClassForWeek = useCallback(
    (studentId: string, weekStart: string, amount = 1, notes?: string) => {
      const reinstatement: CreditReinstatement = {
        id: generateId('reinstatement'),
        studentId,
        weekStart,
        amount,
        notes,
        createdAt: new Date().toISOString(),
      };

      setCreditReinstatements((prev) => [...prev, reinstatement]);
      logEvent('attendance_marked', 'Crédito semanal reinserido pelo instrutor', {
        studentId,
        weekStart,
        amount,
      });

      return reinstatement;
    },
    [logEvent],
  );

  const getEnrollmentForStudent = useCallback(
    (studentId: string, classId: string) =>
      enrollments.find((item) => item.studentId === studentId && item.classId === classId),
    [enrollments],
  );

  const enrollStudentInClass = useCallback(
    (studentId: string, classId: string) => {
      const activePlan = getActivePlanForStudent(studentId);
      const weeklyUsage = getWeeklyUsageForStudent(studentId);

      if (!activePlan) {
        const message = 'Um plano ativo é necessário para se inscrever em aulas.';
        logEvent('validation_error', message, { studentId, classId });
        throw new Error(message);
      }

      if (weeklyUsage.limit === 0 || weeklyUsage.remaining <= 0) {
        const message = 'Limite semanal atingido. Selecione um plano com mais aulas ou espere a próxima semana.';
        logEvent('validation_error', message, { studentId, classId, weekStart: weeklyUsage.weekStart });
        throw new Error(message);
      }

      const existing = enrollments.find(
        (enrollment) => enrollment.studentId === studentId && enrollment.classId === classId,
      );

      const now = new Date().toISOString();
      const classInfo = classes.find((item) => item.id === classId);
      if (!classInfo) {
        const message = 'Turma não encontrada para inscrição.';
        logEvent('validation_error', message, { studentId, classId });
        throw new Error(message);
      }
      const activeCount = enrollments.filter(
        (item) => item.classId === classId && item.status === 'active',
      ).length;
      const isWaitlist = classInfo ? activeCount >= classInfo.capacity : false;

      if (existing && existing.status !== 'cancelled') {
        logEvent('validation_error', 'Tentativa de inscrição duplicada bloqueada.', {
          studentId,
          classId,
          enrollmentId: existing.id,
        });
        return { enrollment: existing, isWaitlist: existing.status === 'waitlist', alreadyEnrolled: true };
      }

      if (existing && existing.status === 'cancelled') {
        const reactivated: Enrollment = {
          ...existing,
          status: isWaitlist ? 'waitlist' : 'active',
          createdAt: now,
          updatedAt: now,
        };

        setEnrollments((prev) =>
          prev.map((enrollment) => (enrollment.id === existing.id ? reactivated : enrollment)),
        );

        logEvent('enrollment_created', 'Inscrição reativada após cancelamento.', {
          enrollmentId: existing.id,
          classId,
          studentId,
          waitlisted: isWaitlist,
        });

        return { enrollment: reactivated, isWaitlist, alreadyEnrolled: false };
      }

      const enrollment: Enrollment = {
        id: generateId('enrollment'),
        studentId,
        classId,
        status: isWaitlist ? 'waitlist' : 'active',
        createdAt: now,
        updatedAt: now,
      };

      setEnrollments((prev) => [...prev, enrollment]);
      logEvent('enrollment_created', 'Inscrição criada com validação de capacidade.', {
        enrollmentId: enrollment.id,
        classId,
        studentId,
        waitlisted: isWaitlist,
      });

      return { enrollment, isWaitlist, alreadyEnrolled: false };
    },
    [classes, enrollments, getActivePlanForStudent, getWeeklyUsageForStudent, logEvent],
  );

  const getCapacityUsage = useCallback(
    (classId: string) => {
      const classInfo = classes.find((item) => item.id === classId);
      const capacity = classInfo?.capacity ?? 0;
      const active = enrollments.filter(
        (enrollment) => enrollment.classId === classId && enrollment.status === 'active',
      ).length;
      return { active, capacity, available: Math.max(capacity - active, 0) };
    },
    [classes, enrollments],
  );

  const rosterByClass = useMemo(() => {
    return enrollments.reduce<Record<string, RosterEntry[]>>((acc, enrollment) => {
      if (enrollment.status === 'cancelled') return acc;

      const student = students.find((item) => item.id === enrollment.studentId);
      if (!student) return acc;

      const existingAttendance = attendance.find(
        (entry) => entry.enrollmentId === enrollment.id,
      );
      const paymentInfo = resolvePaymentStatus(payments, invoices, enrollment.id);

      const entry: RosterEntry = {
        enrollment,
        student,
        attendance: existingAttendance,
        ...paymentInfo,
      };

      acc[enrollment.classId] = [...(acc[enrollment.classId] ?? []), entry];
      return acc;
    }, {});
  }, [attendance, enrollments, invoices, payments, students]);

  const outstandingBalances = useMemo(() => {
    const cancelledEnrollmentIds = new Set(
      enrollments.filter((item) => item.status === 'cancelled').map((item) => item.id),
    );

    return payments
      .filter((payment) => payment.status !== 'paid' && !cancelledEnrollmentIds.has(payment.enrollmentId ?? ''))
      .map((payment) => {
        const invoice = invoices.find((item) => item.paymentId === payment.id);
        const student = students.find((item) => item.id === payment.studentId);
        const email = seedAccounts.find((account) => account.id === student?.userId)?.email;
        const isOverdue = new Date(payment.dueDate) < new Date();
        return {
          payment,
          invoice,
          student,
          email,
          status: payment.status === 'failed' ? 'failed' : isOverdue ? 'overdue' : 'pending',
        } as const;
      });
  }, [enrollments, invoices, payments, students]);

  const getStudentAccountSnapshot = useCallback(
    (studentId: string): StudentAccountSnapshot => {
      const activeEnrollments = enrollments.filter(
        (item) => item.studentId === studentId && item.status !== 'cancelled',
      );
      const ledger = resolvePaymentLedger(payments, invoices, enrollments, studentId);
      const outstanding = ledger.filter((item) => item.status !== 'paid');
      const nextPayment = outstanding[0];
      const openBalance = outstanding.reduce((sum, entry) => sum + entry.payment.amount, 0);

      return { enrollments: activeEnrollments, ledger, outstanding, nextPayment, openBalance };
    },
    [enrollments, invoices, payments],
  );

  const analytics = useMemo<AnalyticsSnapshot>(() => {
    const totalRevenue = payments
      .filter((payment) => payment.status === 'paid')
      .reduce((sum, payment) => sum + payment.amount, 0);
    const pendingRevenue = payments
      .filter((payment) => payment.status !== 'paid')
      .reduce((sum, payment) => sum + payment.amount, 0);

    const utilizationByClass = classes.reduce<AnalyticsSnapshot['utilizationByClass']>((acc, trainingClass) => {
      const active = enrollments.filter(
        (enrollment) => enrollment.classId === trainingClass.id && enrollment.status === 'active',
      ).length;
      const utilization = trainingClass.capacity ? active / trainingClass.capacity : 0;

      acc[trainingClass.id] = {
        capacity: trainingClass.capacity,
        active,
        utilization,
      };
      return acc;
    }, {});

    const averageUtilization =
      classes.length > 0
        ? Object.values(utilizationByClass).reduce((sum, entry) => sum + entry.utilization, 0) /
          classes.length
        : 0;

    const presentCount = attendance.filter((item) => item.status === 'present').length;
    const attendanceRate = attendance.length ? presentCount / attendance.length : 0;

    const revenueByStudent = payments.reduce<Record<string, number>>((acc, payment) => {
      if (payment.status === 'paid') {
        acc[payment.studentId] = (acc[payment.studentId] ?? 0) + payment.amount;
      }
      return acc;
    }, {});

    return { totalRevenue, pendingRevenue, averageUtilization, attendanceRate, revenueByStudent, utilizationByClass };
  }, [attendance, classes, enrollments, payments]);

  const createClass = (payload: Omit<TrainingClass, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    setClasses((prev) => [
      ...prev,
      {
        ...payload,
        id: generateId('class'),
        createdAt: now,
        updatedAt: now,
      },
    ]);
  };

  const updateClass = (id: string, payload: Partial<TrainingClass>) => {
    setClasses((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...payload, updatedAt: new Date().toISOString() } : item)),
    );
  };

  const deleteClass = (id: string) => {
    setClasses((prev) => prev.filter((item) => item.id !== id));
    setSessions((prevSessions) => {
      const sessionIds = prevSessions.filter((session) => session.classId === id).map((session) => session.id);
      setAttendance((prevAttendance) =>
        prevAttendance.filter((item) => !sessionIds.includes(item.sessionId)),
      );
      return prevSessions.filter((session) => session.classId !== id);
    });
    setEnrollments((prev) => prev.filter((enrollment) => enrollment.classId !== id));
  };

  const createSession = (payload: Omit<ClassSession, 'id'>) => {
    setSessions((prev) => [...prev, { ...payload, id: generateId('session') }]);
  };

  const updateSession = (id: string, payload: Partial<ClassSession>) => {
    setSessions((prev) => prev.map((item) => (item.id === id ? { ...item, ...payload } : item)));
  };

  const deleteSession = (id: string) => {
    setSessions((prev) => prev.filter((item) => item.id !== id));
    setAttendance((prev) => prev.filter((item) => item.sessionId !== id));
  };

  const toggleAttendance = (
    sessionId: string,
    enrollmentId: string,
    status: Attendance['status'],
  ) => {
    setAttendance((prev) => {
      const existing = prev.find(
        (entry) => entry.sessionId === sessionId && entry.enrollmentId === enrollmentId,
      );

      if (existing) {
        return prev.map((entry) =>
          entry.id === existing.id ? { ...entry, status, checkedInAt: new Date().toISOString() } : entry,
        );
      }

      return [
        ...prev,
        {
          id: generateId('attendance'),
          sessionId,
          enrollmentId,
          status,
          checkedInAt: new Date().toISOString(),
        },
      ];
    });
    logEvent('attendance_marked', 'Status de presença atualizado manualmente.', {
      sessionId,
      enrollmentId,
      status,
    });
  };

  const recordCheckIn = useCallback(
    (sessionId: string, enrollmentId: string, method: 'qr' | 'manual') => {
      if (!sessions.some((item) => item.id === sessionId)) {
        const message = 'Sessão não encontrada para check-in.';
        logEvent('validation_error', message, { sessionId, enrollmentId });
        throw new Error(message);
      }

      const enrollment = enrollments.find((item) => item.id === enrollmentId);
      if (!enrollment) {
        const message = 'Matrícula não encontrada. Conclua a inscrição antes do check-in.';
        logEvent('validation_error', message, { sessionId, enrollmentId });
        throw new Error(message);
      }

      if (enrollment.status === 'waitlist') {
        const message = 'Inscrições em lista de espera não permitem check-in.';
        logEvent('validation_error', message, { sessionId, enrollmentId });
        throw new Error(message);
      }

      const paymentGate = resolvePaymentStatus(payments, invoices, enrollmentId);
      if (paymentGate.paymentStatus !== 'paid') {
        const message = 'Pagamento pendente ou em atraso impede o check-in.';
        logEvent('validation_error', message, {
          sessionId,
          enrollmentId,
          paymentStatus: paymentGate.paymentStatus,
        });
        throw new Error(message);
      }

      const note = method === 'qr' ? 'Check-in via QR Code' : 'Check-in manual';
      let created: Attendance | undefined;

      setAttendance((prev) => {
        const existing = prev.find(
          (entry) => entry.sessionId === sessionId && entry.enrollmentId === enrollmentId,
        );

        if (existing) {
          created = { ...existing, status: 'present', checkedInAt: new Date().toISOString(), notes: note };
          return prev.map((entry) => (entry.id === existing.id ? created! : entry));
        }

        created = {
          id: generateId('attendance'),
          sessionId,
          enrollmentId,
          status: 'present',
          checkedInAt: new Date().toISOString(),
          notes: note,
        };

        return [...prev, created];
      });

      if (!created) {
        created = {
          id: generateId('attendance'),
          sessionId,
          enrollmentId,
          status: 'present',
          checkedInAt: new Date().toISOString(),
          notes: note,
        };
        setAttendance((prev) => [...prev, created!]);
      }

      logEvent('attendance_marked', 'Check-in registrado após validação de pagamento.', {
        sessionId,
        enrollmentId,
        method,
      });
      return created;
    },
    [enrollments, invoices, logEvent, payments, sessions],
  );

  const updateEnrollmentStatus = (enrollmentId: string, status: Enrollment['status']) => {
    setEnrollments((prev) =>
      prev.map((enrollment) => (enrollment.id === enrollmentId ? { ...enrollment, status } : enrollment)),
    );
  };

  const cancelEnrollment = useCallback(
    (enrollmentId: string) => {
      const nowIso = new Date().toISOString();
      setEnrollments((prev) =>
        prev.map((enrollment) =>
          enrollment.id === enrollmentId
            ? { ...enrollment, status: 'cancelled', updatedAt: nowIso }
            : enrollment,
        ),
      );

      setPayments((prev) =>
        prev.map((payment) =>
          payment.enrollmentId === enrollmentId
            ? {
                ...payment,
                status: 'failed',
                description: payment.description
                  ? `${payment.description} (cancelado)`
                  : 'Pagamento cancelado',
              }
            : payment,
        ),
      );

      setInvoices((prev) =>
        prev.map((invoice) =>
          invoice.enrollmentId === enrollmentId
            ? { ...invoice, status: 'void', notes: invoice.notes ?? 'Cancelado pelo aluno.' }
            : invoice,
        ),
      );

      logEvent('enrollment_cancelled', 'Inscrição cancelada pelo aluno.', { enrollmentId });
    },
    [logEvent],
  );

  const createEvaluation = useCallback((payload: Omit<Evaluation, 'id'>) => {
    setEvaluations((prev) => [{ ...payload, id: generateId('evaluation') }, ...prev]);
  }, []);

  const updateEvaluation = useCallback((id: string, payload: Partial<Evaluation>) => {
    setEvaluations((prev) => prev.map((item) => (item.id === id ? { ...item, ...payload } : item)));
  }, []);

  const deleteEvaluation = useCallback((id: string) => {
    setEvaluations((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const createGoal = useCallback((payload: Omit<Goal, 'id'>) => {
    setGoals((prev) => [{ ...payload, id: generateId('goal') }, ...prev]);
  }, []);

  const updateGoal = useCallback((id: string, payload: Partial<Goal>) => {
    setGoals((prev) => prev.map((item) => (item.id === id ? { ...item, ...payload } : item)));
  }, []);

  const deleteGoal = useCallback((id: string) => {
    setGoals((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const getStudentEvaluations = useCallback(
    (studentId: string) =>
      evaluations
        .filter((evaluation) => evaluation.studentId === studentId)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [evaluations],
  );

  const chargeStoredCard = useCallback(
    (studentId: string, amount: number, description: string) => {
      const now = new Date();
      const payment: Payment = {
        id: generateId('payment'),
        studentId,
        amount,
        currency: 'BRL',
        method: 'credit_card',
        status: 'paid',
        dueDate: now.toISOString().slice(0, 10),
        paidAt: now.toISOString(),
        description,
      };

      setPayments((prev) => [payment, ...prev]);
      logEvent('payment_posted', 'Pagamento lançado no cartão em arquivo.', {
        paymentId: payment.id,
        studentId,
        amount,
        status: payment.status,
      });
      return payment;
    },
    [logEvent],
  );

  const createOneTimePayment = useCallback(
    (studentId: string, amount: number, method: Payment['method'], description: string) => {
      const now = new Date();
      const payment: Payment = {
        id: generateId('payment'),
        studentId,
        amount,
        currency: 'BRL',
        method,
        status: method === 'credit_card' ? 'paid' : 'pending',
        dueDate: now.toISOString().slice(0, 10),
        paidAt: method === 'credit_card' ? now.toISOString() : undefined,
        description,
      };

      setPayments((prev) => [payment, ...prev]);
      logEvent('payment_posted', 'Pagamento avulso registrado.', {
        paymentId: payment.id,
        studentId,
        amount,
        status: payment.status,
        method: payment.method,
      });
      return payment;
    },
    [logEvent],
  );

  const createPaymentIntentForEnrollment = useCallback(
    (enrollmentId: string, amount: number, method: Payment['method'], description: string) => {
      const enrollment = enrollments.find((item) => item.id === enrollmentId);
      const now = new Date();
      const studentId = enrollment?.studentId ?? 'student-unknown';

      const payment: Payment = {
        id: generateId('payment'),
        studentId,
        enrollmentId,
        amount,
        currency: 'BRL',
        method,
        status: 'pending',
        dueDate: now.toISOString().slice(0, 10),
        description,
      };

      const invoice: Invoice = {
        id: generateId('invoice'),
        paymentId: payment.id,
        enrollmentId,
        issueDate: now.toISOString().slice(0, 10),
        reference: `${description} - ${now.getMonth() + 1}/${now.getFullYear()}`,
        total: amount,
        currency: 'BRL',
        status: 'open',
      };

      const intent: PaymentIntent = {
        id: generateId('pi'),
        paymentId: payment.id,
        enrollmentId,
        amount,
        currency: 'BRL',
        paymentMethod: method,
        status: 'requires_payment_method',
        clientSecret: `secret_${payment.id}`,
      };

      setPayments((prev) => [payment, ...prev]);
      setInvoices((prev) => [invoice, ...prev]);
      setPaymentIntents((prev) => [intent, ...prev]);
      logEvent('payment_posted', 'Intent de pagamento criada para matrícula.', {
        paymentId: payment.id,
        enrollmentId,
        status: payment.status,
        amount,
      });

      return intent;
    },
    [enrollments, logEvent],
  );

  const startPaymentSession = useCallback(
    (intentId: string, fallbackIntent?: PaymentIntent) => {
      const intent = paymentIntents.find((item) => item.id === intentId) ?? fallbackIntent;
      if (!intent) {
        throw new Error('Intent de pagamento não encontrada.');
      }

      const now = new Date();
      const session: PaymentSession = {
        id: generateId('ps'),
        intentId,
        status: 'open',
        checkoutUrl: `https://pagamentos.dottosports.test/${intentId}`,
        createdAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + 30 * 60 * 1000).toISOString(),
      };

      setPaymentIntents((prev) =>
        prev.map((item) => (item.id === intentId ? { ...item, status: 'processing' } : item)),
      );
      setPaymentSessions((prev) => [session, ...prev]);

      return session;
    },
    [paymentIntents],
  );

  const processPaymentWebhook = useCallback(
    (
      sessionId: string,
      result: 'succeeded' | 'failed',
      failureReason?: string,
      sessionOverride?: PaymentSession,
      intentOverride?: PaymentIntent,
    ) => {
      const session = sessionOverride ?? paymentSessions.find((item) => item.id === sessionId);
      if (!session) return;

      const intent = intentOverride ?? paymentIntents.find((item) => item.id === session.intentId);
      if (!intent) return;

      const nowIso = new Date().toISOString();
      const fees = intent.amount * 0.05;
      const paymentId = intent.paymentId;

      setPaymentSessions((prev) =>
        prev.map((item) =>
          item.id === sessionId
            ? { ...item, status: 'completed', lastWebhookStatus: result, failureReason }
            : item,
        ),
      );

      if (result === 'succeeded') {
        const receipt: Receipt = {
          id: generateId('receipt'),
          paymentId,
          enrollmentId: intent.enrollmentId,
          issuedAt: nowIso,
          downloadUrl: `https://pagamentos.dottosports.test/recibos/${paymentId}.pdf`,
          reference: `REC-${paymentId}`,
        };

        const settlement: Settlement = {
          id: generateId('settlement'),
          period: nowIso.slice(0, 10),
          gross: intent.amount,
          fees,
          net: intent.amount - fees,
          depositedAt: nowIso,
          receiptIds: [receipt.id],
        };

        setPaymentIntents((prev) =>
          prev.map((item) => (item.id === intent.id ? { ...item, status: 'succeeded' } : item)),
        );
        setPayments((prev) =>
          prev.map((payment) =>
            payment.id === paymentId
              ? { ...payment, status: 'paid', paidAt: nowIso, receiptId: receipt.id }
              : payment,
          ),
        );
        setInvoices((prev) =>
          prev.map((invoice) =>
            invoice.paymentId === paymentId ? { ...invoice, status: 'paid' } : invoice,
          ),
        );
        setReceipts((prev) => [receipt, ...prev]);
        setSettlements((prev) => [settlement, ...prev]);
        logEvent('payment_posted', 'Pagamento confirmado e conciliado.', {
          paymentId,
          intentId: intent.id,
          sessionId,
          status: 'paid',
          amount: intent.amount,
          receiptId: receipt.id,
        });
      } else {
        setPaymentIntents((prev) =>
          prev.map((item) =>
            item.id === intent.id ? { ...item, status: 'failed', paymentMethod: intent.paymentMethod } : item,
          ),
        );
        setPayments((prev) =>
          prev.map((payment) =>
            payment.id === paymentId
              ? { ...payment, status: 'failed', description: failureReason ?? payment.description }
              : payment,
          ),
        );
        setInvoices((prev) =>
          prev.map((invoice) =>
            invoice.paymentId === paymentId
              ? { ...invoice, status: 'open', notes: failureReason ?? invoice.notes }
              : invoice,
          ),
        );
        logEvent('payment_posted', 'Pagamento marcado como falho após webhook.', {
          paymentId,
          intentId: intent.id,
          sessionId,
          status: 'failed',
          amount: intent.amount,
          failureReason,
        });
      }
    },
    [logEvent, paymentIntents, paymentSessions],
  );

  const payOutstandingPayment = useCallback(
    (paymentId: string) => {
      const payment = payments.find((item) => item.id === paymentId);
      if (!payment) {
        throw new Error('Cobrança não encontrada.');
      }

      if (!payment.enrollmentId) {
        throw new Error('Não foi possível localizar a matrícula associada a esta cobrança.');
      }

      const existingIntent = paymentIntents.find(
        (item) => item.paymentId === paymentId && item.status !== 'succeeded',
      );

      const intent: PaymentIntent =
        existingIntent ?? {
          id: generateId('pi'),
          paymentId,
          enrollmentId: payment.enrollmentId,
          amount: payment.amount,
          currency: payment.currency,
          paymentMethod: payment.method,
          status: 'requires_payment_method',
          clientSecret: `secret_${paymentId}`,
        };

      if (!existingIntent) {
        setPaymentIntents((prev) => [intent, ...prev]);
      }

      const session = startPaymentSession(intent.id, intent);
      processPaymentWebhook(session.id, 'succeeded', undefined, session, intent);

      return { session, intent };
    },
    [paymentIntents, payments, processPaymentWebhook, startPaymentSession],
  );

  const updateCardOnFile = useCallback((payload: Partial<CardOnFile>) => {
    setCardOnFile((prev) => ({ ...prev, ...payload }));
  }, []);

  const value = useMemo(
    () => ({
      classes,
      sessions,
      enrollments,
      attendance,
      students,
      payments,
      invoices,
      paymentIntents,
      paymentSessions,
      receipts,
      settlements,
      planOptions,
      studentPlans,
      sessionBookings,
      creditReinstatements,
      evaluations,
      goals,
      events,
      analytics,
      outstandingBalances,
      cardOnFile,
      rosterByClass,
      getStudentAccountSnapshot,
      payOutstandingPayment,
      createClass,
      updateClass,
      deleteClass,
      createSession,
      updateSession,
      deleteSession,
      ensureStudentProfile,
      getStudentProfileForEmail,
      getActivePlanForStudent,
      selectPlanForStudent,
      getWeeklyUsageForStudent,
      isSessionBooked,
      bookSessionForStudent,
      reinstateClassForWeek,
      getEnrollmentForStudent,
      enrollStudentInClass,
      getCapacityUsage,
      toggleAttendance,
      recordCheckIn,
      chargeStoredCard,
      createOneTimePayment,
      createPaymentIntentForEnrollment,
      startPaymentSession,
      processPaymentWebhook,
      updateCardOnFile,
      updateEnrollmentStatus,
      cancelEnrollment,
      createEvaluation,
      updateEvaluation,
      deleteEvaluation,
      createGoal,
      updateGoal,
      deleteGoal,
      getStudentEvaluations,
    }),
    [
      classes,
      sessions,
      enrollments,
      attendance,
      students,
      payments,
      invoices,
      paymentIntents,
      paymentSessions,
      receipts,
      settlements,
      planOptions,
      studentPlans,
      sessionBookings,
      creditReinstatements,
      evaluations,
      goals,
      events,
      analytics,
      outstandingBalances,
      cardOnFile,
      rosterByClass,
      getStudentAccountSnapshot,
      payOutstandingPayment,
      ensureStudentProfile,
      getStudentProfileForEmail,
      getActivePlanForStudent,
      selectPlanForStudent,
      getWeeklyUsageForStudent,
      isSessionBooked,
      bookSessionForStudent,
      reinstateClassForWeek,
      enrollStudentInClass,
      getCapacityUsage,
      getEnrollmentForStudent,
      recordCheckIn,
      chargeStoredCard,
      createOneTimePayment,
      createPaymentIntentForEnrollment,
      startPaymentSession,
      processPaymentWebhook,
      updateCardOnFile,
      updateEnrollmentStatus,
      cancelEnrollment,
      createEvaluation,
      updateEvaluation,
      deleteEvaluation,
      createGoal,
      updateGoal,
      deleteGoal,
      getStudentEvaluations,
    ],
  );

  return <InstructorDataContext.Provider value={value}>{children}</InstructorDataContext.Provider>;
}

export const useInstructorData = () => {
  const context = useContext(InstructorDataContext);
  if (!context) {
    throw new Error('useInstructorData must be used within InstructorDataProvider');
  }
  return context;
};
