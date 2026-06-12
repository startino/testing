import { CalcError, type Expr } from './types.js';

// Pure recursive post-order evaluation. No formatting, no rounding -- returns
// the raw JS number. The only error it throws is division by zero.
export function evaluate(ast: Expr): number {
	switch (ast.type) {
		case 'num':
			return ast.value;
		case 'unary': {
			const operand = evaluate(ast.operand);
			return ast.op === '-' ? -operand : +operand;
		}
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
					// Guard BOTH 1/0 (Infinity) and 0/0 (NaN) before they arise.
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
