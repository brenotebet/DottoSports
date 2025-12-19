import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type Unsubscribe,
} from 'firebase/firestore';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import type {
  Attendance,
  ClassSession,
  CreditReinstatement,
  Enrollment,
  Evaluation,
  Goal,
  InstructorProfile,
  Invoice,
  Payment,
  PaymentIntent,
  PaymentSession,
  PlanOption,
  Receipt,
  SessionBooking,
  Settlement,
  StudentPlan,
  StudentProfile,
  TrainingClass,
  UserAccount,
} from '@/constants/schema';
import { db } from '@/services/firebase';
import { resolveStudentProfileId } from '@/services/student-profile-resolver';
import { useAuth } from './auth-provider';

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

type StudentIdentity = {
  studentUid: string;
  studentId: string;
};

type StudentOwned = { studentId?: string; studentUid?: string };

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
  instructorProfiles: InstructorProfile[];
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
  loading: boolean;
  reloadFromStorage: () => Promise<void>;
  getStudentAccountSnapshot: (studentId: string) => StudentAccountSnapshot;
  payOutstandingPayment: (paymentId: string) => Promise<{ session: PaymentSession; intent: PaymentIntent }>;
  createClass: (payload: Omit<TrainingClass, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateClass: (id: string, payload: Partial<TrainingClass>) => Promise<void>;
  deleteClass: (id: string) => Promise<void>;
  createSession: (payload: Omit<ClassSession, 'id'>) => Promise<void>;
  updateSession: (id: string, payload: Partial<ClassSession>) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  ensureStudentProfile: (email: string, displayName: string) => Promise<StudentProfile>;
  getEnrollmentForStudent: (studentId: string, classId: string) => Enrollment | undefined;
  enrollStudentInClass: (
    studentUid: string,
    classId: string,
  ) => Promise<{ enrollment: Enrollment; isWaitlist: boolean; alreadyEnrolled: boolean }>;
  getCapacityUsage: (classId: string) => { active: number; capacity: number; available: number };
  toggleAttendance: (
    sessionId: string,
    enrollmentId: string,
    status: Attendance['status'],
  ) => Promise<void>;
  getActivePlanForStudent: (studentId: string) => StudentPlan | undefined;
  selectPlanForStudent: (studentUid: string, planOptionId: string, billing: StudentPlan['billing']) => Promise<StudentPlan>;
  getWeeklyUsageForStudent: (
    studentId: string,
    referenceDate?: Date,
  ) => { used: number; limit: number; remaining: number; weekStart: string };
  isSessionBooked: (sessionId: string, studentId: string) => boolean;
  bookSessionForStudent: (sessionId: string, studentUid: string) => Promise<SessionBooking>;
  reinstateClassForWeek: (studentUid: string, weekStart: string, amount?: number, notes?: string) => Promise<CreditReinstatement>;
  recordCheckIn: (sessionId: string, enrollmentId: string, method: 'qr' | 'manual') => Promise<Attendance>;
  chargeStoredCard: (studentUid: string, amount: number, description: string) => Promise<Payment>;
  createOneTimePayment: (
    studentUid: string,
    amount: number,
    method: Payment['method'],
    description: string,
  ) => Promise<Payment>;
  updateCardOnFile: (payload: Partial<CardOnFile>) => void;
  updateEnrollmentStatus: (enrollmentId: string, status: Enrollment['status']) => Promise<void>;
  createPaymentIntentForEnrollment: (
    enrollmentId: string,
    amount: number,
    method: Payment['method'],
    description: string,
  ) => Promise<PaymentIntent>;
  startPaymentSession: (intentId: string, fallbackIntent?: PaymentIntent) => Promise<PaymentSession>;
  processPaymentWebhook: (
    sessionId: string,
    result: 'succeeded' | 'failed',
    failureReason?: string,
    sessionOverride?: PaymentSession,
    intentOverride?: PaymentIntent,
  ) => Promise<void>;
  cancelEnrollment: (enrollmentId: string) => Promise<void>;
  createEvaluation: (payload: Omit<Evaluation, 'id'>) => Promise<void>;
  updateEvaluation: (id: string, payload: Partial<Evaluation>) => Promise<void>;
  deleteEvaluation: (id: string) => Promise<void>;
  createGoal: (payload: Omit<Goal, 'id'>) => Promise<void>;
  updateGoal: (id: string, payload: Partial<Goal>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  getStudentProfileForEmail: (email: string, displayName?: string) => Promise<StudentProfile>;
  getStudentEvaluations: (studentId: string) => Evaluation[];
};

const InstructorDataContext = createContext<InstructorDataContextValue | undefined>(undefined);

const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.round(Math.random() * 1000)}`;
const ALLOWED_WEEKLY_CLASSES = [2, 4, 6];
const isPermissionDenied = (error: unknown) =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  typeof (error as { code: unknown }).code === 'string' &&
  String((error as { code: string }).code).toLowerCase().includes('permission');

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
  identity: StudentIdentity,
): PaymentLedgerEntry[] => {
  const cancelledEnrollmentIds = new Set(
    enrollments.filter((item) => item.status === 'cancelled').map((item) => item.id),
  );

  return payments
    .filter(
      (payment) =>
        matchesStudentIdentity(payment, identity) && !cancelledEnrollmentIds.has(payment.enrollmentId ?? ''),
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

const mergeById = <T extends { id: string }>(primary: T[], secondary: T[] = []) => {
  const map = new Map<string, T>();
  [...secondary, ...primary].forEach((item) => map.set(item.id, item));
  return Array.from(map.values());
};

const matchesStudentIdentity = (record: StudentOwned, identity: StudentIdentity) =>
  record.studentUid === identity.studentUid || record.studentId === identity.studentId;

export function InstructorDataProvider({ children }: { children: ReactNode }) {
  const [classes, setClasses] = useState<TrainingClass[]>([]);
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [paymentIntents, setPaymentIntents] = useState<PaymentIntent[]>([]);
  const [paymentSessions, setPaymentSessions] = useState<PaymentSession[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [planOptions, setPlanOptions] = useState<PlanOption[]>([]);
  const [studentPlans, setStudentPlans] = useState<StudentPlan[]>([]);
  const [sessionBookings, setSessionBookings] = useState<SessionBooking[]>([]);
  const [creditReinstatements, setCreditReinstatements] = useState<CreditReinstatement[]>([]);
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [instructorProfiles, setInstructorProfiles] = useState<InstructorProfile[]>([]);
  const [users, setUsers] = useState<Array<UserAccount & { displayName?: string }>>([]);
  const [cardOnFile, setCardOnFile] = useState<CardOnFile>(defaultCard);
  const [events, setEvents] = useState<SystemEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, hasRole, initializing } = useAuth();
  const [studentProfileId, setStudentProfileId] = useState<string | null | undefined>(undefined);
  const createCollectionId = useCallback((path: string) => doc(collection(db, path)).id, []);

  const normalizeFirestoreValue = useCallback((value: unknown): unknown => {
    if (!value) return value;
    if (typeof value === 'object' && 'toDate' in (value as Record<string, unknown>)) {
      try {
        const timestamp = (value as { toDate: () => Date }).toDate();
        return timestamp.toISOString();
      } catch {
        return value;
      }
    }

    if (Array.isArray(value)) {
      return value.map((item) => normalizeFirestoreValue(item));
    }

    if (typeof value === 'object') {
      return Object.entries(value as Record<string, unknown>).reduce<Record<string, unknown>>((acc, [key, entry]) => {
        acc[key] = normalizeFirestoreValue(entry);
        return acc;
      }, {});
    }

    return value;
  }, []);

  const mapSnapshot = useCallback(
    <T,>(snapshot: DocumentData, id: string): T => {
      const normalized = normalizeFirestoreValue(snapshot) as Record<string, unknown>;
      return { id, ...normalized } as T;
    },
    [normalizeFirestoreValue],
  );

  const filterPlanOptions = useCallback((items: PlanOption[]) => {
    setPlanOptions(items.filter((option) => ALLOWED_WEEKLY_CLASSES.includes(option.weeklyClasses)));
  }, []);

  const isInstructor = hasRole(['INSTRUCTOR', 'ADMIN']);

  const resolveStudentProfileIdForIdentifier = useCallback(
    async (studentIdentifier?: string | null) => {
      const target = studentIdentifier ?? user?.uid;
      if (!target) {
        throw new Error('Você precisa estar autenticado para localizar um perfil de aluno.');
      }

      const studentById = studentIdentifier ? students.find((profile) => profile.id === studentIdentifier) : undefined;
      if (studentById) return studentById.id;

      const studentByUser = students.find((profile) => profile.userId === target);
      if (studentByUser) return studentByUser.id;

      if (!studentIdentifier && studentProfileId) {
        return studentProfileId;
      }

      const resolved = await resolveStudentProfileId(target);
      if (resolved) return resolved;

      if (studentIdentifier) return studentIdentifier;

      throw new Error('Perfil de aluno não encontrado para o usuário atual.');
    },
    [studentProfileId, students, user],
  );

  const normalizeStudentProfileId = useCallback(
    (identifier: string) => {
      if (!identifier) return identifier;
      const studentById = students.find((profile) => profile.id === identifier);
      if (studentById) return studentById.id;

      const studentByUser = students.find((profile) => profile.userId === identifier);
      if (studentByUser) return studentByUser.id;
      if (identifier === user?.uid && studentProfileId) return studentProfileId;

      return identifier;
    },
    [studentProfileId, students, user],
  );

  const resolveStudentIdentity = useCallback(
    async (studentIdentifier?: string | null): Promise<StudentIdentity> => {
      const profileById = studentIdentifier ? students.find((profile) => profile.id === studentIdentifier) : undefined;
      const profileByUser = studentIdentifier
        ? students.find((profile) => profile.userId === studentIdentifier)
        : undefined;

      let fetchedProfileUserId: string | undefined;
      if (!profileById && studentIdentifier) {
        try {
          const snap = await getDoc(doc(db, 'studentProfiles', studentIdentifier));
          if (snap.exists()) {
            fetchedProfileUserId = (snap.data() as { userId?: string }).userId;
          }
        } catch (error) {
          console.warn('Fallback lookup for student profile identity failed', error);
        }
      }

      const studentUid =
        profileById?.userId ?? profileByUser?.userId ?? fetchedProfileUserId ?? studentIdentifier ?? user?.uid;

      if (!studentUid) {
        throw new Error('Você precisa estar autenticado para localizar um perfil de aluno.');
      }

      const studentId =
        profileById?.id ??
        profileByUser?.id ??
        (fetchedProfileUserId ? studentIdentifier ?? undefined : undefined) ??
        (studentUid === user?.uid && studentProfileId ? studentProfileId : undefined) ??
        (await resolveStudentProfileId(studentUid)) ??
        studentIdentifier ??
        studentUid;

      return { studentUid, studentId };
    },
    [studentProfileId, students, user],
  );

  const resolveCachedStudentIdentity = useCallback(
    (studentIdentifier: string): StudentIdentity => {
      const profileById = students.find((profile) => profile.id === studentIdentifier);
      const profileByUser = students.find((profile) => profile.userId === studentIdentifier);
      const studentUid = profileById?.userId ?? profileByUser?.userId ?? studentIdentifier ?? user?.uid ?? '';
      const studentId =
        profileById?.id ??
        profileByUser?.id ??
        (studentUid === user?.uid && studentProfileId ? studentProfileId : normalizeStudentProfileId(studentIdentifier));

      return { studentUid, studentId };
    },
    [normalizeStudentProfileId, studentProfileId, students, user],
  );

  const syncCurrentUserRecord = useCallback(async () => {
    if (!user) return;

    try {
      const ref = doc(db, 'users', user.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const payload = mapSnapshot<UserAccount & { displayName?: string }>(snap.data(), snap.id);
        setUsers([payload]);
        return;
      }
    } catch (error) {
      console.warn('Could not read current user document; continuing with auth payload', error);
    }

    const nowIso = new Date().toISOString();
    setUsers([
      {
        id: user.uid,
        email: user.email,
        role: user.role,
        status: 'active',
        createdAt: nowIso,
        updatedAt: nowIso,
        displayName: user.displayName,
      },
    ]);
  }, [mapSnapshot, user]);

  useEffect(() => {
    if (!user || isInstructor) {
      setStudentProfileId(null);
      return;
    }

    let isMounted = true;
    setStudentProfileId(undefined);

    void resolveStudentProfileIdForIdentifier(user.uid)
      .then((profileId) => {
        if (isMounted) setStudentProfileId(profileId);
      })
      .catch((error) => {
        console.warn('Unable to resolve student profile for user; filtering queries to empty scope', error);
        if (isMounted) setStudentProfileId(null);
      });

    return () => {
      isMounted = false;
    };
  }, [isInstructor, resolveStudentProfileIdForIdentifier, user]);

  useEffect(() => {
    if (initializing || !user) return;
    if (!isInstructor && studentProfileId === undefined) {
      setLoading(true);
      return;
    }

    const subscriptions: Unsubscribe[] = [];

    setLoading(true);

    const subscribe = <T,>(path: string, setter: (items: T[]) => void, constraints?: Parameters<typeof query>[1][]) => {
      const baseRef = collection(db, path);
      const ref = constraints && constraints.length > 0 ? query(baseRef, ...constraints) : baseRef;

      const unsubscribe = onSnapshot(
        ref,
        (snap) => {
          const payload = snap.docs.map((docSnap) => mapSnapshot<T>(docSnap.data(), docSnap.id));
          setter(payload);
          setLoading(false);
        },
        (error) => {
          console.warn(`Subscription to ${path} failed`, error);
          setLoading(false);
        },
      );
      subscriptions.push(unsubscribe);
    };

    const subscribeStudentOwned = <T extends { id: string }>(path: string, setter: (items: T[]) => void) => {
      const baseRef = collection(db, path);
      let uidDocs: T[] = [];
      let legacyDocs: T[] = [];

      const mergeAndSet = () => {
        const merged = mergeById(uidDocs, legacyDocs);
        setter(merged);
        setLoading(false);
      };

      if (user?.uid) {
        const unsubscribeUid = onSnapshot(
          query(baseRef, where('studentUid', '==', user.uid)),
          (snap) => {
            uidDocs = snap.docs.map((docSnap) => mapSnapshot<T>(docSnap.data(), docSnap.id));
            mergeAndSet();
          },
          (error) => {
            console.warn(`Subscription to ${path} (studentUid) failed`, error);
            setLoading(false);
          },
        );
        subscriptions.push(unsubscribeUid);
      }

      if (studentProfileId) {
        const unsubscribeLegacy = onSnapshot(
          query(baseRef, where('studentId', '==', studentProfileId)),
          (snap) => {
            legacyDocs = snap.docs.map((docSnap) => mapSnapshot<T>(docSnap.data(), docSnap.id));
            mergeAndSet();
          },
          (error) => {
            console.warn(`Subscription to ${path} (studentId) failed`, error);
            setLoading(false);
          },
        );
        subscriptions.push(unsubscribeLegacy);
      }
    };

    subscribe<TrainingClass>('classes', setClasses);
    subscribe<ClassSession>('sessions', setSessions);
    subscribe<PlanOption>('planOptions', filterPlanOptions);
    subscribe<InstructorProfile>('instructorProfiles', setInstructorProfiles);

    if (isInstructor) {
      subscribe<Enrollment>('enrollments', setEnrollments);
      subscribe<Attendance>('attendance', setAttendance);
      subscribe<StudentPlan>('studentPlans', setStudentPlans);
      subscribe<SessionBooking>('sessionBookings', setSessionBookings);
      subscribe<CreditReinstatement>('creditReinstatements', setCreditReinstatements);
      subscribe<StudentProfile>('studentProfiles', setStudents);
      subscribe<Payment>('payments', setPayments);
      subscribe<Invoice>('invoices', setInvoices);
      subscribe<PaymentIntent>('paymentIntents', setPaymentIntents);
      subscribe<PaymentSession>('paymentSessions', setPaymentSessions);
      subscribe<Receipt>('receipts', setReceipts);
      subscribe<Settlement>('settlements', setSettlements);
      subscribe<Evaluation>('evaluations', setEvaluations);
      subscribe<Goal>('goals', setGoals);
      subscribe<UserAccount & { displayName?: string }>('users', setUsers);
    } else {
      subscribe<StudentProfile>('studentProfiles', setStudents, [where('userId', '==', user.uid)]);
      subscribeStudentOwned<Enrollment>('enrollments', setEnrollments);
      subscribeStudentOwned<StudentPlan>('studentPlans', setStudentPlans);
      subscribeStudentOwned<SessionBooking>('sessionBookings', setSessionBookings);
      subscribeStudentOwned<CreditReinstatement>('creditReinstatements', setCreditReinstatements);
      subscribeStudentOwned<Payment>('payments', setPayments);
      subscribeStudentOwned<Evaluation>('evaluations', setEvaluations);
      subscribeStudentOwned<Goal>('goals', setGoals);
      void syncCurrentUserRecord();
    }

    return () => subscriptions.forEach((unsubscribe) => unsubscribe());
  }, [filterPlanOptions, initializing, isInstructor, mapSnapshot, studentProfileId, syncCurrentUserRecord, user]);

  const reloadFromStorage = useCallback(async () => {
    if (initializing || !user) return;
    if (!isInstructor && studentProfileId === undefined) {
      setLoading(true);
      return;
    }

    const fetchCollection = async <T,>(
      path: string,
      setter: (items: T[]) => void,
      constraints?: Parameters<typeof query>[1][],
    ) => {
      try {
        const baseRef = collection(db, path);
        const ref = constraints && constraints.length > 0 ? query(baseRef, ...constraints) : baseRef;
        const snap = await getDocs(ref);
        const payload = snap.docs.map((docSnap) => mapSnapshot<T>(docSnap.data(), docSnap.id));
        setter(payload);
      } catch (error) {
        console.warn(`Reload for ${path} skipped due to permission issue`, error);
        setter([]);
      }
    };

    const fetchStudentOwned = async <T extends { id: string }>(path: string, setter: (items: T[]) => void) => {
      const baseRef = collection(db, path);

      const uidPromise = user?.uid ? getDocs(query(baseRef, where('studentUid', '==', user.uid))) : null;
      const legacyPromise = studentProfileId ? getDocs(query(baseRef, where('studentId', '==', studentProfileId))) : null;

      try {
        const [uidSnap, legacySnap] = await Promise.all([uidPromise, legacyPromise]);
        const uidDocs = uidSnap ? uidSnap.docs.map((docSnap) => mapSnapshot<T>(docSnap.data(), docSnap.id)) : [];
        const legacyDocs = legacySnap ? legacySnap.docs.map((docSnap) => mapSnapshot<T>(docSnap.data(), docSnap.id)) : [];
        setter(mergeById(uidDocs, legacyDocs));
      } catch (error) {
        console.warn(`Reload for ${path} skipped due to permission issue`, error);
        setter([]);
      }
    };

    setLoading(true);

    const baseCollections: Promise<void>[] = [
      fetchCollection<TrainingClass>('classes', setClasses),
      fetchCollection<ClassSession>('sessions', setSessions),
      fetchCollection<PlanOption>('planOptions', filterPlanOptions),
      fetchCollection<InstructorProfile>('instructorProfiles', setInstructorProfiles),
    ];

    if (isInstructor) {
      baseCollections.push(
        fetchCollection<Enrollment>('enrollments', setEnrollments),
        fetchCollection<Attendance>('attendance', setAttendance),
        fetchCollection<StudentPlan>('studentPlans', setStudentPlans),
        fetchCollection<SessionBooking>('sessionBookings', setSessionBookings),
        fetchCollection<CreditReinstatement>('creditReinstatements', setCreditReinstatements),
        fetchCollection<StudentProfile>('studentProfiles', setStudents),
        fetchCollection<Payment>('payments', setPayments),
        fetchCollection<Invoice>('invoices', setInvoices),
        fetchCollection<PaymentIntent>('paymentIntents', setPaymentIntents),
        fetchCollection<PaymentSession>('paymentSessions', setPaymentSessions),
        fetchCollection<Receipt>('receipts', setReceipts),
        fetchCollection<Settlement>('settlements', setSettlements),
        fetchCollection<Evaluation>('evaluations', setEvaluations),
        fetchCollection<Goal>('goals', setGoals),
        fetchCollection<UserAccount & { displayName?: string }>('users', setUsers),
      );
    } else {
      baseCollections.push(fetchCollection<StudentProfile>('studentProfiles', setStudents, [where('userId', '==', user.uid)]));
      baseCollections.push(
        fetchStudentOwned<Enrollment>('enrollments', setEnrollments),
        fetchStudentOwned<StudentPlan>('studentPlans', setStudentPlans),
        fetchStudentOwned<SessionBooking>('sessionBookings', setSessionBookings),
        fetchStudentOwned<CreditReinstatement>('creditReinstatements', setCreditReinstatements),
        fetchStudentOwned<Payment>('payments', setPayments),
        fetchStudentOwned<Evaluation>('evaluations', setEvaluations),
        fetchStudentOwned<Goal>('goals', setGoals),
      );
      baseCollections.push(syncCurrentUserRecord());
    }

    await Promise.all(baseCollections);
    setLoading(false);
  }, [filterPlanOptions, initializing, isInstructor, mapSnapshot, studentProfileId, syncCurrentUserRecord, user]);

  useEffect(() => {
    void reloadFromStorage();
  }, [reloadFromStorage]);

  useEffect(() => {
    if (isInstructor || !user) return;
    if (!studentProfileId) return;

    console.log('[StudentDebug]', {
      uid: user.uid,
      studentProfileId,
      planQuery: ['studentPlans', 'studentUid ==', user.uid, 'studentId ==', studentProfileId],
      evaluationQuery: ['evaluations', 'studentUid ==', user.uid, 'studentId ==', studentProfileId],
      goalQuery: ['goals', 'studentUid ==', user.uid, 'studentId ==', studentProfileId],
    });
  }, [isInstructor, studentProfileId, user]);

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

  const ensureStudentProfile = useCallback(
    async (email: string, displayName: string) => {
      if (!user) {
        throw new Error('Você precisa estar autenticado para criar ou acessar o perfil de aluno.');
      }

      const resolvedId = await resolveStudentProfileIdForIdentifier(user.uid).catch(() => null);
      const existingProfile =
        students.find((profile) => profile.userId === user.uid) ??
        students.find((profile) => (resolvedId ? profile.id === resolvedId : false));
      if (existingProfile) {
        setStudentProfileId(existingProfile.id);
        return existingProfile;
      }

      if (resolvedId) {
        try {
          const snap = await getDoc(doc(db, 'studentProfiles', resolvedId));
          if (snap.exists()) {
            const payload = mapSnapshot<StudentProfile>(snap.data(), snap.id);
            setStudentProfileId(snap.id);
            setStudents((current) => {
              const others = current.filter((profile) => profile.id !== snap.id);
              return [...others, payload];
            });
            return payload;
          }
        } catch (error) {
          console.warn('Failed to load existing student profile by resolved id, creating a new one.', error);
        }
      }

      const profileId = user.uid;
      const profile: StudentProfile = {
        id: profileId,
        userId: user.uid,
        fullName: displayName || email || user.displayName || user.email,
        phone: '+55 11 99999-0000',
        birthDate: '1995-01-01',
        experienceLevel: 'beginner',
        goals: ['Entrar em forma e manter consistência'],
        emergencyContact: { name: 'Contato padrão', phone: '+55 11 98888-0000' },
      };

      setStudentProfileId(profile.id);
      setStudents((current) => [...current, profile]);
      await setDoc(doc(db, 'studentProfiles', user.uid), profile, { merge: true });
      return profile;
    },
    [mapSnapshot, resolveStudentProfileIdForIdentifier, students, user],
  );

  const saveDocument = useCallback(
    async <T extends { id: string }>(path: string, payload: T) => {
      try {
        await setDoc(doc(db, path, payload.id), payload);
      } catch (error) {
        console.warn(`Save for ${path} failed; applying local fallback`, error);
        if (!isPermissionDenied(error)) {
          throw error;
        }

        setEvents((prev) => {
          const fallbackEvent: SystemEvent = {
            id: generateId('evt'),
            type: 'validation_error',
            message: `Fallback gravado localmente para ${path}`,
            timestamp: new Date().toISOString(),
            context: { path, id: payload.id },
          };
          return [fallbackEvent, ...prev].slice(0, MAX_EVENT_ENTRIES);
        });

        if (path === 'studentPlans') {
          setStudentPlans((current) => {
            const others = current.filter((item) => item.id !== payload.id);
            return [...others, payload as unknown as StudentPlan];
          });
          return;
        }

        if (path === 'payments') {
          setPayments((current) => {
            const others = current.filter((item) => item.id !== payload.id);
            return [...others, payload as unknown as Payment];
          });
          return;
        }

        if (path === 'invoices') {
          setInvoices((current) => {
            const others = current.filter((item) => item.id !== payload.id);
            return [...others, payload as unknown as Invoice];
          });
          return;
        }

        if (path === 'sessionBookings') {
          setSessionBookings((current) => {
            const others = current.filter((item) => item.id !== payload.id);
            return [...others, payload as unknown as SessionBooking];
          });
          return;
        }

        // Fallback unknown paths: rethrow
        throw error;
      }
    },
    [generateId],
  );

  const chunkArray = useCallback(<T,>(items: T[], size = 10) => {
    const chunks: T[][] = [];
    for (let index = 0; index < items.length; index += size) {
      chunks.push(items.slice(index, index + size));
    }
    return chunks;
  }, []);

  const getStudentProfileForEmail = useCallback(
    async (email: string, displayName?: string) => ensureStudentProfile(email, displayName ?? email),
    [ensureStudentProfile],
  );

  const getActivePlanForStudent = useCallback(
    (studentId: string) => {
      const identity = resolveCachedStudentIdentity(studentId);
      return studentPlans
        .filter((plan) => matchesStudentIdentity(plan, identity) && plan.status === 'active')
        .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())[0];
    },
    [resolveCachedStudentIdentity, studentPlans],
  );

  const upsertPlanPayment = useCallback(
    async (student: StudentIdentity, option: PlanOption, billing: StudentPlan['billing']) => {
      const { studentId, studentUid } = student;
      const amount = billing === 'recurring' ? option.priceMonthly : option.priceUpfront;
      const issueDate = new Date();
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);

      const issueDateFormatted = issueDate.toISOString().slice(0, 10);
      const dueDateFormatted = dueDate.toISOString().slice(0, 10);
      const description = `${option.weeklyClasses}x semana · ${option.durationMonths}m (${billing === 'recurring' ? 'mensal' : 'à vista'})`;

      const existingEnrollmentId = enrollments.find(
        (enrollment) => matchesStudentIdentity(enrollment, student) && enrollment.status === 'active',
      )?.id;

      const existingPayment = payments.find(
        (payment) => matchesStudentIdentity(payment, student) && payment.status !== 'paid',
      );
      const paymentId = existingPayment?.id ?? createCollectionId('payments');
      const enrollmentId = existingPayment?.enrollmentId ?? existingEnrollmentId ?? `${studentId}-unassigned-plan`;

      const payment: Payment = {
        id: paymentId,
        studentUid,
        studentId,
        amount,
        currency: 'BRL',
        method: 'pix',
        status: 'pending',
        dueDate: dueDateFormatted,
        description,
        enrollmentId,
      };

      await saveDocument('payments', payment);

      const existingInvoice = invoices.find((invoice) => invoice.paymentId === paymentId);
      const invoice: Invoice = existingInvoice
        ? {
            ...existingInvoice,
            issueDate: issueDateFormatted,
            total: amount,
            status: 'open',
            reference: existingInvoice.reference ?? `${issueDate.getMonth() + 1}/${issueDate.getFullYear()}`,
            enrollmentId,
          }
        : {
            id: createCollectionId('invoices'),
            paymentId,
            enrollmentId,
            issueDate: issueDateFormatted,
            reference: `${issueDate.getMonth() + 1}/${issueDate.getFullYear()} - Plano semanal`,
            total: amount,
            currency: 'BRL',
            status: 'open',
          };

      await saveDocument('invoices', invoice);

      const existingIntent = paymentIntents.find((intent) => intent.paymentId === paymentId);
      if (existingIntent) {
        await updateDoc(doc(db, 'paymentIntents', existingIntent.id), { amount, enrollmentId });
      }

      logEvent('payment_posted', 'Cobrança atualizada para refletir novo plano.', {
        studentId,
        studentUid,
        paymentId: payment.id,
        amount,
        billing,
      });
    },
    [createCollectionId, enrollments, invoices, logEvent, paymentIntents, payments, saveDocument],
  );

  const selectPlanForStudent = useCallback(
    async (studentUid: string, planOptionId: string, billing: StudentPlan['billing']) => {
      const student = await resolveStudentIdentity(studentUid);
      const { studentId, studentUid: resolvedStudentUid } = student;
      const option = planOptions.find((item) => item.id === planOptionId);
      if (!option) {
        throw new Error('Plano selecionado não encontrado.');
      }
      if (!ALLOWED_WEEKLY_CLASSES.includes(option.weeklyClasses)) {
        throw new Error('Combinação de aulas semanais indisponível.');
      }

      const now = new Date();
      const nowIso = now.toISOString();

      const activePlans = studentPlans.filter((plan) => matchesStudentIdentity(plan, student) && plan.status === 'active');
      if (activePlans.length) {
        await Promise.all(
          activePlans.map(async (plan) => {
            try {
              await updateDoc(doc(db, 'studentPlans', plan.id), { status: 'expired', endDate: nowIso });
            } catch (error) {
              if (!isPermissionDenied(error)) throw error;
              setStudentPlans((current) =>
                current.map((item) =>
                  item.id === plan.id ? { ...item, status: 'expired', endDate: nowIso } : item,
                ),
              );
            }
          }),
        );
      }

      const newPlan: StudentPlan = {
        id: createCollectionId('studentPlans'),
        studentUid: student.studentUid,
        studentId,
        planOptionId,
        billing,
        startDate: nowIso,
        endDate: new Date(now.getFullYear(), now.getMonth() + option.durationMonths, now.getDate()).toISOString(),
        status: 'active',
      };

      try {
        await saveDocument('studentPlans', newPlan);
      } catch (error) {
        if (!isPermissionDenied(error)) {
          throw error;
        }
        setStudentPlans((current) => {
          const others = current.filter((item) => item.id !== newPlan.id);
          return [...others, newPlan];
        });
      }

      logEvent('enrollment_created', 'Plano selecionado/atualizado pelo aluno', {
        studentId,
        studentUid: student.studentUid,
        planOptionId,
        billing,
      });

      try {
        await upsertPlanPayment(student, option, billing);
      } catch (error) {
        if (!isPermissionDenied(error)) {
          throw error;
        }
        logEvent('validation_error', 'Cobrança não registrada no backend; mantendo valores em memória.', {
          studentId,
          studentUid: student.studentUid,
          planOptionId,
          billing,
        });
      }

      return newPlan;
    },
    [
      createCollectionId,
      logEvent,
      planOptions,
      resolveStudentIdentity,
      saveDocument,
      studentPlans,
      upsertPlanPayment,
    ],
  );

  const getWeeklyUsageForStudent = useCallback(
    (studentId: string, referenceDate = new Date()) => {
      const identity = resolveCachedStudentIdentity(studentId);
      const activePlan = getActivePlanForStudent(identity.studentId);
      const weekStart = startOfWeekIso(referenceDate);
      const reinstated = creditReinstatements
        .filter((item) => matchesStudentIdentity(item, identity) && item.weekStart === weekStart)
        .reduce((sum, item) => sum + item.amount, 0);
      const limit = (activePlan?.planOptionId
        ? planOptions.find((item) => item.id === activePlan.planOptionId)?.weeklyClasses ?? 0
        : 0) + reinstated;

      const bookingsThisWeek = sessionBookings.filter(
        (booking) =>
          matchesStudentIdentity(booking, identity) && booking.weekStart === weekStart && booking.status === 'booked',
      ).length;

      const enrollmentsThisWeek = enrollments.filter(
        (enrollment) =>
          matchesStudentIdentity(enrollment, identity) &&
          enrollment.status !== 'cancelled' &&
          startOfWeekIso(new Date(enrollment.createdAt)) === weekStart,
      ).length;

      const used = Math.max(bookingsThisWeek, enrollmentsThisWeek);

      return { used, limit, remaining: Math.max(limit - used, 0), weekStart };
    },
    [creditReinstatements, enrollments, getActivePlanForStudent, planOptions, resolveCachedStudentIdentity, sessionBookings],
  );

  const isSessionBooked = useCallback(
    (sessionId: string, studentId: string) => {
      const identity = resolveCachedStudentIdentity(studentId);
      return sessionBookings.some(
        (booking) =>
          booking.sessionId === sessionId && matchesStudentIdentity(booking, identity) && booking.status === 'booked',
      );
    },
    [resolveCachedStudentIdentity, sessionBookings],
  );

  const bookSessionForStudent = useCallback(
    async (sessionId: string, studentUid: string) => {
      const { studentId, studentUid: resolvedUid } = await resolveStudentIdentity(studentUid);
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
        id: createCollectionId('sessionBookings'),
        studentUid: resolvedUid,
        studentId,
        sessionId,
        weekStart: usage.weekStart,
        createdAt: new Date().toISOString(),
        status: 'booked',
      };

      await saveDocument('sessionBookings', newBooking);
      logEvent('enrollment_created', 'Reserva realizada com base no plano semanal', {
        studentId,
        studentUid: resolvedUid,
        sessionId,
        weekStart: usage.weekStart,
      });

      return newBooking;
    },
    [
      createCollectionId,
      getActivePlanForStudent,
      getWeeklyUsageForStudent,
      isSessionBooked,
      logEvent,
      resolveStudentIdentity,
      saveDocument,
      sessions,
    ],
  );

  const reinstateClassForWeek = useCallback(
    async (studentUid: string, weekStart: string, amount = 1, notes?: string) => {
      if (!isInstructor) {
        console.warn('Attempted to reinstate credits as a student. Operation may be blocked by rules.');
      }
      const { studentId, studentUid: resolvedUid } = await resolveStudentIdentity(studentUid);
      const reinstatement: CreditReinstatement = {
        id: createCollectionId('creditReinstatements'),
        studentUid: resolvedUid,
        studentId,
        weekStart,
        amount,
        notes,
        createdAt: new Date().toISOString(),
      };

      await saveDocument('creditReinstatements', reinstatement);
      logEvent('attendance_marked', 'Crédito semanal reinserido pelo instrutor', {
        studentId,
        studentUid: resolvedUid,
        weekStart,
        amount,
      });

      return reinstatement;
    },
    [createCollectionId, isInstructor, logEvent, resolveStudentIdentity, saveDocument],
  );

  const getEnrollmentForStudent = useCallback(
    (studentId: string, classId: string) => {
      const identity = resolveCachedStudentIdentity(studentId);
      return enrollments.find((item) => matchesStudentIdentity(item, identity) && item.classId === classId);
    },
    [enrollments, resolveCachedStudentIdentity],
  );

  const enrollStudentInClass = useCallback(
    async (studentUid: string, classId: string) => {
      const student = await resolveStudentIdentity(studentUid);
      const { studentId } = student;
      const activePlan = getActivePlanForStudent(studentId);
      const nextSessionForClass = sessions
        .filter((session) => session.classId === classId)
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0];
      const referenceDate = nextSessionForClass ? new Date(nextSessionForClass.startTime) : new Date();
      const weeklyUsage = getWeeklyUsageForStudent(studentId, referenceDate);

      if (!activePlan) {
        const message = 'Um plano ativo é necessário para se inscrever em aulas.';
        logEvent('validation_error', message, { studentId, studentUid: student.studentUid, classId });
        throw new Error(message);
      }

      if (weeklyUsage.limit === 0 || weeklyUsage.remaining <= 0) {
        const message = 'Limite semanal atingido. Selecione um plano com mais aulas ou espere a próxima semana.';
        logEvent('validation_error', message, {
          studentId,
          studentUid: student.studentUid,
          classId,
          weekStart: weeklyUsage.weekStart,
        });
        throw new Error(message);
      }

      const existing = enrollments.find((enrollment) => matchesStudentIdentity(enrollment, student) && enrollment.classId === classId);

      const now = new Date().toISOString();
      const classInfo = classes.find((item) => item.id === classId);
      if (!classInfo) {
        const message = 'Turma não encontrada para inscrição.';
        logEvent('validation_error', message, { studentId, studentUid: student.studentUid, classId });
        throw new Error(message);
      }
      const activeCount = enrollments.filter(
        (item) => item.classId === classId && item.status === 'active',
      ).length;
      const isWaitlist = classInfo ? activeCount >= classInfo.capacity : false;

      if (existing && existing.status !== 'cancelled') {
        logEvent('validation_error', 'Tentativa de inscrição duplicada bloqueada.', {
          studentId,
          studentUid: student.studentUid,
          classId,
          enrollmentId: existing.id,
        });
        return { enrollment: existing, isWaitlist: existing.status === 'waitlist', alreadyEnrolled: true };
      }

      if (existing && existing.status === 'cancelled') {
        const reactivated: Enrollment = {
          ...existing,
          studentUid: existing.studentUid ?? student.studentUid,
          studentId: existing.studentId ?? student.studentId,
          status: isWaitlist ? 'waitlist' : 'active',
          createdAt: now,
          updatedAt: now,
        };

        await saveDocument('enrollments', reactivated);

        logEvent('enrollment_created', 'Inscrição reativada após cancelamento.', {
          enrollmentId: existing.id,
          classId,
          studentId,
          studentUid: student.studentUid,
          waitlisted: isWaitlist,
        });

        return { enrollment: reactivated, isWaitlist, alreadyEnrolled: false };
      }

      const enrollment: Enrollment = {
        id: createCollectionId('enrollments'),
        studentUid: student.studentUid,
        studentId,
        classId,
        status: isWaitlist ? 'waitlist' : 'active',
        createdAt: now,
        updatedAt: now,
      };

      await saveDocument('enrollments', enrollment);
      logEvent('enrollment_created', 'Inscrição criada com validação de capacidade.', {
        enrollmentId: enrollment.id,
        classId,
        studentId,
        studentUid: student.studentUid,
        waitlisted: isWaitlist,
      });

      return { enrollment, isWaitlist, alreadyEnrolled: false };
    },
    [
      classes,
      createCollectionId,
      enrollments,
      getActivePlanForStudent,
      getWeeklyUsageForStudent,
      logEvent,
      resolveStudentIdentity,
      saveDocument,
      sessions,
    ],
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

  const resolveRosterStudent = useCallback(
    (enrollment: Enrollment): StudentProfile => {
      const student = students.find(
        (item) => item.id === enrollment.studentId || item.userId === enrollment.studentUid,
      );
      if (student) return student;

      const fallbackId = enrollment.studentId ?? enrollment.studentUid ?? 'student-unknown';
      const suffix = fallbackId.slice(-4) || fallbackId;
      return {
        id: fallbackId,
        userId: enrollment.studentUid ?? fallbackId,
        fullName: `Aluno inscrito #${suffix}`,
        phone: '',
        birthDate: '',
        experienceLevel: 'beginner',
        goals: [],
        emergencyContact: { name: 'Contato não disponível', phone: '' },
      };
    },
    [students],
  );

  const rosterByClass = useMemo(() => {
    return enrollments.reduce<Record<string, RosterEntry[]>>((acc, enrollment) => {
      if (enrollment.status === 'cancelled') return acc;

      const student = resolveRosterStudent(enrollment);

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
  }, [attendance, enrollments, invoices, payments, resolveRosterStudent]);

  const outstandingBalances = useMemo(() => {
    const cancelledEnrollmentIds = new Set(
      enrollments.filter((item) => item.status === 'cancelled').map((item) => item.id),
    );

    return payments
      .filter((payment) => payment.status !== 'paid' && !cancelledEnrollmentIds.has(payment.enrollmentId ?? ''))
      .map((payment) => {
        const invoice = invoices.find((item) => item.paymentId === payment.id);
        const student = students.find(
          (item) => item.id === payment.studentId || item.userId === payment.studentUid,
        );
        const ownerUserId = student?.userId ?? payment.studentUid ?? payment.studentId;
        const email = users.find((account) => account.id === ownerUserId)?.email;
        const isOverdue = new Date(payment.dueDate) < new Date();
        return {
          payment,
          invoice,
          student,
          email,
          status: payment.status === 'failed' ? 'failed' : isOverdue ? 'overdue' : 'pending',
        } as const;
      });
  }, [enrollments, invoices, payments, students, users]);

  const getStudentAccountSnapshot = useCallback(
    (studentId: string): StudentAccountSnapshot => {
      const identity = resolveCachedStudentIdentity(studentId);
      const activeEnrollments = enrollments.filter(
        (item) => matchesStudentIdentity(item, identity) && item.status !== 'cancelled',
      );
      const ledger = resolvePaymentLedger(payments, invoices, enrollments, identity);
      const outstanding = ledger.filter((item) => item.status !== 'paid');
      const nextPayment = outstanding[0];
      const openBalance = outstanding.reduce((sum, entry) => sum + entry.payment.amount, 0);

      return { enrollments: activeEnrollments, ledger, outstanding, nextPayment, openBalance };
    },
    [enrollments, invoices, payments, resolveCachedStudentIdentity],
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
      const ownerKey = payment.studentUid ?? payment.studentId;
      if (payment.status === 'paid' && ownerKey) {
        acc[ownerKey] = (acc[ownerKey] ?? 0) + payment.amount;
      }
      return acc;
    }, {});

    return { totalRevenue, pendingRevenue, averageUtilization, attendanceRate, revenueByStudent, utilizationByClass };
  }, [attendance, classes, enrollments, payments]);

  const createClass = useCallback(
    async (payload: Omit<TrainingClass, 'id' | 'createdAt' | 'updatedAt'>) => {
      const now = new Date().toISOString();
      const newClass: TrainingClass = {
        ...payload,
        id: createCollectionId('classes'),
        createdAt: now,
        updatedAt: now,
      };

      await saveDocument('classes', newClass);
    },
    [createCollectionId, saveDocument],
  );

  const updateClass = useCallback(
    async (id: string, payload: Partial<TrainingClass>) => {
      const ref = doc(db, 'classes', id);
      await updateDoc(ref, { ...payload, updatedAt: new Date().toISOString() });
    },
    [],
  );

  const deleteClass = useCallback(
    async (id: string) => {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'classes', id));

      const relatedSessions = await getDocs(query(collection(db, 'sessions'), where('classId', '==', id)));
      const sessionIds = relatedSessions.docs.map((snap) => snap.id);
      relatedSessions.docs.forEach((snap) => batch.delete(snap.ref));

      if (sessionIds.length) {
        for (const chunk of chunkArray(sessionIds)) {
          const attendanceSnap = await getDocs(query(collection(db, 'attendance'), where('sessionId', 'in', chunk)));
          attendanceSnap.docs.forEach((snap) => batch.delete(snap.ref));
        }
      }

      const enrollmentsSnap = await getDocs(query(collection(db, 'enrollments'), where('classId', '==', id)));
      enrollmentsSnap.docs.forEach((snap) => batch.delete(snap.ref));

      await batch.commit();
    },
    [chunkArray],
  );

  const createSession = useCallback(
    async (payload: Omit<ClassSession, 'id'>) => {
      const session: ClassSession = { ...payload, id: createCollectionId('sessions') };
      await saveDocument('sessions', session);
    },
    [createCollectionId, saveDocument],
  );

  const updateSession = useCallback(
    async (id: string, payload: Partial<ClassSession>) => {
      await updateDoc(doc(db, 'sessions', id), payload);
    },
    [],
  );

  const deleteSession = useCallback(
    async (id: string) => {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'sessions', id));

      const attendanceSnap = await getDocs(query(collection(db, 'attendance'), where('sessionId', '==', id)));
      attendanceSnap.docs.forEach((snap) => batch.delete(snap.ref));

      await batch.commit();
    },
    [],
  );

  const toggleAttendance = useCallback(
    async (
      sessionId: string,
      enrollmentId: string,
      status: Attendance['status'],
    ) => {
      const existing = attendance.find(
        (entry) => entry.sessionId === sessionId && entry.enrollmentId === enrollmentId,
      );
      const nowIso = new Date().toISOString();

      if (existing) {
        await updateDoc(doc(db, 'attendance', existing.id), { status, checkedInAt: nowIso });
      } else {
        const newAttendance: Attendance = {
          id: createCollectionId('attendance'),
          sessionId,
          enrollmentId,
          status,
          checkedInAt: nowIso,
        };
        await saveDocument('attendance', newAttendance);
      }

      logEvent('attendance_marked', 'Status de presença atualizado manualmente.', {
        sessionId,
        enrollmentId,
        status,
      });
    },
    [attendance, createCollectionId, logEvent, saveDocument],
  );

  const recordCheckIn = useCallback(
    async (sessionId: string, enrollmentId: string, method: 'qr' | 'manual') => {
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
      const nowIso = new Date().toISOString();
      const existing = attendance.find(
        (entry) => entry.sessionId === sessionId && entry.enrollmentId === enrollmentId,
      );
      const created: Attendance = existing
        ? { ...existing, status: 'present', checkedInAt: nowIso, notes: note }
        : {
            id: createCollectionId('attendance'),
            sessionId,
            enrollmentId,
            status: 'present',
            checkedInAt: nowIso,
            notes: note,
          };

      if (existing) {
        await updateDoc(doc(db, 'attendance', existing.id), created);
      } else {
        await saveDocument('attendance', created);
      }

      logEvent('attendance_marked', 'Check-in registrado após validação de pagamento.', {
        sessionId,
        enrollmentId,
        method,
      });
      return created;
    },
    [attendance, createCollectionId, enrollments, invoices, logEvent, payments, saveDocument, sessions],
  );

  const updateEnrollmentStatus = useCallback(async (enrollmentId: string, status: Enrollment['status']) => {
    await updateDoc(doc(db, 'enrollments', enrollmentId), { status, updatedAt: new Date().toISOString() });
  }, []);

  const cancelEnrollment = useCallback(
    async (enrollmentId: string) => {
      const nowIso = new Date().toISOString();
      const batch = writeBatch(db);

      batch.update(doc(db, 'enrollments', enrollmentId), { status: 'cancelled', updatedAt: nowIso });

      const paymentsSnap = await getDocs(query(collection(db, 'payments'), where('enrollmentId', '==', enrollmentId)));
      paymentsSnap.docs.forEach((snap) => {
        const payment = snap.data() as Payment;
        batch.update(snap.ref, {
          status: 'failed',
          description: payment.description ? `${payment.description} (cancelado)` : 'Pagamento cancelado',
        });
      });

      const invoicesSnap = await getDocs(query(collection(db, 'invoices'), where('enrollmentId', '==', enrollmentId)));
      invoicesSnap.docs.forEach((snap) => {
        const invoice = snap.data() as Invoice;
        batch.update(snap.ref, { status: 'void', notes: invoice.notes ?? 'Cancelado pelo aluno.' });
      });

      await batch.commit();

      logEvent('enrollment_cancelled', 'Inscrição cancelada pelo aluno.', { enrollmentId });
    },
    [logEvent],
  );

  const createEvaluation = useCallback(
    async (payload: Omit<Evaluation, 'id'>) => {
      const student = await resolveStudentIdentity(payload.studentUid ?? payload.studentId);
      const evaluation: Evaluation = {
        ...payload,
        studentUid: student.studentUid,
        studentId: student.studentId,
        id: createCollectionId('evaluations'),
      };
      await saveDocument('evaluations', evaluation);
    },
    [createCollectionId, resolveStudentIdentity, saveDocument],
  );

  const updateEvaluation = useCallback(async (id: string, payload: Partial<Evaluation>) => {
    await updateDoc(doc(db, 'evaluations', id), payload);
  }, []);

  const deleteEvaluation = useCallback(async (id: string) => {
    await deleteDoc(doc(db, 'evaluations', id));
  }, []);

  const createGoal = useCallback(
    async (payload: Omit<Goal, 'id'>) => {
      const student = await resolveStudentIdentity(payload.studentUid ?? payload.studentId);
      const goal: Goal = {
        ...payload,
        studentUid: student.studentUid,
        studentId: student.studentId,
        id: createCollectionId('goals'),
      };
      await saveDocument('goals', goal);
    },
    [createCollectionId, resolveStudentIdentity, saveDocument],
  );

  const updateGoal = useCallback(async (id: string, payload: Partial<Goal>) => {
    await updateDoc(doc(db, 'goals', id), payload);
  }, []);

  const deleteGoal = useCallback(async (id: string) => {
    await deleteDoc(doc(db, 'goals', id));
  }, []);

  const getStudentEvaluations = useCallback(
    (studentId: string) => {
      const identity = resolveCachedStudentIdentity(studentId);
      return evaluations
        .filter((evaluation) => matchesStudentIdentity(evaluation, identity))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    },
    [evaluations, resolveCachedStudentIdentity],
  );

  const chargeStoredCard = useCallback(
    async (studentUid: string, amount: number, description: string) => {
      if (!isInstructor) {
        console.warn('chargeStoredCard is instructor-only; student invocation will likely fail Firestore rules.');
      }
      const { studentId, studentUid: resolvedUid } = await resolveStudentIdentity(studentUid);
      const now = new Date();
      const payment: Payment = {
        id: createCollectionId('payments'),
        studentUid: resolvedUid,
        studentId,
        amount,
        currency: 'BRL',
        method: 'credit_card',
        status: 'paid',
        dueDate: now.toISOString().slice(0, 10),
        paidAt: now.toISOString(),
        description,
      };

      await saveDocument('payments', payment);
      logEvent('payment_posted', 'Pagamento lançado no cartão em arquivo.', {
        paymentId: payment.id,
        studentId,
        studentUid: resolvedUid,
        amount,
        status: payment.status,
      });
      return payment;
    },
    [createCollectionId, isInstructor, logEvent, resolveStudentIdentity, saveDocument],
  );

  const createOneTimePayment = useCallback(
    async (studentUid: string, amount: number, method: Payment['method'], description: string) => {
      if (!isInstructor) {
        console.warn('createOneTimePayment is instructor-only; student invocation will likely fail Firestore rules.');
      }
      const { studentId, studentUid: resolvedUid } = await resolveStudentIdentity(studentUid);
      const now = new Date();
      const payment: Payment = {
        id: createCollectionId('payments'),
        studentUid: resolvedUid,
        studentId,
        amount,
        currency: 'BRL',
        method,
        status: method === 'credit_card' ? 'paid' : 'pending',
        dueDate: now.toISOString().slice(0, 10),
        paidAt: method === 'credit_card' ? now.toISOString() : undefined,
        description,
      };

      await saveDocument('payments', payment);
      logEvent('payment_posted', 'Pagamento avulso registrado.', {
        paymentId: payment.id,
        studentId,
        studentUid: resolvedUid,
        amount,
        status: payment.status,
        method: payment.method,
      });
      return payment;
    },
    [createCollectionId, isInstructor, logEvent, resolveStudentIdentity, saveDocument],
  );

  const createPaymentIntentForEnrollment = useCallback(
    async (enrollmentId: string, amount: number, method: Payment['method'], description: string) => {
      const enrollment = enrollments.find((item) => item.id === enrollmentId);
      const now = new Date();
      const studentId = enrollment?.studentId ?? enrollment?.studentUid ?? 'student-unknown';
      const studentUid = enrollment?.studentUid ?? enrollment?.studentId ?? 'student-unknown';

      const payment: Payment = {
        id: createCollectionId('payments'),
        studentUid,
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
        id: createCollectionId('invoices'),
        paymentId: payment.id,
        enrollmentId,
        issueDate: now.toISOString().slice(0, 10),
        reference: `${description} - ${now.getMonth() + 1}/${now.getFullYear()}`,
        total: amount,
        currency: 'BRL',
        status: 'open',
      };

      const intent: PaymentIntent = {
        id: createCollectionId('paymentIntents'),
        paymentId: payment.id,
        enrollmentId,
        amount,
        currency: 'BRL',
        paymentMethod: method,
        status: 'requires_payment_method',
        clientSecret: `secret_${payment.id}`,
      };

      await Promise.all([
        saveDocument('payments', payment),
        saveDocument('invoices', invoice),
        saveDocument('paymentIntents', intent),
      ]);
      logEvent('payment_posted', 'Intent de pagamento criada para matrícula.', {
        paymentId: payment.id,
        enrollmentId,
        status: payment.status,
        amount,
      });

      return intent;
    },
    [createCollectionId, enrollments, logEvent, saveDocument],
  );

  const startPaymentSession = useCallback(
    async (intentId: string, fallbackIntent?: PaymentIntent) => {
      const intent = paymentIntents.find((item) => item.id === intentId) ?? fallbackIntent;
      if (!intent) {
        throw new Error('Intent de pagamento não encontrada.');
      }

      const now = new Date();
      const session: PaymentSession = {
        id: createCollectionId('paymentSessions'),
        intentId,
        status: 'open',
        checkoutUrl: `https://pagamentos.dottosports.test/${intentId}`,
        createdAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + 30 * 60 * 1000).toISOString(),
      };

      await updateDoc(doc(db, 'paymentIntents', intent.id), { status: 'processing' });
      await saveDocument('paymentSessions', session);

      return session;
    },
    [createCollectionId, paymentIntents, saveDocument],
  );

  const processPaymentWebhook = useCallback(
    async (
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
      const invoice = invoices.find((item) => item.paymentId === paymentId);
      const payment = payments.find((item) => item.id === paymentId);

      const batch = writeBatch(db);
      batch.update(doc(db, 'paymentSessions', session.id), {
        status: 'completed',
        lastWebhookStatus: result,
        failureReason,
      });

      if (result === 'succeeded') {
        const receipt: Receipt = {
          id: createCollectionId('receipts'),
          paymentId,
          enrollmentId: intent.enrollmentId,
          issuedAt: nowIso,
          downloadUrl: `https://pagamentos.dottosports.test/recibos/${paymentId}.pdf`,
          reference: `REC-${paymentId}`,
        };

        const settlement: Settlement = {
          id: createCollectionId('settlements'),
          period: nowIso.slice(0, 10),
          gross: intent.amount,
          fees,
          net: intent.amount - fees,
          depositedAt: nowIso,
          receiptIds: [receipt.id],
        };

        batch.update(doc(db, 'paymentIntents', intent.id), { status: 'succeeded' });
        batch.update(doc(db, 'payments', paymentId), { status: 'paid', paidAt: nowIso, receiptId: receipt.id });
        if (invoice) {
          batch.update(doc(db, 'invoices', invoice.id), { status: 'paid' });
        }
        batch.set(doc(db, 'receipts', receipt.id), receipt);
        batch.set(doc(db, 'settlements', settlement.id), settlement);

        await batch.commit();

        logEvent('payment_posted', 'Pagamento confirmado e conciliado.', {
          paymentId,
          intentId: intent.id,
          sessionId,
          status: 'paid',
          amount: intent.amount,
          receiptId: receipt.id,
        });
      } else {
        batch.update(doc(db, 'paymentIntents', intent.id), { status: 'failed', paymentMethod: intent.paymentMethod });
        batch.update(doc(db, 'payments', paymentId), {
          status: 'failed',
          description: failureReason ?? payment?.description,
        });
        if (invoice) {
          batch.update(doc(db, 'invoices', invoice.id), { status: 'open', notes: failureReason ?? invoice.notes });
        }
        await batch.commit();

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
    [createCollectionId, invoices, logEvent, paymentIntents, paymentSessions, payments],
  );

  const payOutstandingPayment = useCallback(
    async (paymentId: string) => {
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

      let intent: PaymentIntent =
        existingIntent ??
        {
          id: createCollectionId('paymentIntents'),
          paymentId,
          enrollmentId: payment.enrollmentId,
          amount: payment.amount,
          currency: payment.currency,
          paymentMethod: payment.method,
          status: 'requires_payment_method',
          clientSecret: `secret_${paymentId}`,
        };

      if (!existingIntent) {
        await saveDocument('paymentIntents', intent);
      }

      const session = await startPaymentSession(intent.id, intent);
      await processPaymentWebhook(session.id, 'succeeded', undefined, session, intent);

      return { session, intent };
    },
    [createCollectionId, paymentIntents, payments, processPaymentWebhook, saveDocument, startPaymentSession],
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
      instructorProfiles,
      loading,
      reloadFromStorage,
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
      instructorProfiles,
      loading,
      reloadFromStorage,
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
