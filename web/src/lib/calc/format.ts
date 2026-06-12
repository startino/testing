// The float-display contract. Caller (calculate) has ALREADY ensured `n` is
// finite, so this may assume Number.isFinite(n).
//
// Algorithm:
//  1. -0 / 0 -> '0' (never '-0').
//  2. Round to 12 significant digits to kill binary-float noise.
//  3. Exponential form for very large/small magnitudes, else shortest fixed.

// Trim trailing zeros (and a dangling `.`) from an exponential mantissa.
function normalizeExponential(s: string): string {
	const [mantissaRaw, exp] = s.split('e');
	let mantissa = mantissaRaw;
	if (mantissa.includes('.')) {
		mantissa = mantissa.replace(/0+$/, '').replace(/\.$/, '');
	}
	return `${mantissa}e${exp}`;
}

export function formatNumber(n: number): string {
	// Step 2: collapse -0 and 0 to '0'.
	if (n === 0) {
		return '0';
	}

	// Step 3: round to 12 significant digits, then re-parse to the shortest form.
	const rounded = Number(n.toPrecision(12));

	// Re-check zero after rounding (e.g. an underflow-to-zero edge).
	if (rounded === 0) {
		return '0';
	}

	const abs = Math.abs(rounded);

	// Step 4: exponential branch for very large / very small magnitudes. The
	// 1e21 bound matches JS's own String() switch; 1e-6 keeps small numbers tidy.
	if (abs >= 1e21 || abs < 1e-6) {
		return normalizeExponential(rounded.toExponential());
	}

	// Fixed branch: String(Number(toPrecision(12))) is already the clean shortest
	// form with no trailing zeros.
	return String(rounded);
}
