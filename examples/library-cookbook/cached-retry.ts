import { formatDuration } from '../../src/duration/duration.mjs';
import { createLRU } from '../../src/lru/lru.mjs';
import { pipe, tap } from '../../src/pipe/pipe.mjs';
import { err, match, ok } from '../../src/result/result.mjs';
import { retry } from '../../src/retry/retry.ts';

type Profile = {
  id: string;
  displayName: string;
};

type RequestFailure = Error & {
  temporary: boolean;
};

const profiles = createLRU({ max: 2, ttl: 60_000 });
const waits: number[] = [];
let attempts = 0;

const requestProfile = async (id: string): Promise<Profile> => {
  attempts += 1;
  if (attempts < 3) {
    const failure = new Error('The profile service is busy.') as RequestFailure;
    failure.temporary = true;
    throw failure;
  }
  return { id, displayName: 'Ada Lovelace' };
};

const loadProfile = async (id: string) => {
  const cached = profiles.get(id);
  if (cached !== undefined) return ok({ source: 'cache', profile: cached });

  try {
    const profile = await retry(() => requestProfile(id), {
      retries: 3,
      minDelayMs: 250,
      factor: 2,
      jitter: false,
      shouldRetry: (failure) =>
        failure instanceof Error &&
        'temporary' in failure &&
        failure.temporary === true,
      sleep: async (delayMs) => {
        waits.push(delayMs);
      },
    });

    return ok({
      source: 'service',
      profile: pipe(
        profile,
        tap((value) => profiles.set(id, value)),
      ),
    });
  } catch (failure) {
    return err(failure);
  }
};

const first = await loadProfile('user-42');
const second = await loadProfile('user-42');

const printOutcome = (outcome: Awaited<ReturnType<typeof loadProfile>>) =>
  match(outcome, {
    ok: ({ source, profile }) => console.log(`${source}: ${profile.displayName}`),
    err: (failure) => console.error(failure),
  });

printOutcome(first);
printOutcome(second);
console.log(`attempts: ${attempts}`);
console.log(`waits: ${waits.map(formatDuration).join(', ')}`);
