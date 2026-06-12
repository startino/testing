import { CalcError, type Expr } from './types.js';

export function evaluate(ast: Expr): number {
	switch (ast.type) {
		case 'num':
			return ast.value;
		case 'unary':
			return ast.op === '-' ? -evaluate(ast.operand) : +evaluate(ast.operand);
		case 'binary': {
			const left = evaluate(ast.left);
			const right = evaluate(ast.right);

			switch (ast.op) {
				case '+':
					return left + right;
				case '-':
					return left - right;
				case '*':
					return left * right;
				case '/':
					if (right === 0) {
						throw new CalcError('Division by zero');
					}
					return left / right;
				case '^':
					return Math.pow(left, right);
			}
		}
	}
}
