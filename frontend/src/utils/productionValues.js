import { LosslessNumber } from "lossless-json";

// Decimal inputs stay text until the transport writes an exact JSON number token.
export function decimalText(value) {
  if (value == null || value === "") return "";
  if (typeof value === "number" && (!Number.isFinite(value) || Math.abs(value) > Number.MAX_SAFE_INTEGER)) throw new Error("Enter the exact quantity as text.");
  const source = String(value).trim();
  const match = /^([+-]?)(\d+)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/.exec(source);
  if (!match) throw new Error("Enter a decimal quantity without separators.");
  const exponent = Number(match[4] || 0);
  if (!Number.isSafeInteger(exponent) || Math.abs(exponent) > 100) throw new Error("Quantity is outside the supported range.");
  const digits = match[2] + (match[3] || "");
  const point = match[2].length + exponent;
  let result = point <= 0 ? `0.${"0".repeat(-point)}${digits}` : point >= digits.length ? digits + "0".repeat(point - digits.length) : `${digits.slice(0, point)}.${digits.slice(point)}`;
  let [whole, fraction = ""] = result.split(".");
  whole = whole.replace(/^0+(?=\d)/, "");
  fraction = fraction.replace(/0+$/, "");
  result = whole + (fraction ? `.${fraction}` : "");
  return match[1] === "-" && /[1-9]/.test(result) ? `-${result}` : result;
}

export function decimalWire(value, { scale = 6, positive = false, nonNegative = true, integerDigits = 16 } = {}) {
  const text = decimalText(value);
  if (!text) throw new Error("Quantity is required.");
  const [whole, fraction = ""] = text.replace(/^-/, "").split(".");
  if (whole.length > integerDigits || fraction.length > scale) throw new Error(`Use at most ${integerDigits} integer digits and ${scale} decimal places.`);
  if ((nonNegative && text.startsWith("-")) || (positive && compareDecimal(text, "0") <= 0)) throw new Error(positive ? "Quantity must be greater than zero." : "Quantity cannot be negative.");
  return new LosslessNumber(text);
}

export function idWire(value) {
  if (typeof value === "number" && !Number.isSafeInteger(value)) throw new Error("The record ID must be preserved as exact text.");
  const text = String(value ?? "").trim();
  if (!/^[1-9]\d*$/.test(text) || BigInt(text) > 9223372036854775807n) throw new Error("Select a valid record.");
  return new LosslessNumber(text);
}

function parts(value) {
  const text = decimalText(value);
  if (!text) throw new Error("Quantity is required.");
  const [whole, fraction = ""] = text.replace(/^-/, "").split(".");
  return { value: BigInt(whole + fraction) * (text.startsWith("-") ? -1n : 1n), scale: fraction.length };
}
function aligned(left, right) {
  const a = parts(left), b = parts(right), scale = Math.max(a.scale, b.scale);
  return { a: a.value * 10n ** BigInt(scale - a.scale), b: b.value * 10n ** BigInt(scale - b.scale), scale };
}
function fromInteger(value, scale) {
  const text = (value < 0 ? -value : value).toString().padStart(scale + 1, "0");
  return decimalText(`${value < 0 ? "-" : ""}${scale ? `${text.slice(0, -scale)}.${text.slice(-scale)}` : text}`);
}
export function compareDecimal(left, right) { const { a, b } = aligned(left, right); return a < b ? -1 : a > b ? 1 : 0; }
export function addDecimal(left, right) { const { a, b, scale } = aligned(left, right); return fromInteger(a + b, scale); }
export function subtractDecimal(left, right) { const { a, b, scale } = aligned(left, right); return fromInteger(a - b, scale); }
export function quantityText(value, { scale = 6, group = true } = {}) {
  if (value == null || value === "") return "—";
  try {
    const parsed = parts(value);
    let integer = parsed.value;
    if (parsed.scale > scale) { const divisor = 10n ** BigInt(parsed.scale - scale); const sign = integer < 0n ? -1n : 1n; integer = sign * ((sign * integer + divisor / 2n) / divisor); }
    else integer *= 10n ** BigInt(scale - parsed.scale);
    const text = fromInteger(integer, scale);
    const [whole, fraction] = text.split(".");
    return (group ? whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : whole) + (fraction ? `.${fraction}` : "");
  } catch { return "Invalid quantity"; }
}
export const newCommandKey = () => globalThis.crypto.randomUUID();

export function assertBusinessDate(value, runtime) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "") || Number.isNaN(Date.parse(`${value}T12:00:00Z`)) || new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) !== value) throw new Error("Choose a valid business date.");
  if (runtime?.closedThroughDate && value <= runtime.closedThroughDate) throw new Error(`The period is closed through ${runtime.closedThroughDate}.`);
  return value;
}

// Convert a wall clock value in the verified company zone, rejecting DST gaps/ambiguity.
export function dateTimeOffset(date, time, zone) {
  assertBusinessDate(date);
  if (!/^\d{2}:\d{2}(?::\d{2})?$/.test(time || "") || !zone) throw new Error("Enter a time and load the company timezone.");
  const wall = `${date}T${time.length === 5 ? `${time}:00` : time}`;
  const target = Date.parse(`${wall}Z`);
  if (Number.isNaN(target) || new Date(target).toISOString().slice(0, 19) !== wall) throw new Error("Enter a valid clock time.");
  const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
  const wallAt = stamp => { const p = Object.fromEntries(formatter.formatToParts(new Date(stamp)).map(part => [part.type, part.value])); return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}`; };
  const offsets = new Set([-86400000, 0, 86400000].map(delta => Math.round((Date.parse(`${wallAt(target + delta)}Z`) - target - delta) / 60000)));
  const matches = [...offsets].filter(offset => wallAt(target - offset * 60000) === wall);
  if (matches.length !== 1) throw new Error("This time is missing or ambiguous in the company timezone. Enter an explicit offset instead.");
  const offset = matches[0], absolute = Math.abs(offset);
  return `${wall}${offset < 0 ? "-" : "+"}${String(Math.floor(absolute / 60)).padStart(2, "0")}:${String(absolute % 60).padStart(2, "0")}`;
}
