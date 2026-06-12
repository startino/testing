import { CalcError, type Expr, type Token } from './types.js';

class Parser {
	private pos = 0;

	constructor(private readonly tokens: Token[]) {}

	parse(): Expr {
		if (this.tokens.length === 0) {
			throw new CalcError('Empty expression');
		}

		const expr = this.parseAdditive();

		if (this.pos < this.tokens.length) {
			throw new CalcError('Unexpected token');
		}

		return expr;
	}

	private peek(): Token | undefined {
		return this.tokens[this.pos];
	}

	private consume(): Token {
		const token = this.tokens[this.pos];
		if (!token) {
			throw new CalcError('Unexpected token');
		}
		this.pos++;
		return token;
	}

	private parseAdditive(): Expr {
		let left = this.parseMultiplicative();

		while (true) {
			const token = this.peek();
			if (token?.type === 'op' && (token.value === '+' || token.value === '-')) {
				this.consume();
				const right = this.parseMultiplicative();
				left = { type: 'binary', op: token.value, left, right };
			} else {
				break;
			}
		}

		return left;
	}

	private parseMultiplicative(): Expr {
		let left = this.parseUnary();

		while (true) {
			const token = this.peek();
			if (token?.type === 'op' && (token.value === '*' || token.value === '/')) {
				this.consume();
				const right = this.parseUnary();
				left = { type: 'binary', op: token.value, left, right };
			} else {
				break;
			}
		}

		return left;
	}

	private parseUnary(): Expr {
		const token = this.peek();
		if (token?.type === 'op' && (token.value === '+' || token.value === '-')) {
			this.consume();
			const operand = this.parseUnary();
			return { type: 'unary', op: token.value, operand };
		}

		return this.parsePower();
	}

	private parsePower(): Expr {
		let left = this.parsePrimary();
		const token = this.peek();

		if (token?.type === 'op' && token.value === '^') {
			this.consume();
			const right = this.parseUnary();
			left = { type: 'binary', op: '^', left, right };
		}

		return left;
	}

	private parsePrimary(): Expr {
		const token = this.peek();

		if (token?.type === 'number') {
			this.consume();
			return { type: 'num', value: token.value };
		}

		if (token?.type === 'lparen') {
			this.consume();

			if (this.peek()?.type === 'rparen') {
				throw new CalcError('Incomplete expression');
			}

			const expr = this.parseAdditive();
			const close = this.peek();

			if (close?.type !== 'rparen') {
				throw new CalcError('Mismatched parentheses');
			}

			this.consume();
			return expr;
		}

		if (
			token?.type === 'rparen' ||
			(token?.type === 'op' &&
				(token.value === '*' || token.value === '/' || token.value === '^'))
		) {
			throw new CalcError('Unexpected token');
		}

		throw new CalcError('Incomplete expression');
	}
}

export function parse(tokens: Token[]): Expr {
	return new Parser(tokens).parse();
}
