export const CHATS = [
  { id: 1, name: "Aisha Nwosu",    lastMsg: "Sent a photo",            time: "now",       unread: 3, online: true,  initials: "AN", color: "#C8376A" },
  { id: 2, name: "Dev Team",       lastMsg: "Marcus: build passed ✓",  time: "2m",        unread: 7, online: false, initials: "DT", color: "#2563EB", isGroup: true },
  { id: 3, name: "Lena Hofmann",   lastMsg: "See you at 6!",           time: "14m",       unread: 0, online: true,  initials: "LH", color: "#059669" },
  { id: 4, name: "Kwame Asante",   lastMsg: "You: That sounds great 👍", time: "1h",      unread: 0, online: false, initials: "KA", color: "#D97706" },
  { id: 5, name: "Sofia Reyes",    lastMsg: "Can you review my PR?",   time: "3h",        unread: 2, online: true,  initials: "SR", color: "#7C3AED" },
  { id: 6, name: "Night Owls 🦉",  lastMsg: "Priya: lmaooo okay",      time: "5h",        unread: 0, online: false, initials: "NO", color: "#0891B2", isGroup: true },
  { id: 7, name: "James Okafor",   lastMsg: "You: Thanks man!",        time: "yesterday", unread: 0, online: false, initials: "JO", color: "#DC2626" },
];

export type MessageStatus = "read" | "delivered";
export const MESSAGES: Array<{ id: number; text: string; sent: boolean; time: string; status?: MessageStatus }> = [
  { id: 1, text: "Hey! Did you see the latest FlexChat design? The purple branding is 🔥", sent: false, time: "10:21" },
  { id: 2, text: "Yes!! I was literally just looking at it. The logo is so clean.", sent: true, time: "10:22", status: "read" },
  { id: 3, text: "Right? The F mark is simple but has so much personality. Nothing like anyone else.", sent: false, time: "10:23" },
  { id: 4, text: "Exactly. The deep purple instead of the electric blue everyone copies.", sent: true, time: "10:23", status: "read" },
  { id: 5, text: "The dark theme is 🤌 too. No weird glassmorphism or card overload.", sent: false, time: "10:25" },
  { id: 6, text: "Okay I am downloading it right now actually", sent: true, time: "10:26", status: "read" },
  { id: 7, text: "Best messaging UI I have seen in a long time. No cap.", sent: true, time: "10:28", status: "delivered" },
  { id: 8, text: "Told you!! The conversation screen alone has me sold 😭", sent: false, time: "10:28" },
];

export type CallType = "incoming" | "outgoing" | "missed";
export const CALLS: Array<{ id: number; name: string; type: CallType; time: string; duration: string | null; initials: string; color: string }> = [
  { id: 1, name: "Aisha Nwosu",  type: "incoming", time: "Today, 10:23 AM",    duration: "12m 04s", initials: "AN", color: "#C8376A" },
  { id: 2, name: "Kwame Asante", type: "outgoing", time: "Today, 9:15 AM",     duration: "4m 33s",  initials: "KA", color: "#D97706" },
  { id: 3, name: "Lena Hofmann", type: "missed",   time: "Yesterday, 7:44 PM", duration: null,      initials: "LH", color: "#059669" },
  { id: 4, name: "Dev Team",     type: "incoming", time: "Yesterday, 3:20 PM", duration: "38m 11s", initials: "DT", color: "#2563EB" },
  { id: 5, name: "Sofia Reyes",  type: "missed",   time: "Mon, 6:00 PM",       duration: null,      initials: "SR", color: "#7C3AED" },
  { id: 6, name: "James Okafor", type: "outgoing", time: "Sun, 2:30 PM",       duration: "22m 48s", initials: "JO", color: "#DC2626" },
];

export const NOTIFS = [
  {
    group: "Today",
    items: [
      { id: 1, type: "message", name: "Aisha Nwosu",  text: "Sent you a photo",           time: "10:28 AM", initials: "AN", color: "#C8376A", unread: true  },
      { id: 2, type: "message", name: "Dev Team",     text: "Marcus: build passed ✓",      time: "9:47 AM",  initials: "DT", color: "#2563EB", unread: true  },
      { id: 3, type: "call",    name: "Lena Hofmann", text: "Missed call",                  time: "7:44 AM",  initials: "LH", color: "#059669", unread: false },
      { id: 4, type: "system",  name: "FlexChat",     text: "Security code with Kwame changed", time: "6:00 AM", initials: "FC", color: "#7C4FF0", unread: false },
    ],
  },
  {
    group: "Yesterday",
    items: [
      { id: 5, type: "message", name: "Sofia Reyes",  text: "Can you review my PR?",       time: "9:30 PM",  initials: "SR", color: "#7C3AED", unread: false },
      { id: 6, type: "call",    name: "Dev Team",     text: "Group video call — 38m",       time: "3:20 PM",  initials: "DT", color: "#2563EB", unread: false },
      { id: 7, type: "system",  name: "FlexChat",     text: "New sign-in from Chrome on macOS", time: "11:00 AM", initials: "FC", color: "#7C4FF0", unread: false },
    ],
  },
];

export const STORIES = [
  { id: 1, name: "Your Story", initials: "+", color: "#374151", viewed: true, isMe: true },
  { id: 2, name: "Aisha Nwosu", initials: "AN", color: "#C8376A", viewed: false, image: "https://images.unsplash.com/photo-1662850886700-4ec19bd30d11?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwb3J0cmFpdCUyMG9mJTIwc21pbGluZyUyMHlvdW5nJTIwd29tYW58ZW58MXx8fHwxNzgxNjA3NTk1fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral", storyImage: "https://images.unsplash.com/photo-1559065188-2537766d864b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdG9yeSUyMHZlcnRpY2FsJTIwdmlldyUyMGxhbmRzY2FwZSUyMG1vdW50YWluJTIwc3Vuc2V0fGVufDF8fHx8MTc4MTYwNzYwN3ww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral" },
  { id: 3, name: "Kwame Asante", initials: "KA", color: "#D97706", viewed: false, image: "https://images.unsplash.com/photo-1528892952291-009c663ce843?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwb3J0cmFpdCUyMG9mJTIwc21pbGluZyUyMHlvdW5nJTIwbWFufGVufDF8fHx8MTc4MTYwNzYwMXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral" },
  { id: 4, name: "Sofia Reyes", initials: "SR", color: "#7C3AED", viewed: true, image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80" },
  { id: 5, name: "Lena Hofmann", initials: "LH", color: "#059669", viewed: true, image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&q=80" },
];
