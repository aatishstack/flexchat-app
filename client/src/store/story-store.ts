"use client";

import { create } from "zustand";

export interface Story {
  id: string;

  name: string;

  avatar: string;

  active: boolean;
}

interface StoryState {
  stories: Story[];
}

export const useStoryStore =
  create<StoryState>(
    () => ({
      stories: [
        {
          id: "1",
          name: "Mayuri",
          avatar: "M",
          active: true,
        },

        {
          id: "2",
          name: "Aatish",
          avatar: "A",
          active: true,
        },

        {
          id: "3",
          name: "Flex AI",
          avatar: "F",
          active: false,
        },
      ],
    })
  );