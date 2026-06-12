import { CalcError, type Token } from './types.js';

// The EXACT accepted number form, anchored at the cursor via the sticky flag.
// Accepts: 0, 42, 3.14, .5, 3., 1.5e3, 2E-2, 6.022e23, 1e10, .5e2.
// Rejects (via stopping early, leaving a stray char): bare `.`, `1e`.
const NUMBER_RE = /(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/y;

function isDigit(ch: string): boolean {
	return ch >= '0' && ch <= '9';
}

// Scans left to right. Skips ASCII whitespace ANYWHERE between tokens.
// Throws CalcError on an unrecognized character.
export function tokenize(input: string): Token[] {
	const tokens: Token[] = [];
	let i = 0;
	const len = input.length;

	while (i < len) {
		const ch = input[i];

		// Whitespace: skip.
		if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
			i++;
			continue;
		}

		// A digit, OR a `.` that is followed by a digit, begins a number.
		if (isDigit(ch) || (ch === '.' && isDigit(input[i + 1] ?? ''))) {
			NUMBER_RE.lastIndex = i;
			const match = NUMBER_RE.exec(input);
			// match cannot be null here: the lookahead guaranteed a valid start.
			if (match === null) {
				throw new CalcError(`Unexpected character "${ch}"`);
			}
			const text = match[0];
			tokens.push({ type: 'number', value: Number(text) });
			i += text.length;
			continue;
		}

		// Operators.
		if (ch === '+' || ch === '-' || ch === '*' || ch === '/' || ch === '^') {
			tokens.push({ type: 'op', value: ch });
			i++;
			continue;
		}

		// Parentheses.
		if (ch === '(') {
			tokens.push({ type: 'lparen' });
			i++;
			continue;
		}
		if (ch === ')') {
			tokens.push({ type: 'rparen' });
			i++;
			continue;
		}

		// Anything else (letters like a stray `e`, `%`, `$`, `,`, a bare `.`, ...).
		throw new CalcError(`Unexpected character "${ch}"`);
	}

	return tokens;
}
