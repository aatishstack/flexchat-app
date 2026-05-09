export interface Chat {
  id: number;
  name: string;
  message: string;
  time: string;
  unread: number;
  online: boolean;
  active?: boolean;
  avatar: string;
}

export interface Message {
  id: number;
  mine: boolean;
  text: string;
  createdAt: string;
}