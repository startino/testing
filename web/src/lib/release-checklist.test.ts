import { describe, expect, it } from 'vitest';
import {
	RELEASE_CHECKLIST_DEFINITIONS,
	RELEASE_PHASES,
	createReleaseChecklistState,
	getReleaseProgress,
	getVisibleReleaseGroups,
	restoreReleaseChecklistState,
	serializeReleaseChecklistState,
} from './release-checklist.js';

describe('release checklist', () => {
	it('provides four ordered phases and twelve stable checklist items', () => {
		expect(RELEASE_PHASES.map((phase) => phase.id)).toEqual([
			'plan',
			'verify',
			'launch',
			'follow',
		]);
		expect(RELEASE_CHECKLIST_DEFINITIONS).toHaveLength(12);
		expect(new Set(RELEASE_CHECKLIST_DEFINITIONS.map((item) => item.id)).size).toBe(12);
		expect(createReleaseChecklistState().items['plan-scope']).toEqual({
			completed: false,
			owner: '',
			dueDate: '',
		});
	});

	it('calculates progress for empty, partial, complete, and defensive empty states', () => {
		const state = createReleaseChecklistState();
		expect(getReleaseProgress(state)).toEqual({
			completed: 0,
			total: 12,
			remaining: 12,
			percent: 0,
		});
		state.items['plan-scope'].completed = true;
		expect(getReleaseProgress(state)).toEqual({
			completed: 1,
			total: 12,
			remaining: 11,
			percent: 8,
		});
		for (const item of Object.values(state.items)) item.completed = true;
		expect(getReleaseProgress(state)).toEqual({
			completed: 12,
			total: 12,
			remaining: 0,
			percent: 100,
		});
		expect(getReleaseProgress({ items: {} })).toEqual({
			completed: 0,
			total: 0,
			remaining: 0,
			percent: 0,
		});
	});

	it('filters items without changing phase order and omits empty phases', () => {
		const state = createReleaseChecklistState();
		state.items['plan-scope'].completed = true;
		state.items['launch-config'].completed = true;
		expect(getVisibleReleaseGroups(state, 'completed').map((group) => group.phase.id)).toEqual([
			'plan',
			'launch',
		]);
		expect(
			getVisibleReleaseGroups(state, 'completed').map((group) =>
				group.items.map((item) => item.id)
			)
		).toEqual([['plan-scope'], ['launch-config']]);
		expect(getVisibleReleaseGroups(state, 'remaining')).toHaveLength(4);
		expect(getVisibleReleaseGroups(state, 'all').flatMap((group) => group.items)).toHaveLength(
			12
		);
	});

	it('restores valid values by stable ID and ignores unknown or missing items', () => {
		const restored = restoreReleaseChecklistState(
			JSON.stringify({
				version: 1,
				items: {
					'plan-scope': { completed: true, owner: 'Ada', dueDate: '2026-08-20' },
					unknown: { completed: true, owner: 'Ignored', dueDate: '' },
				},
			})
		);
		expect(restored.items['plan-scope']).toEqual({
			completed: true,
			owner: 'Ada',
			dueDate: '2026-08-20',
		});
		expect(restored.items['plan-owner']).toEqual({ completed: false, owner: '', dueDate: '' });
		expect(Object.keys(restored.items)).toHaveLength(12);
	});

	it.each([
		['invalid JSON', '{'],
		['wrong version', JSON.stringify({ version: 2, items: {} })],
		['array payload', JSON.stringify([])],
		['array items', JSON.stringify({ version: 1, items: [] })],
		[
			'missing fields',
			JSON.stringify({ version: 1, items: { 'plan-scope': { completed: true } } }),
		],
		[
			'wrong field types',
			JSON.stringify({
				version: 1,
				items: { 'plan-scope': { completed: 'yes', owner: '', dueDate: '' } },
			}),
		],
		[
			'invalid date',
			JSON.stringify({
				version: 1,
				items: { 'plan-scope': { completed: true, owner: 'Ada', dueDate: 'tomorrow' } },
			}),
		],
		[
			'impossible date',
			JSON.stringify({
				version: 1,
				items: { 'plan-scope': { completed: true, owner: 'Ada', dueDate: '2026-02-31' } },
			}),
		],
	])('recovers from %s', (_name, raw) => {
		expect(restoreReleaseChecklistState(raw)).toEqual(createReleaseChecklistState());
	});

	it('serializes only the known versioned item schema', () => {
		const state = createReleaseChecklistState();
		state.items['plan-scope'] = { completed: true, owner: 'Ada', dueDate: '2026-08-20' };
		state.items.unknown = { completed: true, owner: 'Ignored', dueDate: '' };
		const saved = JSON.parse(serializeReleaseChecklistState(state));
		expect(saved.version).toBe(1);
		expect(saved.items['plan-scope']).toEqual({
			completed: true,
			owner: 'Ada',
			dueDate: '2026-08-20',
		});
		expect(saved.items.unknown).toBeUndefined();
		expect(Object.keys(saved)).toEqual(['version', 'items']);
	});

	it('creates independent mutable item records', () => {
		const first = createReleaseChecklistState();
		const second = createReleaseChecklistState();
		first.items['plan-scope'].owner = 'Ada';
		expect(second.items['plan-scope'].owner).toBe('');
		expect(first.items['plan-scope']).not.toBe(second.items['plan-scope']);
	});
});
