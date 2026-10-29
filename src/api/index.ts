import type { DataSource } from './dataSource';
import { LocalStore } from './localStore';

export const dataSource: DataSource = new LocalStore({ storage: window.localStorage, listenToStorageEvents: true });
