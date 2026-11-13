import type { AuthResponse, User } from "@/types";
import { api } from "./api";

export const authService = {
  async register(fullName: string, email: string, password: string): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>("/auth/register", {
      full_name: fullName,
      email,
      password,
    });
    return data;
  },
  async login(email: string, password: string): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>("/auth/login", { email, password });
    return data;
  },
  async me(): Promise<User> {
    const { data } = await api.get<User>("/auth/me");
    return data;
  },
  async updateProfile(payload: {
    full_name?: string;
    email?: string;
    preferred_currency?: string;
  }): Promise<User> {
    const { data } = await api.put<User>("/auth/me", payload);
    return data;
  },
  async logout(): Promise<void> {
    await api.post("/auth/logout");
  },
  async deleteAccount(): Promise<void> {
    await api.delete("/auth/me");
  },
};
