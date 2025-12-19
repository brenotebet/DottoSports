import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';

import { db } from './firebase';

const studentProfileCache = new Map<string, string | null>();

/**
 * Resolve a student profile id for a given auth UID.
 * Returns the Firestore document id for studentProfiles or null if none exists.
 */
export const resolveStudentProfileId = async (uid: string): Promise<string | null> => {
  if (!uid) return null;
  if (studentProfileCache.has(uid)) {
    return studentProfileCache.get(uid) ?? null;
  }

  try {
    const directRef = doc(db, 'studentProfiles', uid);
    const directSnap = await getDoc(directRef);
    if (directSnap.exists()) {
      const data = directSnap.data() as { userId?: string };
      if (data?.userId === uid) {
        studentProfileCache.set(uid, directSnap.id);
        return directSnap.id;
      }
    }
  } catch (error) {
    console.warn('Fast-path studentProfiles/{uid} lookup failed, continuing to query.', error);
  }

  try {
    const profilesQuery = query(collection(db, 'studentProfiles'), where('userId', '==', uid));
    const snapshot = await getDocs(profilesQuery);
    const first = snapshot.docs[0];
    const resolvedId = first?.id ?? null;
    studentProfileCache.set(uid, resolvedId);
    return resolvedId;
  } catch (error) {
    console.warn('Unable to resolve student profile id for uid', uid, error);
    studentProfileCache.set(uid, null);
    return null;
  }
};
