import { describe, expect, it, vi } from 'vitest';
import { retry } from './retry.ts';

/**
 * A sleep spy that records every delay it was asked to wait and resolves
 * immediately — so no wall-clock time passes and the retry loop runs instantly.
 */
function sleepSpy() {
  const calls: number[] = [];
  const sleep = vi.fn(async (ms: number): Promise<void> => {
    calls.push(ms);
  });
  return { sleep, calls };
}

describe('retry', () => {
  it('succeeds on the first try: fn called once, zero sleeps', async () => {
    const { sleep, calls } = sleepSpy();
    const fn = vi.fn(async () => 'ok');

    const result = await retry(fn, { sleep });

    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(calls).toEqual([]);
  });

  it('succeeds on the Nth try: fn called N times, N-1 sleeps', async () => {
    const { sleep, calls } = sleepSpy();
    // Fail twice, then succeed on the 3rd attempt (N = 3).
    let attempts = 0;
    const fn = vi.fn(async () => {
      attempts++;
      if (attempts < 3) throw new Error(`fail ${attempts}`);
      return 'third-time';
    });

    const result = await retry(fn, { retries: 5, sleep, jitter: false });

    expect(result).toBe('third-time');
    expect(fn).toHaveBeenCalledTimes(3); // N
    expect(calls).toHaveLength(2); // N - 1
  });

  it('exhausts attempts and rethrows the FINAL error by identity', async () => {
    const { sleep, calls } = sleepSpy();
    const errors = [new Error('e1'), new Error('e2'), new Error('e3')];
    let i = 0;
    const fn = vi.fn(async () => {
      throw errors[i++];
    });

    // retries: 2 => 3 total attempts, 2 sleeps between them.
    await expect(retry(fn, { retries: 2, sleep, jitter: false })).rejects.toBe(
      errors[2], // the LAST underlying error, by identity
    );
    expect(fn).toHaveBeenCalledTimes(3); // retries + 1
    expect(calls).toHaveLength(2); // retries
  });

  it('shouldRetry -> false short-circuits: no sleep, no further attempt', async () => {
    const { sleep, calls } = sleepSpy();
    const boom = new Error('non-transient');
    const fn = vi.fn(async () => {
      throw boom;
    });
    const shouldRetry = vi.fn(() => false);

    await expect(
      retry(fn, { retries: 5, sleep, shouldRetry, jitter: false }),
    ).rejects.toBe(boom);

    expect(fn).toHaveBeenCalledTimes(1); // no retry after the declining verdict
    expect(calls).toEqual([]); // no sleep
    // Predicate saw the error and the 1-based attempt that failed.
    expect(shouldRetry).toHaveBeenCalledTimes(1);
    expect(shouldRetry).toHaveBeenCalledWith(boom, 1);
  });

  it('honors maxDelayMs capping — deterministic and under full jitter', async () => {
    // --- Deterministic (jitter: false): exact backoff sequence, capped. ---
    {
      const { sleep, calls } = sleepSpy();
      let n = 0;
      const fn = vi.fn(async () => {
        throw new Error(`f${n++}`);
      });
      // minDelay 100, factor 2, cap 500: bases = 100, 200, 400, 800->500, 1600->500.
      await expect(
        retry(fn, {
          retries: 5,
          minDelayMs: 100,
          maxDelayMs: 500,
          factor: 2,
          jitter: false,
          sleep,
        }),
      ).rejects.toThrow();
      expect(calls).toEqual([100, 200, 400, 500, 500]);
      for (const ms of calls) expect(ms).toBeLessThanOrEqual(500);
    }

    // --- Full jitter with random() === 1 (worst case): delay == base, capped. ---
    {
      const { sleep, calls } = sleepSpy();
      let n = 0;
      const fn = vi.fn(async () => {
        throw new Error(`g${n++}`);
      });
      await expect(
        retry(fn, {
          retries: 5,
          minDelayMs: 100,
          maxDelayMs: 500,
          factor: 2,
          jitter: true,
          random: () => 1, // full-jitter upper bound => delay === base
          sleep,
        }),
      ).rejects.toThrow();
      // random()===1 gives delay === base, which is min-capped at 500.
      expect(calls).toEqual([100, 200, 400, 500, 500]);
      for (const ms of calls) expect(ms).toBeLessThanOrEqual(500);
    }

    // --- Full jitter with random() === 0: floor of the range is 0. ---
    {
      const { sleep, calls } = sleepSpy();
      let n = 0;
      const fn = vi.fn(async () => {
        throw new Error(`h${n++}`);
      });
      await expect(
        retry(fn, {
          retries: 3,
          minDelayMs: 100,
          maxDelayMs: 500,
          factor: 2,
          jitter: true,
          random: () => 0,
          sleep,
        }),
      ).rejects.toThrow();
      expect(calls).toEqual([0, 0, 0]);
      for (const ms of calls) expect(ms).toBeGreaterThanOrEqual(0);
    }
  });

  it('shouldRetry receives the correct 1-based attempt index on each failure', async () => {
    const { sleep } = sleepSpy();
    const seen: number[] = [];
    let n = 0;
    const fn = vi.fn(async () => {
      throw new Error(`x${n++}`);
    });
    await expect(
      retry(fn, {
        retries: 3,
        sleep,
        jitter: false,
        shouldRetry: (_err, attempt) => {
          seen.push(attempt);
          return true;
        },
      }),
    ).rejects.toThrow();
    // 4 total attempts => predicate consulted on attempts 1..4 (last verdict
    // is moot because no attempts remain, but shouldRetry is only called when
    // a retry might follow: attempts 1,2,3). The 4th failure exhausts and
    // rethrows before consulting the predicate.
    expect(seen).toEqual([1, 2, 3]);
  });
});
