export function formatNumber(n: number): string {
	if (Object.is(n, -0) || n === 0) {
		return '0';
	}

	const rounded = Number(n.toPrecision(12));
	const abs = Math.abs(rounded);

	if (abs !== 0 && (abs >= 1e21 || abs < 1e-6)) {
		const parts = rounded.toExponential().split('e');
		let mantissa = parts[0];
		mantissa = mantissa.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
		return `${mantissa}e${parts[1]}`;
	}

	return String(rounded);
}
