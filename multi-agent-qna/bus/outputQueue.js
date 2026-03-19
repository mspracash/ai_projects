export class OutputQueue {
  constructor() {
    this.items = [];
    this.waiters = [];
    this.closed = false;
  }

  push(item) {
    if (this.closed) {
      throw new Error("Cannot push to a closed output queue.");
    }

    if (this.waiters.length > 0) {
      const resolve = this.waiters.shift();
      resolve(item);
      return;
    }

    this.items.push(item);
  }

  async pop() {
    if (this.items.length > 0) {
      return this.items.shift();
    }

    if (this.closed) {
      return null;
    }

    return new Promise((resolve) => {
      this.waiters.push(resolve);
    });
  }

  close() {
    this.closed = true;

    while (this.waiters.length > 0) {
      const resolve = this.waiters.shift();
      resolve(null);
    }
  }

  reset() {
    this.items = [];
    this.waiters = [];
    this.closed = false;
  }
}