/** Exact display of the API's integer quarter-rupiah values, including negatives. */
export function formatWeeklyAmount(value:{numerator:number;denominator:4}):string {
  const n=BigInt(value.numerator),absolute=n<0n?-n:n;
  const whole=(absolute/4n).toString().replace(/\B(?=(\d{3})+(?!\d))/g,'.');
  const fraction=absolute%4n;
  return `${n<0n?'-':''}Rp${whole}${fraction?','+(fraction*25n).toString().padStart(2,'0'):''}`;
}
