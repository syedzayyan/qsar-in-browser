import { writable, type Writable } from 'svelte/store';
import { browser } from '$app/environment';

// Database configuration
const DB_NAME = 'app_store';
const DB_VERSION = 1;

// Open a connection to the database
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!browser) {
      reject(new Error('IndexedDB is only available in browser environments'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      // Create an object store for each storage type if it doesn't exist
      if (!db.objectStoreNames.contains('local')) {
        db.createObjectStore('local');
      }
      if (!db.objectStoreNames.contains('session')) {
        db.createObjectStore('session');
      }
    };
  });
}

// Helper function to create a deep copy and remove proxies
function stripProxies<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  // For primitive types, just return the value
  if (typeof obj !== 'object') {
    return obj;
  }
  
  // For arrays, map each element
  if (Array.isArray(obj)) {
    return obj.map(stripProxies) as unknown as T;
  }
  
  // For objects, create a new object with all properties
  const result: Record<string, any> = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      result[key] = stripProxies((obj as Record<string, any>)[key]);
    }
  }
  
  return result as T;
}

// Get a value from IndexedDB
async function getValue<T>(storeName: string, key: string, defaultValue: T): Promise<T> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onerror = () => {
        console.error(`Error reading ${key} from IndexedDB:`, request.error);
        resolve(defaultValue);
      };

      request.onsuccess = () => {
        resolve(request.result === undefined ? defaultValue : request.result);
      };
    });
  } catch (error) {
    console.error(`Error accessing IndexedDB:`, error);
    return defaultValue;
  }
}

// Set a value in IndexedDB
async function setValue<T>(storeName: string, key: string, value: T): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      
      // Strip proxies before storing
      const cleanValue = stripProxies(value);
      const request = store.put(cleanValue, key);

      request.onerror = () => {
        console.error(`Error saving ${key} to IndexedDB:`, request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  } catch (error) {
    console.error(`Error accessing IndexedDB:`, error);
  }
}

export function persistent<T>(key: string, initialValue: T, storageType: 'local' | 'session' = 'local'): Writable<T> {
  // Create a new writable store with the initial value
  const store = writable<T>(initialValue);
  
  if (browser) {
    // Initialize the store with the value from IndexedDB
    getValue<T>(storageType, key, initialValue).then(value => {
      store.set(value);
    });

    // Subscribe to changes and update IndexedDB
    store.subscribe(value => {
      setValue(storageType, key, value).catch(error => {
        console.error(`Failed to persist ${key} to IndexedDB:`, error);
      });
    });
  }

  return store;
}
