type Role = "OWNER" | "ADMIN" | "MEMBER";
type Status = "PENDING" | "INVITED" | "ACTIVE" | "REJECTED" | "LEFT";

export function canAdministerClub(status: Status | undefined, role: Role | undefined) {
  return status === "ACTIVE" && (role === "OWNER" || role === "ADMIN");
}

export function canRemoveClubMember(actorRole: Role, targetRole: Role) {
  if (targetRole === "OWNER") return false;
  if (actorRole === "OWNER") return true;
  return actorRole === "ADMIN" && targetRole === "MEMBER";
}

export function mustTransferBeforeLeaving(role: Role) {
  return role === "OWNER";
}
