// Shape of a decoded JWT (access or refresh). Kept separate from Prisma's
// User type because the token only ever carries the minimum needed to
// identify who is calling and which company/role they belong to — never
// sensitive fields like password/PIN hashes.
export interface AccessTokenPayload {
  sub: string; // user id
  companyId: string;
  roleId: string;
  type: "access";
}

export interface RefreshTokenPayload {
  sub: string;
  companyId: string;
  type: "refresh";
}

export interface AuthenticatedUser {
  id: string;
  companyId: string;
  roleId: string;
}
