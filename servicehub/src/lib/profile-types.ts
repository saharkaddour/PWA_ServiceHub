export const profileRoles = [
  "CUSTOMER",
  "PROVIDER",
  "SUPPLIER",
  "MODERATOR",
] as const;

export type ProfileRole = (typeof profileRoles)[number];

export type Profile = {
  id: string;
  name: string;
  email: string;
  role: ProfileRole;
};
