import { describe, expect, it, vi } from 'vitest';
import { computeDelay, retry } from './retry.ts';

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

    // --- Full jitter at the supremum: random() === 1 asserts the cap never
    // breaks even at the RNG's theoretical upper bound. Note random()===1 is
    // BEYOND the [0,1) contract (a real Math.random never returns 1); it is
    // used deliberately as the supremum so delay === base and we prove the
    // cap holds at the tightest possible point. ---
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
          random: () => 1, // supremum: delay === base (beyond the [0,1) contract)
          sleep,
        }),
      ).rejects.toThrow();
      // At the supremum, delay === base, which is min-capped at 500.
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

  it('retries: NaN falls back to the default (does not skip every attempt)', async () => {
    const { sleep, calls } = sleepSpy();
    const last = new Error('final');
    let n = 0;
    const fn = vi.fn(async () => {
      throw n++ === 3 ? last : new Error(`n${n}`);
    });

    // NaN must fall back to DEFAULTS.retries (3) => 4 attempts, and rethrow the
    // last REAL fn error by identity -- never the 'retry: unreachable' phantom.
    const rejection = retry(fn, { retries: NaN, sleep, jitter: false });
    await expect(rejection).rejects.toBe(last);
    await expect(rejection).rejects.not.toThrow('retry: unreachable');
    expect(fn).toHaveBeenCalledTimes(4); // DEFAULTS.retries + 1
    expect(calls).toHaveLength(3); // DEFAULTS.retries
  });

  it('retries: Infinity retries until success without exhausting', async () => {
    const { sleep, calls } = sleepSpy();
    let attempts = 0;
    const fn = vi.fn(async () => {
      attempts++;
      if (attempts < 6) throw new Error(`fail ${attempts}`);
      return 'won';
    });

    const result = await retry(fn, { retries: Infinity, sleep, jitter: false });

    expect(result).toBe('won');
    expect(fn).toHaveBeenCalledTimes(6);
    expect(calls).toHaveLength(5);
  });
});

describe('computeDelay', () => {
  const base = {
    minDelayMs: 100,
    maxDelayMs: 500,
    factor: 2,
  } as const;

  it('jitter:false returns the exact capped backoff base per attemptIndex', () => {
    const opts = { ...base, jitter: false, random: () => 0.5 };
    // uncapped bases: 100, 200, 400, 800, 1600 -> capped at 500: 100,200,400,500,500
    expect([0, 1, 2, 3, 4].map((i) => computeDelay(i, opts))).toEqual([
      100, 200, 400, 500, 500,
    ]);
    // random must NOT be consulted when jitter is off.
    const random = vi.fn(() => 0.5);
    computeDelay(0, { ...base, jitter: false, random });
    expect(random).not.toHaveBeenCalled();
  });

  it('jitter:true scales the capped base by random(), staying within the cap', () => {
    // random() === 0.5 -> half of each capped base.
    const half = { ...base, jitter: true, random: () => 0.5 };
    expect([0, 1, 2, 3, 4].map((i) => computeDelay(i, half))).toEqual([
      50, 100, 200, 250, 250,
    ]);
    // random() === 0 -> floor of the range is 0.
    expect(computeDelay(4, { ...base, jitter: true, random: () => 0 })).toBe(0);
    // random() === 1 (supremum, beyond [0,1)) -> delay === capped base, still <= cap.
    expect(computeDelay(4, { ...base, jitter: true, random: () => 1 })).toBe(500);
  });
});
