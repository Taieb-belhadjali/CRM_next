export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "commercial" | "client";
  isActive: boolean;
  timezone?: string;
  language?: string;
  account?: string;
}
