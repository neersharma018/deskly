import { describe, expect, it } from "vitest";
import { ApiError, money, statusLabel, unpack } from "./api";

describe("commerce presentation", () => {
  it("displays integer paise in Indian currency", () => {
    expect(money(12345678)).toBe("₹1,23,456.78");
    expect(money(800000)).toBe("₹8,000");
    expect(statusLabel("PENDING_PAYMENT")).toBe("Pending payment");
  });
  it("reports API validation without returning the submitted data", async () => {
    const response = Response.json({ errors: [{ field: "postal_code", message: "Use a valid PIN code." }] }, { status: 422 });
    await expect(unpack(response)).rejects.toEqual(new ApiError(422, "postal code — Use a valid PIN code."));
  });
});
