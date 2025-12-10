import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

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
} from '@/constants/seed-data';

export type RosterEntry = {
  enrollment: Enrollment;
  student: StudentProfile;
  attendance?: Attendance;
  paymentStatus: 'paid' | 'overdue' | 'pending';
  paymentLabel: string;
};

type InstructorDataContextValue = {
  classes: TrainingClass[];
  sessions: ClassSession[];
  enrollments: Enrollment[];
  attendance: Attendance[];
  students: StudentProfile[];
  payments: Payment[];
  rosterByClass: Record<string, RosterEntry[]>;
  createClass: (payload: Omit<TrainingClass, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateClass: (id: string, payload: Partial<TrainingClass>) => void;
  deleteClass: (id: string) => void;
  createSession: (payload: Omit<ClassSession, 'id'>) => void;
  updateSession: (id: string, payload: Partial<ClassSession>) => void;
  deleteSession: (id: string) => void;
  toggleAttendance: (
    sessionId: string,
    enrollmentId: string,
    status: Attendance['status'],
  ) => void;
  updateEnrollmentStatus: (enrollmentId: string, status: Enrollment['status']) => void;
};

const InstructorDataContext = createContext<InstructorDataContextValue | undefined>(undefined);

const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.round(Math.random() * 1000)}`;

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

export function InstructorDataProvider({ children }: { children: ReactNode }) {
  const [classes, setClasses] = useState<TrainingClass[]>(seedClasses);
  const [sessions, setSessions] = useState<ClassSession[]>(seedSessions);
  const [enrollments, setEnrollments] = useState<Enrollment[]>(seedEnrollments);
  const [attendance, setAttendance] = useState<Attendance[]>(seedAttendance);
  const [payments, setPayments] = useState<Payment[]>(seedPayments);
  const [students] = useState<StudentProfile[]>(studentProfiles);

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
    setClasses((prev) => prev.map((item) => (item.id === id ? { ...item, ...payload, updatedAt: new Date().toISOString() } : item)));
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

  const updateEnrollmentStatus = (enrollmentId: string, status: Enrollment['status']) => {
    setEnrollments((prev) =>
      prev.map((enrollment) => (enrollment.id === enrollmentId ? { ...enrollment, status } : enrollment)),
    );
  };

  const value = useMemo(
    () => ({
      classes,
      sessions,
      enrollments,
      attendance,
      students,
      payments,
      rosterByClass,
      createClass,
      updateClass,
      deleteClass,
      createSession,
      updateSession,
      deleteSession,
      toggleAttendance,
      updateEnrollmentStatus,
    }),
    [
      classes,
      sessions,
      enrollments,
      attendance,
      students,
      payments,
      rosterByClass,
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
