type AsyncStorageLike = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

const memoryStore = new Map<string, string>();

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

// ✅ EXPORT SYNCHRONE - Pas de async ici !
let asyncStorageInstance: AsyncStorageLike | null = null;

function getAsyncStorage(): AsyncStorageLike {
  if (asyncStorageInstance) {
    return asyncStorageInstance;
  }

  try {
    // Essayer d'importer AsyncStorage de manière synchrone
    const AsyncStorageModule = require('@react-native-async-storage/async-storage');
    const AsyncStorage = AsyncStorageModule.default || AsyncStorageModule;
    
    if (
      AsyncStorage &&
      typeof AsyncStorage.getItem === 'function' &&
      typeof AsyncStorage.setItem === 'function' &&
      typeof AsyncStorage.removeItem === 'function'
    ) {
      asyncStorageInstance = AsyncStorage;
      return AsyncStorage;
    }
  } catch (error) {
    console.warn('AsyncStorage not available, using memory fallback:', error);
  }

  // Fallback vers mémoire
  asyncStorageInstance = createMemoryFallback();
  return asyncStorageInstance;
}

export default getAsyncStorage();