import type { ChatResponse } from "@/types";
import { api } from "./api";

export const chatService = {
  async send(message: string): Promise<ChatResponse> {
    const { data } = await api.post<ChatResponse>("/chat/message", { message });
    return data;
  },
  async suggestions(): Promise<string[]> {
    const { data } = await api.get<string[]>("/chat/suggestions");
    return data;
  },
};
