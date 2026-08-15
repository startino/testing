import { formatDuration } from './duration.js';

export type ReleasePhase = 'plan' | 'verify' | 'launch' | 'follow';

export type ReleaseChecklistDefinition = Readonly<{
	id: string;
	phase: ReleasePhase;
	label: string;
}>;

export type ReleaseChecklistItemState = {
	completed: boolean;
	owner: string;
	dueDate: string;
};

export type ReleaseChecklistState = {
	items: Record<string, ReleaseChecklistItemState>;
};

export type ReleaseView = 'all' | 'remaining' | 'completed';

export type ReleaseDueTone = 'none' | 'today' | 'upcoming' | 'overdue';

export type ReleaseDueStatus = Readonly<{ tone: ReleaseDueTone; label: string }>;

export const RELEASE_STORAGE_KEY = 'startino.release-readiness.v1';
export const RELEASE_STORAGE_VERSION = 1;

export const RELEASE_PHASES = [
	{ id: 'plan', label: 'Plan' },
	{ id: 'verify', label: 'Verify' },
	{ id: 'launch', label: 'Launch' },
	{ id: 'follow', label: 'Follow up' },
] as const satisfies ReadonlyArray<Readonly<{ id: ReleasePhase; label: string }>>;

export const RELEASE_CHECKLIST_DEFINITIONS = [
	{ id: 'plan-scope', phase: 'plan', label: 'Scope confirmed' },
	{ id: 'plan-owner', phase: 'plan', label: 'Release owner assigned' },
	{ id: 'plan-notes', phase: 'plan', label: 'Release notes drafted' },
	{ id: 'verify-core-journey', phase: 'verify', label: 'Core user journey checked' },
	{ id: 'verify-accessibility', phase: 'verify', label: 'Accessibility reviewed' },
	{ id: 'verify-recovery', phase: 'verify', label: 'Monitoring and rollback prepared' },
	{ id: 'launch-config', phase: 'launch', label: 'Production configuration checked' },
	{ id: 'launch-approval', phase: 'launch', label: 'Deployment approved' },
	{ id: 'launch-comms', phase: 'launch', label: 'Stakeholder communication ready' },
	{ id: 'follow-health', phase: 'follow', label: 'Production health checked' },
	{ id: 'follow-feedback', phase: 'follow', label: 'Feedback captured' },
	{ id: 'follow-work', phase: 'follow', label: 'Follow-up work recorded' },
] as const satisfies ReadonlyArray<ReleaseChecklistDefinition>;

export type VisibleReleaseGroup = {
	phase: (typeof RELEASE_PHASES)[number];
	items: ReadonlyArray<ReleaseChecklistDefinition>;
};

const knownIds = new Set<string>(RELEASE_CHECKLIST_DEFINITIONS.map((item) => item.id));
const datePattern = /^(\d{4})-(\d{2})-(\d{2})$/;

export function createReleaseChecklistState(): ReleaseChecklistState {
	return {
		items: Object.fromEntries(
			RELEASE_CHECKLIST_DEFINITIONS.map((item) => [
				item.id,
				{ completed: false, owner: '', dueDate: '' },
			])
		),
	};
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isValidDueDate(value: string): boolean {
	if (value === '') return true;
	const match = datePattern.exec(value);
	if (match === null) return false;
	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);
	const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
	const daysPerMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
	return year > 0 && month >= 1 && month <= 12 && day >= 1 && day <= daysPerMonth[month - 1];
}

function isPersistedItem(value: unknown): value is ReleaseChecklistItemState {
	if (!isRecord(value)) return false;
	return (
		typeof value.completed === 'boolean' &&
		typeof value.owner === 'string' &&
		typeof value.dueDate === 'string' &&
		isValidDueDate(value.dueDate)
	);
}

export function restoreReleaseChecklistState(raw: string | null): ReleaseChecklistState {
	const defaults = createReleaseChecklistState();
	if (raw === null) return defaults;

	try {
		const saved: unknown = JSON.parse(raw);
		if (
			!isRecord(saved) ||
			saved.version !== RELEASE_STORAGE_VERSION ||
			!isRecord(saved.items)
		) {
			return defaults;
		}

		for (const [id, value] of Object.entries(saved.items)) {
			if (!knownIds.has(id)) continue;
			if (!isPersistedItem(value)) return createReleaseChecklistState();
			defaults.items[id] = { ...value };
		}
		return defaults;
	} catch {
		return defaults;
	}
}

export function serializeReleaseChecklistState(state: ReleaseChecklistState): string {
	const items = Object.fromEntries(
		RELEASE_CHECKLIST_DEFINITIONS.map((definition) => {
			const value = state.items[definition.id] ?? {
				completed: false,
				owner: '',
				dueDate: '',
			};
			return [
				definition.id,
				{ completed: value.completed, owner: value.owner, dueDate: value.dueDate },
			];
		})
	);
	return JSON.stringify({ version: RELEASE_STORAGE_VERSION, items });
}

export function getReleaseProgress(state: ReleaseChecklistState) {
	const definitions = RELEASE_CHECKLIST_DEFINITIONS.filter((item) => item.id in state.items);
	const total = definitions.length;
	const completed = definitions.filter((item) => state.items[item.id]?.completed).length;
	const remaining = total - completed;
	const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
	return { completed, total, remaining, percent };
}

const MS_PER_DAY = 86400000;
const NO_DUE_STATUS: ReleaseDueStatus = { tone: 'none', label: '' };

// Local calendar day as an ISO `YYYY-MM-DD` string -- the same shape a
// `<input type="date">` reads and writes, so the due date and "today" are
// compared in the user's own timezone rather than UTC.
export function toIsoDate(now: Date): string {
	const year = String(now.getFullYear()).padStart(4, '0');
	const month = String(now.getMonth() + 1).padStart(2, '0');
	const day = String(now.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

// Turns a due date into a human status relative to `today`. The elapsed span is
// rendered by the monorepo's shipped `src/duration` library rather than a second
// copy of the same unit decomposition -- whole days in, a compact "3d" out.
// Fail-closed on every input the checklist can hold but the calendar cannot
// resolve: an empty, malformed, or impossible date yields no status at all.
export function getReleaseDueStatus(dueDate: string, today: string): ReleaseDueStatus {
	if (dueDate === '' || today === '') return NO_DUE_STATUS;
	if (!isValidDueDate(dueDate) || !isValidDueDate(today)) return NO_DUE_STATUS;

	const due = Date.parse(`${dueDate}T00:00:00Z`);
	const start = Date.parse(`${today}T00:00:00Z`);
	if (!Number.isFinite(due) || !Number.isFinite(start)) return NO_DUE_STATUS;

	const days = Math.round((due - start) / MS_PER_DAY);
	if (days === 0) return { tone: 'today', label: 'Due today' };

	const span = formatDuration(Math.abs(days) * MS_PER_DAY);
	if (span === null) return NO_DUE_STATUS;

	return days > 0
		? { tone: 'upcoming', label: `Due in ${span}` }
		: { tone: 'overdue', label: `Overdue by ${span}` };
}

export function getVisibleReleaseGroups(
	state: ReleaseChecklistState,
	view: ReleaseView
): VisibleReleaseGroup[] {
	return RELEASE_PHASES.map((phase) => ({
		phase,
		items: RELEASE_CHECKLIST_DEFINITIONS.filter((item) => {
			if (item.phase !== phase.id) return false;
			if (view === 'all') return true;
			return view === 'completed'
				? Boolean(state.items[item.id]?.completed)
				: !state.items[item.id]?.completed;
		}),
	})).filter((group) => group.items.length > 0);
}
