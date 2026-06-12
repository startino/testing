import { CalcError, type CalcResult } from './types.js';
import { tokenize } from './tokenize.js';
import { parse } from './parse.js';
import { evaluate } from './evaluate.js';
import { formatNumber } from './format.js';

// The SINGLE entry point the UI calls. Orchestration + the one try/catch
// boundary + the empty-input and non-finite-result gates.
export function calculate(input: string): CalcResult {
	if (input.trim() === '') {
		return { ok: false, error: 'Enter an expression' };
	}
	try {
		const tokens = tokenize(input);
		const ast = parse(tokens);
		const value = evaluate(ast);
		if (!Number.isFinite(value)) {
			// Overflow to +/-Infinity (e.g. 1e308 * 10) or NaN.
			return { ok: false, error: 'Result is not a finite number' };
		}
		return { ok: true, value, formatted: formatNumber(value) };
	} catch (e) {
		if (e instanceof CalcError) {
			return { ok: false, error: e.message };
		}
		// Defensive: never leak a raw thrown error to the UI.
		return { ok: false, error: 'Invalid expression' };
	}
}
