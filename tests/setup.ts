import '@testing-library/jest-dom/vitest';

// jsdom has no layout engine; Recharts' ResponsiveContainer needs ResizeObserver to exist.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
