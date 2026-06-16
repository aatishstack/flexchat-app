import { createBrowserRouter } from "react-router";
import { RootLayout } from "./layouts/RootLayout";
import { SplashScreen } from "./screens/SplashScreen";
import { OnboardingScreen } from "./screens/OnboardingScreen";
import { ChatsScreen } from "./screens/ChatsScreen";
import { ConversationScreen } from "./screens/ConversationScreen";
import { CallsScreen } from "./screens/CallsScreen";
import { NotificationsScreen } from "./screens/NotificationsScreen";
import { ProfileScreen } from "./screens/ProfileScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { IncomingCallScreen } from "./screens/IncomingCallScreen";
import { VideoCallScreen } from "./screens/VideoCallScreen";
import { DiscoverScreen } from "./screens/DiscoverScreen";
import { FriendsScreen } from "./screens/FriendsScreen";
import { StoryTrayScreen } from "./screens/StoryTrayScreen";
import { StoryViewerScreen } from "./screens/StoryViewerScreen";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: RootLayout,
    children: [
      { index: true, Component: SplashScreen },
      { path: "onboarding", Component: OnboardingScreen },
      { path: "chats", Component: ChatsScreen },
      { path: "conversation", Component: ConversationScreen },
      { path: "calls", Component: CallsScreen },
      { path: "notifications", Component: NotificationsScreen },
      { path: "profile", Component: ProfileScreen },
      { path: "settings", Component: SettingsScreen },
      { path: "incoming-call", Component: IncomingCallScreen },
      { path: "video-call", Component: VideoCallScreen },
      { path: "discover", Component: DiscoverScreen },
      { path: "friends", Component: FriendsScreen },
      { path: "stories", Component: StoryTrayScreen },
      { path: "story/:id", Component: StoryViewerScreen },
    ],
  },
]);
