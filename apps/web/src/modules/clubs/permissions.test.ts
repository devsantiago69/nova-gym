import { describe, expect, it } from "vitest";
import { canAdministerClub, canRemoveClubMember, mustTransferBeforeLeaving } from "./permissions";

describe("club administration permissions", () => {
  it("only lets active owners and admins manage a club", () => {
    expect(canAdministerClub("ACTIVE", "OWNER")).toBe(true);
    expect(canAdministerClub("ACTIVE", "ADMIN")).toBe(true);
    expect(canAdministerClub("INVITED", "ADMIN")).toBe(false);
    expect(canAdministerClub("ACTIVE", "MEMBER")).toBe(false);
  });

  it("protects owners and admins from lower roles", () => {
    expect(canRemoveClubMember("OWNER", "ADMIN")).toBe(true);
    expect(canRemoveClubMember("ADMIN", "MEMBER")).toBe(true);
    expect(canRemoveClubMember("ADMIN", "ADMIN")).toBe(false);
    expect(canRemoveClubMember("OWNER", "OWNER")).toBe(false);
  });

  it("requires ownership transfer before leaving", () => {
    expect(mustTransferBeforeLeaving("OWNER")).toBe(true);
    expect(mustTransferBeforeLeaving("ADMIN")).toBe(false);
  });
});
