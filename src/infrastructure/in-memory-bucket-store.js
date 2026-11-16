class InMemoryBucketStore {
  constructor() {
    this.buckets = new Map();
  }

  get(endpoint) {
    return this.buckets.get(endpoint);
  }

  set(endpoint, bucket) {
    this.buckets.set(endpoint, bucket);
  }

  has(endpoint) {
    return this.buckets.has(endpoint);
  }

  size() {
    return this.buckets.size;
  }
}

module.exports = InMemoryBucketStore;
