import api, { tokenStorage } from "./client";

export interface RegisterData {
  name: string;
  email: string;
  password: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: "customer" | "staff" | "admin";
  is_active: boolean;
  is_verified: boolean;
  auth_provider: string;
}

const authApi = {
  register: async (data: RegisterData): Promise<AuthResponse> => {
    const response = await api.post("/auth/register", data);
    const tokens = response.data.data as AuthResponse;
    tokenStorage.setTokens(tokens.access_token, tokens.refresh_token);
    return tokens;
  },

  login: async (data: LoginData): Promise<AuthResponse> => {
    const response = await api.post("/auth/login", data);
    const tokens = response.data.data as AuthResponse;
    tokenStorage.setTokens(tokens.access_token, tokens.refresh_token);
    return tokens;
  },

  logout: async (): Promise<void> => {
    const refresh_token = tokenStorage.getRefresh();
    try {
      await api.post("/auth/logout", refresh_token ? { refresh_token } : {});
    } finally {
      tokenStorage.clear();
    }
  },

  getMe: async (): Promise<UserProfile> => {
    const response = await api.get("/auth/me");
    return response.data.data;
  },

  socialLogin: async (auth0Token: string): Promise<AuthResponse> => {
    const response = await api.post("/auth/social/token", { auth0_token: auth0Token });
    const tokens = response.data.data as AuthResponse;
    tokenStorage.setTokens(tokens.access_token, tokens.refresh_token);
    return tokens;
  },
};

export default authApi;
