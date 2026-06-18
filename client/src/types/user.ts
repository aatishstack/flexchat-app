export interface PublicUser {
  id: string;
  username: string;
  displayName?: string | null;
  avatar?: string | null;
  phoneNumber?: string | null;
  lastSeenAt?: string | number | null;
  online?: boolean;
}
