import { baseApi } from "./base-api";

export type RegisterRequest = {
  fullName: string;
  email: string;
  password: string;
};

export type PublicUser = {
  id: string;
  fullName: string;
  email: string;
  createdAt: string;
};

export type RegisterResponse = {
  status: "ok";
  data: {
    user: PublicUser;
  };
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type LoginResponse = RegisterResponse;

export type ApiErrorResponse = {
  status: "error";
  code: string;
  message: string;
  details?: {
    formErrors?: string[];
    fieldErrors?: Record<string, string[]>;
  };
};

export const authApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    register: build.mutation<RegisterResponse, RegisterRequest>({
      query: (body) => ({
        body,
        method: "POST",
        url: "auth/register",
      }),
    }),
    login: build.mutation<LoginResponse, LoginRequest>({
      invalidatesTags: ["User"],
      query: (body) => ({
        body,
        method: "POST",
        url: "auth/login",
      }),
    }),
    getCurrentUser: build.query<LoginResponse, void>({
      providesTags: ["User"],
      query: () => "auth/me",
    }),
    logout: build.mutation<void, void>({
      query: () => ({
        method: "POST",
        url: "auth/logout",
      }),
    }),
  }),
});

export const {
  useGetCurrentUserQuery,
  useLoginMutation,
  useLogoutMutation,
  useRegisterMutation,
} = authApi;
