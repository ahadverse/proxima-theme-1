'use client';

import { useSyncExternalStore } from 'react';
import { DEFAULT_SETTINGS } from '@/types/settings';
import { getRevision, getStoreName, subscribeToChanges } from './hub';

/** A number that goes up whenever the shop's data changes in another tab or in the demo admin. */
export function useDemoRevision(): number {
  return useSyncExternalStore(subscribeToChanges, getRevision, () => 0);
}

/** The store's name as last loaded from the local data (for page titles). */
export function useStoreName(): string {
  return useSyncExternalStore(subscribeToChanges, getStoreName, () => DEFAULT_SETTINGS.storeName);
}
