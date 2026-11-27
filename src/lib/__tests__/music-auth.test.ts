import { describe, expect, it } from "vitest";
import type { User } from "@supabase/supabase-js";
import {
  hasGoogleIdentity,
  validateCreatorPasswordStrength,
  validateCreatorUsername,
} from "../music-auth";

describe("Creator username & password validation", () => {
  it("accepts valid creator usernames", () => {
    expect(validateCreatorUsername("harsh_guru_01")).toBeNull();
    expect(validateCreatorUsername("abc")).toBeNull();
  });

  it("rejects invalid creator usernames", () => {
    expect(validateCreatorUsername("ab")).not.toBeNull();
    expect(validateCreatorUsername("bad-handle!")).not.toBeNull();
  });

  it("enforces strong creator passwords", () => {
    expect(validateCreatorPasswordStrength("short1A")).not.toBeNull();
    expect(validateCreatorPasswordStrength("alllowercase123")).not.toBeNull();
    expect(validateCreatorPasswordStrength("NoNumbersHere!")).not.toBeNull();
    expect(validateCreatorPasswordStrength("StrongPass123")).toBeNull();
  });

  it("detects Google identity from identities or app_metadata", () => {
    expect(hasGoogleIdentity(null)).toBe(false);
    expect(
      hasGoogleIdentity({
        id: "u1",
        app_metadata: { provider: "email", providers: ["email"] },
        user_metadata: {},
        aud: "authenticated",
        created_at: "",
        identities: [],
      } as unknown as User)
    ).toBe(false);
    expect(
      hasGoogleIdentity({
        id: "u2",
        app_metadata: { provider: "google", providers: ["google"] },
        user_metadata: {},
        aud: "authenticated",
        created_at: "",
        identities: [{ id: "g1", user_id: "u2", identity_id: "g1", provider: "google" }],
      } as unknown as User)
    ).toBe(true);
  });
});
