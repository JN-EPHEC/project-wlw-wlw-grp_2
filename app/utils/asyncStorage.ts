type AsyncStorageLike = {
    getItem: (key: string) => Promise<string | null>;
    setItem: (key: string, value: string) => Promise<void>;
    removeItem: (key: string) => Promise<void>;
};

const memoryStore = new Map<string, string>();

async function loadFromPackage(): Promise<AsyncStorageLike | null> {
    // eslint-disable-next-line import/no-unresolved
    const module = await import('@react-native-async-storage/async-storage').catch(() => null);

    if (!module) {
        return null;
    }

    const asyncStorage: any = module.default || module;
    return asyncStorage;
}

function createMemoryFallback(): AsyncStorageLike {
    return {
        async getItem(key: string) {
            return memoryStore.get(key) ?? null;
        },
        async setItem(key: string, value: string) {
            memoryStore.set(key, value);
        },
        async removeItem(key: string) {
            memoryStore.delete(key);
        }
    };
}

export default async function getAsyncStorage(): Promise<AsyncStorageLike> {
    const asyncStorage = await loadFromPackage();

    if (asyncStorage) {
        return asyncStorage;
    }

    console.warn('AsyncStorage package missing; using in-memory fallback. Data will reset when the app reloads.');
    return createMemoryFallback();
}