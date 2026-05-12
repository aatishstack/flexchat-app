"use client";

import { create }
  from "zustand";

interface Message {

  id: number;

  text?: string;

  image?: string;

  audio?: string;

  sender: string;

  time: string;

  status?: "sending" | "sent";

  conversationId: string;
}

interface ChatStore {

  messages:
    Record<
      string,
      Message[]
    >;

  addMessage:
    (
      message: Message
    ) => void;

  getMessages:
    (
      conversationId:
        string
    ) => Message[];
}

export const useChatStore =
  create<ChatStore>(
    (
      set,
      get
    ) => ({

      messages: {},

      addMessage:
        (
          message
        ) =>

          set(
            (
              state
            ) => ({

              messages: {

                ...state.messages,

                [
                  message.conversationId
                ]: [

                  ...(
                    state.messages[
                      message.conversationId
                    ] || []
                  ),

                  message,
                ],
              },
            })
          ),

      getMessages:
        (
          conversationId
        ) => {

          return (
            get()
              .messages[
              conversationId
            ] || []
          );
        },
    })
  );