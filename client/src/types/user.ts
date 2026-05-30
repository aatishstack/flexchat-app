export interface PublicUser {
  id: string;
  username: string;
  avatar?: string | null;
  phoneNumber?: string | null;
  lastSeenAt?: string | number | null;
}
