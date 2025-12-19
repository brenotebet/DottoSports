/* eslint-disable no-console */
/**
 * Backfill script to add `studentUid` to legacy documents that only have `studentId`.
 * Usage:
 *   1) Ensure application default credentials are available (GOOGLE_APPLICATION_CREDENTIALS).
 *   2) Run `npm install firebase-admin` if not already installed.
 *   3) Execute with `node scripts/backfill-student-uid.js`.
 *
 * The script is idempotent and will only update documents missing `studentUid`.
 */
let admin;
try {
  // eslint-disable-next-line import/no-extraneous-dependencies, global-require
  admin = require('firebase-admin');
} catch (error) {
  console.error('Missing firebase-admin dependency. Install it with `npm install firebase-admin` before running.', error);
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

const db = admin.firestore();

const studentProfileCache = new Map();
const studentOwnedCollections = [
  'enrollments',
  'studentPlans',
  'sessionBookings',
  'creditReinstatements',
  'payments',
  'evaluations',
  'goals',
];

async function resolveStudentUid(studentId) {
  if (!studentId) return null;
  if (studentProfileCache.has(studentId)) {
    return studentProfileCache.get(studentId);
  }

  try {
    const snap = await db.collection('studentProfiles').doc(studentId).get();
    if (snap.exists) {
      const data = snap.data() || {};
      const resolvedUid = data.userId || null;
      studentProfileCache.set(studentId, resolvedUid);
      return resolvedUid;
    }
  } catch (error) {
    console.warn(`Failed to resolve student profile for ${studentId}`, error);
  }

  studentProfileCache.set(studentId, null);
  return null;
}

async function backfillCollection(collectionName) {
  const snapshot = await db.collection(collectionName).get();
  const pending = snapshot.docs.filter((docSnap) => {
    const data = docSnap.data() || {};
    return !data.studentUid && data.studentId;
  });

  if (!pending.length) {
    console.log(`[${collectionName}] No documents require backfill.`);
    return;
  }

  console.log(`[${collectionName}] Found ${pending.length} documents to backfill.`);

  const chunks = [];
  for (let i = 0; i < pending.length; i += 400) {
    chunks.push(pending.slice(i, i + 400));
  }

  for (const chunk of chunks) {
    const batch = db.batch();

    // eslint-disable-next-line no-await-in-loop
    await Promise.all(
      chunk.map(async (docSnap) => {
        const data = docSnap.data() || {};
        const studentUid = await resolveStudentUid(data.studentId);
        if (!studentUid) {
          console.warn(`[${collectionName}] Skipping ${docSnap.id}; no userId found for studentId ${data.studentId}`);
          return;
        }
        batch.update(docSnap.ref, { studentUid, studentId: data.studentId });
      }),
    );

    // eslint-disable-next-line no-await-in-loop
    await batch.commit();
    console.log(`[${collectionName}] Backfilled batch of ${chunk.length} documents.`);
  }
}

async function run() {
  console.log('Starting studentUid backfill...');
  for (const collectionName of studentOwnedCollections) {
    // eslint-disable-next-line no-await-in-loop
    await backfillCollection(collectionName);
  }
  console.log('Backfill completed.');
}

if (require.main === module) {
  run().catch((error) => {
    console.error('Backfill failed', error);
    process.exitCode = 1;
  });
}
