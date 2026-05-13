"use client";

import { create } from "zustand";

interface Bookmark {
  id: string;

  text: string;
}

interface BookmarkState {
  bookmarks:
    Bookmark[];

  addBookmark: (
    bookmark: Bookmark
  ) => void;

  removeBookmark: (
    id: string
  ) => void;
}

export const useBookmarkStore =
  create<BookmarkState>(
    (set) => ({
      bookmarks: [],

      addBookmark:
        (
          bookmark
        ) =>
          set(
            (
              state
            ) => ({
              bookmarks:
                [
                  bookmark,
                  ...state.bookmarks,
                ],
            })
          ),

      removeBookmark:
        (
          id
        ) =>
          set(
            (
              state
            ) => ({
              bookmarks:
                state.bookmarks.filter(
                  (
                    item
                  ) =>
                    item.id !==
                    id
                ),
            })
          ),
    })
  );