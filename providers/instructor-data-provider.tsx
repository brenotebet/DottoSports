import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import type {
  Attendance,
  ClassSession,
  Enrollment,
  Invoice,
  Payment,
  PaymentIntent,
  PaymentSession,
  Receipt,
  Settlement,
  StudentProfile,
  TrainingClass,
} from '@/constants/schema';
import {
  attendance as seedAttendance,
  classes as seedClasses,
  enrollments as seedEnrollments,
  payments as seedPayments,
  invoices as seedInvoices,
  paymentIntents as seedPaymentIntents,
  paymentSessions as seedPaymentSessions,
  receipts as seedReceipts,
  settlements as seedSettlements,
  sessions as seedSessions,
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
  outstandingBalances: {
    payment: Payment;
    invoice?: Invoice;
    student?: StudentProfile;
    email?: string;
    status: 'pending' | 'overdue' | 'failed';
  }[];
  cardOnFile: CardOnFile;
  rosterByClass: Record<string, RosterEntry[]>;
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
  ) => void;
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
  const relevantPayment = payments.find((payment) => payment.enrollmentId === enrollmentId);

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

const defaultCard: CardOnFile = {
  brand: 'Visa',
  last4: '4242',
  expMonth: '12',
  expYear: '26',
  label: 'Visa •••• 4242',
};

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
  const [students, setStudents] = useState<StudentProfile[]>(studentProfiles);
  const [cardOnFile, setCardOnFile] = useState<CardOnFile>(defaultCard);

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

  const getEnrollmentForStudent = useCallback(
    (studentId: string, classId: string) =>
      enrollments.find((item) => item.studentId === studentId && item.classId === classId),
    [enrollments],
  );

  const enrollStudentInClass = useCallback(
    (studentId: string, classId: string) => {
      const existing = enrollments.find(
        (enrollment) => enrollment.studentId === studentId && enrollment.classId === classId,
      );

      if (existing) {
        return { enrollment: existing, isWaitlist: existing.status === 'waitlist', alreadyEnrolled: true };
      }

      const now = new Date().toISOString();
      const classInfo = classes.find((item) => item.id === classId);
      const activeCount = enrollments.filter(
        (item) => item.classId === classId && item.status === 'active',
      ).length;
      const isWaitlist = classInfo ? activeCount >= classInfo.capacity : false;

      const enrollment: Enrollment = {
        id: generateId('enrollment'),
        studentId,
        classId,
        status: isWaitlist ? 'waitlist' : 'active',
        createdAt: now,
        updatedAt: now,
      };

      setEnrollments((prev) => [...prev, enrollment]);

      const hasExistingPayment = payments.some((payment) => payment.enrollmentId === enrollment.id);
      if (!hasExistingPayment) {
        const dueDate = new Date(now);
        dueDate.setDate(dueDate.getDate() + 3);

        const amount = 120;
        const description = classInfo
          ? `Mensalidade - ${classInfo.title}`
          : 'Mensalidade da turma inscrita';

        const payment: Payment = {
          id: generateId('payment'),
          studentId,
          enrollmentId: enrollment.id,
          amount,
          currency: 'BRL',
          method: 'credit_card',
          status: 'pending',
          dueDate: dueDate.toISOString().slice(0, 10),
          description,
        };

        const invoice: Invoice = {
          id: generateId('invoice'),
          paymentId: payment.id,
          enrollmentId: enrollment.id,
          issueDate: now.slice(0, 10),
          reference: `${description} - ${dueDate.getMonth() + 1}/${dueDate.getFullYear()}`,
          total: amount,
          currency: 'BRL',
          status: 'open',
        };

        setPayments((prev) => [payment, ...prev]);
        setInvoices((prev) => [invoice, ...prev]);
      }
      return { enrollment, isWaitlist, alreadyEnrolled: false };
    },
    [classes, enrollments, payments],
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

  const outstandingBalances = useMemo(
    () =>
      payments
        .filter((payment) => payment.status !== 'paid')
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
        }),
    [invoices, payments, students],
  );

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
  };

  const recordCheckIn = useCallback(
    (sessionId: string, enrollmentId: string, method: 'qr' | 'manual') => {
      const paymentGate = resolvePaymentStatus(payments, invoices, enrollmentId);
      if (paymentGate.paymentStatus !== 'paid') {
        throw new Error('Pagamento pendente ou em atraso impede o check-in.');
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

      return created;
    },
    [invoices, payments],
  );

  const updateEnrollmentStatus = (enrollmentId: string, status: Enrollment['status']) => {
    setEnrollments((prev) =>
      prev.map((enrollment) => (enrollment.id === enrollmentId ? { ...enrollment, status } : enrollment)),
    );
  };

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
      return payment;
    },
    [],
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
      return payment;
    },
    [],
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

      return intent;
    },
    [enrollments],
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
    (sessionId: string, result: 'succeeded' | 'failed', failureReason?: string) => {
      const session = paymentSessions.find((item) => item.id === sessionId);
      if (!session) return;

      const intent = paymentIntents.find((item) => item.id === session.intentId);
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
      }
    },
    [paymentIntents, paymentSessions],
  );

  const payOutstandingPayment = useCallback(
    (paymentId: string) => {
      const payment = payments.find((item) => item.id === paymentId);
      if (!payment) {
        throw new Error('Cobrança não encontrada.');
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
      processPaymentWebhook(session.id, 'succeeded');

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
      outstandingBalances,
      cardOnFile,
      rosterByClass,
      payOutstandingPayment,
      createClass,
      updateClass,
      deleteClass,
      createSession,
      updateSession,
      deleteSession,
      ensureStudentProfile,
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
      outstandingBalances,
      cardOnFile,
      rosterByClass,
      payOutstandingPayment,
      ensureStudentProfile,
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
