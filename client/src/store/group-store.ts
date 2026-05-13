"use client";

import { create } from "zustand";

interface Member {
  id: string;

  name: string;

  online: boolean;
}

interface GroupState {
  members:
    Member[];

  addMember: (
    member: Member
  ) => void;
}

export const useGroupStore =
  create<GroupState>(
    (set) => ({
      members: [
        {
          id: "1",
          name: "Mayuri",
          online: true,
        },

        {
          id: "2",
          name: "Aatish",
          online: true,
        },

        {
          id: "3",
          name: "Flex AI",
          online: false,
        },
      ],

      addMember: (
        member
      ) =>
        set(
          (
            state
          ) => ({
            members: [
              ...state.members,
              member,
            ],
          })
        ),
    })
  );