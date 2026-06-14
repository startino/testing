/**
 * Returns true if the string reads the same forwards and backwards.
 * An empty string and a single character are both palindromes.
 */
export function isPalindrome(s: string): boolean {
	return s === s.split('').reverse().join('');
}
