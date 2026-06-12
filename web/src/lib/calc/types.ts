// Discriminated token union. `value` on a number token is the PARSED number.
export type Token =
	| { type: 'number'; value: number }
	| { type: 'op'; value: '+' | '-' | '*' | '/' | '^' }
	| { type: 'lparen' }
	| { type: 'rparen' };

// AST node union.
export type Expr =
	| { type: 'num'; value: number }
	| { type: 'unary'; op: '+' | '-'; operand: Expr }
	| { type: 'binary'; op: '+' | '-' | '*' | '/' | '^'; left: Expr; right: Expr };

// Top-level result the UI consumes.
export type CalcResult =
	| { ok: true; value: number; formatted: string }
	| { ok: false; error: string };

// Thrown internally by tokenize/parse/evaluate; caught ONLY by calculate(),
// which converts it to { ok: false, error: e.message }. Never leaks to the UI.
export class CalcError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'CalcError';
	}
}
