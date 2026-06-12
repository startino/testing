import { CalcError, type Expr, type Token } from './types.js';

// Hand-rolled precedence-climbing (Pratt-style) recursive descent.
//
// Grammar (low -> high binding):
//   expression     := additive
//   additive       := multiplicative ( ('+' | '-') multiplicative )*   left-assoc
//   multiplicative := unary ( ('*' | '/') unary )*                     left-assoc
//   unary          := ('+' | '-') unary | power                        prefix
//   power          := primary ( '^' unary )?                           RIGHT-assoc
//   primary        := number | '(' expression ')'
//
// Key baked-in decisions:
//  - `^` is right-associative: 2^3^2 -> 2^(3^2).
//  - unary minus binds looser than `^`: -2^2 -> -(2^2).
//  - the RIGHT operand of `^` goes through `unary`, so 2^-2 is valid.
//  - NO implicit multiplication: `2 3` and `2(3)` are errors.

export function parse(tokens: Token[]): Expr {
	let pos = 0;

	function peek(): Token | undefined {
		return tokens[pos];
	}

	function next(): Token | undefined {
		return tokens[pos++];
	}

	function parseExpression(): Expr {
		return parseAdditive();
	}

	function parseAdditive(): Expr {
		let left = parseMultiplicative();
		while (true) {
			const t = peek();
			if (t && t.type === 'op' && (t.value === '+' || t.value === '-')) {
				next();
				const right = parseMultiplicative();
				left = { type: 'binary', op: t.value, left, right };
			} else {
				break;
			}
		}
		return left;
	}

	function parseMultiplicative(): Expr {
		let left = parseUnary();
		while (true) {
			const t = peek();
			if (t && t.type === 'op' && (t.value === '*' || t.value === '/')) {
				next();
				const right = parseUnary();
				left = { type: 'binary', op: t.value, left, right };
			} else {
				break;
			}
		}
		return left;
	}

	function parseUnary(): Expr {
		const t = peek();
		if (t && t.type === 'op' && (t.value === '+' || t.value === '-')) {
			next();
			const operand = parseUnary();
			return { type: 'unary', op: t.value, operand };
		}
		return parsePower();
	}

	function parsePower(): Expr {
		const base = parsePrimary();
		const t = peek();
		if (t && t.type === 'op' && t.value === '^') {
			next();
			// Right operand recurses through `unary` -> right-assoc + unary exponent.
			const exponent = parseUnary();
			return { type: 'binary', op: '^', left: base, right: exponent };
		}
		return base;
	}

	function parsePrimary(): Expr {
		const t = peek();

		// End of input where an operand is required -> incomplete (e.g. `2+`).
		if (t === undefined) {
			throw new CalcError('Incomplete expression');
		}

		if (t.type === 'number') {
			next();
			return { type: 'num', value: t.value };
		}

		if (t.type === 'lparen') {
			next();
			const inner = parseExpression();
			const close = peek();
			if (close === undefined) {
				// Ran out of tokens looking for the matching `)`.
				throw new CalcError('Mismatched parentheses');
			}
			if (close.type !== 'rparen') {
				// Found something other than `)` where the close was expected.
				throw new CalcError('Mismatched parentheses');
			}
			next();
			return inner;
		}

		// An operator or `)` at a primary position. `()` reaches here with `)`
		// where an operand is required -> incomplete expression.
		if (t.type === 'rparen') {
			throw new CalcError('Incomplete expression');
		}

		// A leftover operator where a primary was required (e.g. the RHS of
		// `2**3`: after the first `*`, parseUnary -> parsePower -> parsePrimary
		// sees the second `*`).
		throw new CalcError('Unexpected token');
	}

	// Defensive: an empty token list must never reach parse via calculate(),
	// but if it does, report it distinctly.
	if (tokens.length === 0) {
		throw new CalcError('Empty expression');
	}

	const ast = parseExpression();

	// Trailing tokens after a complete expression (e.g. `2 3`, `2)+3`, `2(3)`).
	if (pos < tokens.length) {
		throw new CalcError('Unexpected token');
	}

	return ast;
}
