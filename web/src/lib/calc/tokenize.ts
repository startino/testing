import { CalcError, type Token } from './types.js';

const NUMBER_REGEX = /^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/;

export function tokenize(input: string): Token[] {
	const tokens: Token[] = [];
	let pos = 0;

	while (pos < input.length) {
		const ch = input[pos];

		if (/\s/.test(ch)) {
			pos++;
			continue;
		}

		const remaining = input.slice(pos);
		const numMatch = remaining.match(NUMBER_REGEX);
		if (numMatch) {
			tokens.push({ type: 'number', value: Number(numMatch[0]) });
			pos += numMatch[0].length;
			continue;
		}

		if (ch === '+' || ch === '-' || ch === '*' || ch === '/' || ch === '^') {
			tokens.push({ type: 'op', value: ch });
			pos++;
			continue;
		}

		if (ch === '(') {
			tokens.push({ type: 'lparen' });
			pos++;
			continue;
		}

		if (ch === ')') {
			tokens.push({ type: 'rparen' });
			pos++;
			continue;
		}

		throw new CalcError(`Unexpected character "${ch}"`);
	}

	return tokens;
}
