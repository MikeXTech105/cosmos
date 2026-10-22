import { describe, expect, it } from "vitest";
import { EMPTY_PRODUCT_FORM, PRODUCT_TEXT_LIMITS, hasIncompleteProductMedia, restoreSavedProductMedia, toProductForm, toProductPayload, validateProductForm } from "./productForm";

const valid = (patch = {}) => ({ ...EMPTY_PRODUCT_FORM, code: "P-1", name: "Product", ...patch });
describe("website product API contract", () => {
  it("guards fresh-load edits when the API omits the gallery", () => {
    expect(hasIncompleteProductMedia({ primaryImageUrl: "/uploads/p.png" })).toBe(true);
    expect(hasIncompleteProductMedia({ primaryImageUrl: null })).toBe(false);
    expect(hasIncompleteProductMedia({ primaryImageUrl: "/uploads/p.png", media: [{ publicUrl: "/uploads/p.png" }] })).toBe(false);
  });
  it("retains submitted media only for the same saved record version", () => {
    const record = { id: 1, rowVersion: "v1", primaryImageUrl: "/uploads/p.png" };
    const saved = { id: 1, rowVersion: "v1", media: [{ publicUrl: "/uploads/p.png", altText: "Front" }, { publicUrl: "/uploads/back.png" }] };
    expect(restoreSavedProductMedia(record, saved).media).toEqual(saved.media);
    expect(restoreSavedProductMedia({ ...record, rowVersion: "v2" }, saved)).not.toHaveProperty("media");
    expect(restoreSavedProductMedia({ ...record, id: 2 }, saved)).not.toHaveProperty("media");
    expect(restoreSavedProductMedia(record, null)).toEqual(record);
  });
  it("requires code and name but allows optional commercial details and images", () => {
    expect(validateProductForm(EMPTY_PRODUCT_FORM)).toMatchObject({ code: expect.any(String), name: expect.any(String) });
    expect(validateProductForm(valid())).toEqual({});
  });
  it("preserves nullable API numbers and zero values without uncontrolled text fields", () => {
    const form = toProductForm({ code: "P", name: "Test", rating: null, reviewCount: null, displayPrice: null, description: null, brandName: null });
    expect(form).toMatchObject({ rating: "", reviewCount: "", displayPrice: "", description: "", brandName: "" });
    expect(toProductPayload(form)).toMatchObject({ rating: null, reviewCount: null, displayPrice: null });
    expect(toProductPayload(valid({ rating: 0, reviewCount: 0, displayPrice: 0 }))).toMatchObject({ rating: 0, reviewCount: 0, displayPrice: 0 });
  });
  it.each([
    ["displayPrice", -1], ["displayPrice", "NaN"], ["displayPrice", Infinity], ["displayPrice", "1.234"],
    ["rating", "5.01"], ["rating", -1], ["reviewCount", "1.5"], ["reviewCount", -1], ["reviewCount", "2147483648"],
    ["sortOrder", ""], ["sortOrder", -1], ["sortOrder", "0.5"], ["sortOrder", 100001],
    ["currencyCode", "12!"], ["currencyCode", "IN"], ["amazonUrl", "javascript:alert(1)"], ["amazonUrl", "amazon.com/p"], ["publishStatus", 9],
  ])("rejects invalid %s=%s before an API call", (key, value) => {
    expect(validateProductForm(valid({ [key]: value }))).toHaveProperty(key);
  });
  it("accepts API boundary values", () => {
    expect(validateProductForm(valid({ displayPrice: "0.01", rating: 5, reviewCount: 2147483647, sortOrder: 100000, amazonUrl: "https://www.amazon.in/example", publishStatus: 2 }))).toEqual({});
  });
  it.each(Object.entries(PRODUCT_TEXT_LIMITS))("checks %s field length", (key, length) => {
    expect(validateProductForm(valid({ [key]: "x".repeat(length + 1) }))).toHaveProperty(key);
  });
  it("does not silently remove incomplete benefits or images", () => {
    expect(validateProductForm(valid({ benefits: [{ benefitText: " " }], media: [{ publicUrl: "", isPrimary: true }] })))
      .toMatchObject({ "benefits.0.benefitText": expect.any(String), "media.0.publicUrl": expect.any(String) });
  });
  it("uses original media indices for errors and requires one primary image", () => {
    const errors = validateProductForm(valid({ media: [{ publicUrl: "" }, { publicUrl: "/uploads/image.png", altText: "x".repeat(501), isPrimary: false }] }));
    expect(errors).toHaveProperty("media.1.altText");
    expect(errors).toHaveProperty("media");
    expect(errors).not.toHaveProperty("media.0.altText");
  });
  it("rejects ephemeral or unsafe persisted image URLs", () => {
    expect(validateProductForm(valid({ media: [{ publicUrl: "blob:local-only", isPrimary: true }] }))).toHaveProperty("media.0.publicUrl");
    expect(validateProductForm(valid({ media: [{ publicUrl: "/uploads/website/p.png", isPrimary: true }] }))).toEqual({});
  });
  it("maps a primary-only response without crashing on absent alt text", () => {
    const form = toProductForm({ primaryImageUrl: "/uploads/website/p.png", publishStatus: "Published" });
    expect(form.media).toEqual([{ publicUrl: "/uploads/website/p.png", isPrimary: true, altText: "", sortOrder: 0 }]);
    expect(form.publishStatus).toBe(1);
    expect(() => toProductPayload(form)).not.toThrow();
  });
  it("sends only writable fields and trims inputs without persisting a preview blob", () => {
    const payload = toProductPayload(valid({ id: 8, primaryImageUrl: "ignored", code: " P-1 ", displayPrice: "10.50", benefits: [{ benefitText: " Nice ", sortOrder: 99 }], media: [{ publicUrl: "/uploads/p.png", altText: null, isPrimary: true, id: 123 }] }));
    expect(payload).not.toHaveProperty("id");
    expect(payload).not.toHaveProperty("primaryImageUrl");
    expect(payload).toMatchObject({ code: "P-1", displayPrice: 10.5, benefits: [{ benefitText: "Nice", sortOrder: 0 }], media: [{ publicUrl: "/uploads/p.png", altText: "", sortOrder: 0, isPrimary: true }] });
    expect(payload.media[0]).not.toHaveProperty("id");
  });
});
