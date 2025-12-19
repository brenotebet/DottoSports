/* eslint-disable @typescript-eslint/no-explicit-any */
import { collection, doc, getDocs, setDoc } from 'firebase/firestore';

import * as seedData from '@/constants/seed-data';
import type { DatabaseSchema } from '@/constants/schema';
import { db } from '@/services/firebase';

type SeedableCollection = keyof DatabaseSchema;

// Only seed content collections that are not tied to an auth-generated identifier.
const seedCollections: Array<{ key: SeedableCollection; data: any[] }> = [
  { key: 'classes', data: seedData.classes },
  { key: 'sessions', data: seedData.sessions },
  { key: 'planOptions', data: seedData.planOptions },
];

const collectionIsEmpty = async (key: SeedableCollection) => {
  const snap = await getDocs(collection(db, key));
  return snap.empty;
};

export const seedFirestore = async () => {
  if (typeof __DEV__ !== 'undefined' && !__DEV__) return;

  const emptiness = await Promise.all(seedCollections.map(async ({ key }) => ({ key, empty: await collectionIsEmpty(key) })));
  const nothingToSeed = emptiness.every((entry) => !entry.empty);
  if (nothingToSeed) return;

  await Promise.all(
    seedCollections.map(async ({ key, data }) => {
      const isEmpty = emptiness.find((entry) => entry.key === key)?.empty;
      if (!isEmpty) return;

      await Promise.all(
        data.map(async (item) => {
          const docId = item.id ?? doc(collection(db, key)).id;
          await setDoc(doc(db, key, docId), { ...item, id: docId });
        }),
      );
    }),
  );
};

export const SeedFirestore = {
  run: seedFirestore,
};
