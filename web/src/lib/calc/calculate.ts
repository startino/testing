import { tokenize } from './tokenize.js';
import { parse } from './parse.js';
import { evaluate } from './evaluate.js';
import { formatNumber } from './format.js';
import { CalcError } from './types.js';
import type { CalcResult } from './types.js';

export function calculate(input: string): CalcResult {
	if (input.trim() === '') {
		return { ok: false, error: 'Enter an expression' };
	}

	try {
		const tokens = tokenize(input);
		const ast = parse(tokens);
		const value = evaluate(ast);

		if (!Number.isFinite(value)) {
			return { ok: false, error: 'Result is not a finite number' };
		}

		return { ok: true, value, formatted: formatNumber(value) };
	} catch (e) {
		if (e instanceof CalcError) {
			return { ok: false, error: e.message };
		}

		return { ok: false, error: 'Invalid expression' };
	}
}
