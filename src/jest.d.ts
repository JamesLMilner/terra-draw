declare global {
  namespace jest {
    interface Matchers<R> {
      toBeUUID4(): R;
    }
  }
}

export {};
