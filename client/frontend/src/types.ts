export interface UserProfile {
  sub: string;
  email?: string;
  name?: string;
  preferred_username?: string;
  [key: string]: any;
}

export interface ApiResponse<T> {
  success: boolean;
  user?: T;
  message?: string;
}