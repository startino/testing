export type Token =
	| { type: 'number'; value: number }
	| { type: 'op'; value: '+' | '-' | '*' | '/' | '^' }
	| { type: 'lparen' }
	| { type: 'rparen' };

export type Expr =
	| { type: 'num'; value: number }
	| { type: 'unary'; op: '+' | '-'; operand: Expr }
	| { type: 'binary'; op: '+' | '-' | '*' | '/' | '^'; left: Expr; right: Expr };

export type CalcResult =
	| { ok: true; value: number; formatted: string }
	| { ok: false; error: string };

export class CalcError extends Error {
	constructor(m: string) {
		super(m);
		this.name = 'CalcError';
	}
}
