// Stolen from https://github.com/oMaN-Rod/palworld-save-pal/blob/main/ui/src/lib/states/persistedState.svelte.ts
import { writable, type Writable } from 'svelte/store';

type Serializer<T> = {
	parse: (text: string) => T;
	stringify: (object: T) => string;
};

type StorageType = 'local' | 'session';

interface Options<T> {
	storage?: StorageType;
	serializer?: Serializer<T>;
	syncTabs?: boolean;
	onWriteError?: (error: unknown) => void;
	onParseError?: (error: unknown) => void;
	beforeRead?: (value: T) => T;
	beforeWrite?: (value: T) => T;
}

// Central store map to hold persisted state instances
const storeMap = new Map<string, Writable<any>>();

/**
 * Initializes and returns a writable Svelte store that persists to localStorage or sessionStorage.
 */
export function persistedState<T>(key: string, initialValue: T, options: Options<T> = {}) {
	// Return existing store if it was already initialized
	if (storeMap.has(key)) return storeMap.get(key) as Writable<T>;

	const {
		storage = 'local',
		serializer = JSON,
		syncTabs = true,
		onWriteError = console.error,
		onParseError = console.error,
		beforeRead = (v: T) => v,
		beforeWrite = (v: T) => v
	} = options;

	const storageArea = storage === 'local' ? localStorage : sessionStorage;

	let storedValue: T;
	try {
		const item = storageArea.getItem(key);
		storedValue = item ? beforeRead(serializer.parse(item)) : initialValue;
	} catch (error) {
		onParseError(error);
		storedValue = initialValue;
	}

	// Create a reactive writable store
	const store = writable<T>(storedValue, (set) => {
		// Sync between tabs if enabled
		if (syncTabs && typeof window !== 'undefined' && storage === 'local') {
			const handler = (event: StorageEvent) => {
				if (event.key === key && event.storageArea === localStorage) {
					try {
						const newValue = event.newValue ? serializer.parse(event.newValue) : initialValue;
						set(beforeRead(newValue));
					} catch (error) {
						onParseError(error);
					}
				}
			};

			window.addEventListener('storage', handler);
			return () => window.removeEventListener('storage', handler);
		}
	});

	// Automatically save to localStorage/sessionStorage when store updates
	store.subscribe((value) => {
		try {
			const valueToStore = beforeWrite(value);
			storageArea.setItem(key, serializer.stringify(valueToStore));
		} catch (error) {
			onWriteError(error);
		}
	});

	// Store it in the global storeMap for reuse
	storeMap.set(key, store);
	return store;
}

/**
 * Retrieves an existing persisted state store without reinitializing.
 */
export function usePersistedState<T>(key: string): Writable<T> {
	const store = storeMap.get(key);
	if (!store) {
		throw new Error(`Persisted state with key "${key}" has not been initialized.`);
	}
	return store as Writable<T>;
}

