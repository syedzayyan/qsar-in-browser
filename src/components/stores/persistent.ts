import { writable, type Writable } from 'svelte/store';
import { browser } from '$app/environment';

export function persistent<T>(key: string, initialValue: T, storageType: 'local' | 'session' = 'local'): Writable<T> {
    const storage = browser ? (storageType === 'local' ? localStorage : sessionStorage) : null;

    let storedValue = initialValue;

    if (browser && storage) {
        try {
            const json = storage.getItem(key);
            if (json) storedValue = JSON.parse(json);
        } catch (error) {
            console.error(`Error reading ${key} from storage:`, error);
        }
    }

    const store = writable<T>(storedValue);

    if (browser && storage) {
        store.subscribe((value) => {
            try {
                storage.setItem(key, JSON.stringify(value));
            } catch (error) {
                console.error(`Error saving ${key} to storage:`, error);
            }
        });
    }

    return store;
}
