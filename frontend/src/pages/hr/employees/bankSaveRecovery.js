const bankFields = ["bankName", "accountNumber", "ifscCode", "branchName", "upiId"];
export const latestEmployeeBank = (response) => {
  const data = response?.data ?? response;
  const bank = data?.bankDetails ?? data?.employeeBankDetails ?? data?.bankAccount ?? data;
  return Array.isArray(bank) ? bank[0] ?? null : bank;
};
const sameBank = (saved, payload) => saved && bankFields.every((key) => String(saved[key] ?? "").trim() === String(payload[key] ?? "").trim());

// The existing endpoint appends bank history and has no command-key contract.
// Read before retry, and reconcile an uncertain response instead of appending blindly.
export async function saveEmployeeBankSafely(employeeId, payload, { read, save }) {
  const current = latestEmployeeBank(await read(employeeId));
  if (sameBank(current, payload)) return current;
  try { return latestEmployeeBank(await save(employeeId, payload)); }
  catch (error) {
    try { const saved = latestEmployeeBank(await read(employeeId)); if (sameBank(saved, payload)) return saved; }
    catch { /* Preserve the original failure and pending bank payload in memory. */ }
    throw error;
  }
}
