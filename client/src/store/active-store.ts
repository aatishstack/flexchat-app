"use client";

import { create } from "zustand";

interface ActiveUser {
  id: string;

  name: string;

  status: string;

  avatar: string;
}

interface ActiveState {
  users: ActiveUser[];
}

export const useActiveStore =
  create<ActiveState>(
    () => ({
      users: [
        {
          id: "1",
          name: "Mayuri",
          status:
            "Listening to music",
          avatar: "M",
        },

        {
          id: "2",
          name: "Aatish",
          status:
            "Building FlexChat",
          avatar: "A",
        },

        {
          id: "3",
          name: "Flex AI",
          status:
            "Helping users",
          avatar: "F",
        },
      ],
    })
  );