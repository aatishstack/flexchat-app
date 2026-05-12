"use client";

import { create }
  from "zustand";

interface Conversation {

  id: string;

  name: string;

  lastMessage: string;

  unread: number;

  online: boolean;
}

interface ConversationStore {

  conversations:
    Conversation[];

  setConversations:
    (
      conversations:
        Conversation[]
    ) => void;

  updateConversation:
    (
      id: string,
      message: string
    ) => void;

  incrementUnread:
    (
      id: string
    ) => void;

  clearUnread:
    (
      id: string
    ) => void;
}

export const
  useConversationStore =
    create<ConversationStore>(
      (set) => ({

       conversations: [],

        setConversations:
          (
            conversations
          ) =>
            set({
              conversations,
            }),

        updateConversation:
          (
            id,
            message
          ) =>

            set(
              (
                state
              ) => {

                const updated =
                  state.conversations.map(
                    (
                      conversation
                    ) =>

                      conversation.id ===
                      id

                        ? {
                            ...conversation,

                            lastMessage:
                              message,
                          }

                        : conversation
                  );

                const sorted =
                  [
                    ...updated,
                  ].sort(
                    (
                      a,
                      b
                    ) =>

                      a.id === id
                        ? -1
                        : b.id === id
                        ? 1
                        : 0
                  );

                return {
                  conversations:
                    sorted,
                };
              }
            ),

        incrementUnread:
          (
            id
          ) =>

            set(
              (
                state
              ) => ({

                conversations:
                  state.conversations.map(
                    (
                      conversation
                    ) =>

                      conversation.id ===
                      id

                        ? {
                            ...conversation,

                            unread:
                              conversation.unread +
                              1,
                          }

                        : conversation
                  ),
              })
            ),

        clearUnread:
          (
            id
          ) =>

            set(
              (
                state
              ) => ({

                conversations:
                  state.conversations.map(
                    (
                      conversation
                    ) =>

                      conversation.id ===
                      id

                        ? {
                            ...conversation,

                            unread: 0,
                          }

                        : conversation
                  ),
              })
            ),
      })
    );