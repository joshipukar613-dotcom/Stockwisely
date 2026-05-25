class EmailQueue {
  constructor({ ratePerMinute = 10, maxRetries = 3, backoffMs = 2000 } = {}) {
    this.queue = [];
    this.running = false;
    this.ratePerMinute = ratePerMinute;
    this.intervalMs = Math.max(60000 / Math.max(1, ratePerMinute), 100);
    this.maxRetries = maxRetries;
    this.backoffMs = backoffMs;
  }

  add(job) {
    this.queue.push({ job, attempts: 0 });
    this.start();
  }

  async processItem(item) {
    try {
      await item.job();
    } catch (err) {
      item.attempts += 1;
      if (item.attempts <= this.maxRetries) {
        setTimeout(() => this.queue.unshift(item), this.backoffMs * item.attempts);
      }
    }
  }

  start() {
    if (this.running) return;
    this.running = true;
    const tick = async () => {
      if (this.queue.length === 0) {
        this.stop();
        return;
      }
      const item = this.queue.shift();
      if (item) {
        await this.processItem(item);
      }
    };
    tick(); // Execute first item immediately
    this.timer = setInterval(tick, this.intervalMs);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.running = false;
  }
}

module.exports = { EmailQueue };
