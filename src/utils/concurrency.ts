import PQueue from 'p-queue';

// Like Promise.all(items.map(fn)) but with at most `concurrency` tasks in flight.
const mapWithConcurrency = <T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> => {
  const queue = new PQueue({ concurrency });
  return Promise.all(items.map((item) => queue.add(() => fn(item))));
};

export default mapWithConcurrency;
