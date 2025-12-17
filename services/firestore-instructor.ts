import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type FirestoreError,
  type Unsubscribe,
} from 'firebase/firestore';

import type {
  Attendance,
  ClassSession,
  CreditReinstatement,
  Enrollment,
  Evaluation,
  Goal,
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
} from '@/constants/schema';
import { firestore } from '@/services/firebase';

export type InstructorSyncPayload = {
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
  cardOnFile: {
    brand: string;
    last4: string;
    expMonth: string;
    expYear: string;
    label: string;
  };
  events: {
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
  }[];
};

const resolveInstructorDoc = (uid: string) => doc(firestore, 'instructorData', uid);

export const fetchInstructorData = async (uid: string) => {
  const snapshot = await getDoc(resolveInstructorDoc(uid));

  if (!snapshot.exists()) return null;

  const data = snapshot.data();
  return (data?.state as InstructorSyncPayload | undefined) ?? null;
};

export const subscribeToInstructorData = (
  uid: string,
  onData: (payload: InstructorSyncPayload | null) => void,
  onError?: (error: FirestoreError) => void,
): Unsubscribe =>
  onSnapshot(
    resolveInstructorDoc(uid),
    (snapshot) => {
      const data = snapshot.data();
      onData((data?.state as InstructorSyncPayload | undefined) ?? null);
    },
    (error) => {
      if (onError) onError(error);
    },
  );

export const saveInstructorData = async (uid: string, state: InstructorSyncPayload) => {
  await setDoc(
    resolveInstructorDoc(uid),
    {
      state,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
};
