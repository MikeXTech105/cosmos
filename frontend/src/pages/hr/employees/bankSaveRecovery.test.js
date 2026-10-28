import { describe, expect, it, vi } from "vitest";
import { latestEmployeeBank, saveEmployeeBankSafely } from "./bankSaveRecovery";

const bank = { bankName: "Test Bank", accountNumber: "TEST-ONLY", ifscCode: "TEST0001234", branchName: "Test", upiId: "" };
describe("employee bank follow-up recovery", () => {
  it("recognizes the current first bank history record and skips a duplicate append", async () => {
    const read = vi.fn().mockResolvedValue({ data: [{ id: 8, ...bank }, { id: 7, ...bank, bankName: "Old" }] });
    const save = vi.fn();
    expect((await saveEmployeeBankSafely("9007199254740993", bank, { read, save })).id).toBe(8);
    expect(save).not.toHaveBeenCalled(); expect(latestEmployeeBank({ data: [] })).toBeNull();
  });
  it("reconciles a lost save response by authoritative readback", async () => {
    const read = vi.fn().mockResolvedValueOnce({ data: [] }).mockResolvedValueOnce({ data: [{ id: 9, ...bank }] });
    const save = vi.fn().mockRejectedValue(new Error("response lost"));
    expect((await saveEmployeeBankSafely("42", bank, { read, save })).id).toBe(9);
    expect(save).toHaveBeenCalledTimes(1);
  });
  it("retains the failed operation for retry and never appends when readback is unavailable", async () => {
    const failure = new Error("bank save failed");
    const read = vi.fn().mockResolvedValue({ data: [] });
    const save = vi.fn().mockRejectedValue(failure);
    await expect(saveEmployeeBankSafely("42", bank, { read, save })).rejects.toBe(failure);
    const unavailableRead = vi.fn().mockRejectedValue(new Error("read unavailable"));
    await expect(saveEmployeeBankSafely("42", bank, { read: unavailableRead, save })).rejects.toThrow("read unavailable");
    expect(save).toHaveBeenCalledTimes(1);
  });
});
