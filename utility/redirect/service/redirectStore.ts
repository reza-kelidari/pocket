// @/store/redirectStore.ts

class RedirectStore {
  private redirects: string[] = [];
  private listeners: (() => void)[] = [];

  private notify() {
    this.listeners.forEach((listener) => listener());
  }

  add(url: string) {
    if (!url || url === "/") return;
    // جلوگیری از تکرار متوالی
    if (this.redirects[this.redirects.length - 1] !== url) {
      this.redirects.push(url);
      this.notify();
    }
  }

  back() {
    if (this.redirects.length > 0) {
      this.redirects.pop();
      this.notify();
    }
    return this.last();
  }

  replaceLast(url: string) {
    this.redirects.pop();

    this.redirects.push(url);
    this.notify();
  }

  last(): string {
    return this.redirects[this.redirects.length - 1] || "/";
  }

  getAll(): string[] {
    return [...this.redirects];
  }

  clear() {
    this.redirects = [];
    this.notify();
  }

  // برای useSyncExternalStore
  subscribe = (listener: () => void) => {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  };

  getSnapshot = () => this.redirects;
}

// Singleton
export const redirectStore = new RedirectStore();
export default redirectStore;
