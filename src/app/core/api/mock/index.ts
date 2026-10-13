// Everything the mock API computes, behind one dynamic import so the generator
// never lands in the first bundle.
export * from './generate';
export { queryRequests } from './query-requests';
export { NOW } from './catalog';
