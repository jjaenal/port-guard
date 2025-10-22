/* eslint-disable @typescript-eslint/no-unused-vars */
type AsyncStorageLike = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
  clear?: () => Promise<void>;
};

const AsyncStorageShim: AsyncStorageLike = {
  async getItem(_key: string) {
    return null;
  },
  async setItem(_key: string, _value: string) {
    // no-op shim for web
  },
  async removeItem(_key: string) {
    // no-op shim for web
  },
  async clear() {
    // no-op shim for web
  },
};

export default AsyncStorageShim;
