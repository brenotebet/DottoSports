import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import type {
  Attendance,
  ClassSession,
  Enrollment,
  Payment,
  StudentProfile,
  TrainingClass,
} from '@/constants/schema';
import {
  attendance as seedAttendance,
  classes as seedClasses,
  enrollments as seedEnrollments,
  payments as seedPayments,
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
  cardOnFile: CardOnFile;
  rosterByClass: Record<string, RosterEntry[]>;
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
};

const InstructorDataContext = createContext<InstructorDataContextValue | undefined>(undefined);

const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.round(Math.random() * 1000)}`;
const findAccountByEmail = (email: string) =>
  seedAccounts.find((account) => account.email.toLowerCase() === email.toLowerCase());

const resolvePaymentStatus = (payments: Payment[], studentId: string) => {
  const relevantPayment = payments.find((payment) => payment.studentId === studentId);
  if (!relevantPayment) {
    return { paymentStatus: 'paid' as const, paymentLabel: 'Sem cobranças ativas' };
  }

  if (relevantPayment.status === 'paid') {
    return { paymentStatus: 'paid' as const, paymentLabel: 'Pago' };
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
  const [students, setStudents] = useState<StudentProfile[]>(studentProfiles);
  const [cardOnFile, setCardOnFile] = useState<CardOnFile>(defaultCard);

  const ensureStudentProfile = useCallback(
    (email: string, displayName: string) => {
      const existingAccount = findAccountByEmail(email);
      const resolvedUserId = existingAccount?.id ?? generateId('user');
      const existingProfile = students.find((profile) => profile.userId === resolvedUserId);
      if (existingProfile) return existingProfile;

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

      setStudents((prev) => [...prev, newProfile]);
      return newProfile;
    },
    [students],
  );

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
      return { enrollment, isWaitlist, alreadyEnrolled: false };
    },
    [classes, enrollments],
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
      const paymentInfo = resolvePaymentStatus(payments, enrollment.studentId);

      const entry: RosterEntry = {
        enrollment,
        student,
        attendance: existingAttendance,
        ...paymentInfo,
      };

      acc[enrollment.classId] = [...(acc[enrollment.classId] ?? []), entry];
      return acc;
    }, {});
  }, [attendance, enrollments, payments, students]);

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

      return created!;
    },
    [],
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
      cardOnFile,
      rosterByClass,
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
      cardOnFile,
      rosterByClass,
      ensureStudentProfile,
      enrollStudentInClass,
      getCapacityUsage,
      getEnrollmentForStudent,
      recordCheckIn,
      chargeStoredCard,
      createOneTimePayment,
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
