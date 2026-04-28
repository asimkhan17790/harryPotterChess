import { create } from 'zustand';

// Auth/SSO removed. Stub so orphaned imports in AuthButton/ProfileModal still compile.
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface UserState {}

export const useUserStore = create<UserState>(() => ({}));
