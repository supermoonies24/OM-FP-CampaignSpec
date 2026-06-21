// Bounded-concurrency map. Used to throttle parallel external API calls
// (Claude, Figma, Outlook) so a batch operation over N items doesn't fan out
// N in-flight requests and trip a rate limit.

export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const max = Math.max(1, Math.min(limit, items.length));
  const results: R[] = new Array(items.length);
  let cursor = 0;

  async function worker(): Promise<void> {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  }

  await Promise.all(Array.from({ length: max }, () => worker()));
  return results;
}
