import * as admin from 'firebase-admin';
import { onDocumentUpdated } from 'firebase-functions/v2/firestore';

export const promoteWaitlist = onDocumentUpdated(
  'enrollments/{enrollmentId}',
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();

    // Safety checks
    if (!before || !after) return;

    // Only act when an ACTIVE enrollment becomes CANCELLED
    if (before.status !== 'active' || after.status !== 'cancelled') return;

    const classId = after.classId;
    if (!classId) return;

    const db = admin.firestore();

    // Find the oldest waitlisted enrollment for this class
    const waitlistSnap = await db
      .collection('enrollments')
      .where('classId', '==', classId)
      .where('status', '==', 'waitlist')
      .orderBy('createdAt', 'asc')
      .limit(1)
      .get();

    if (waitlistSnap.empty) {
      console.log(`No waitlist found for class ${classId}`);
      return;
    }

    const nextEnrollmentRef = waitlistSnap.docs[0].ref;

    // Promote waitlisted student
    await nextEnrollmentRef.update({
      status: 'active',
      updatedAt: new Date().toISOString(),
    });

    console.log(`Waitlisted enrollment ${nextEnrollmentRef.id} promoted to active`);
  }
);
