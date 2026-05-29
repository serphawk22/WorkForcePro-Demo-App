"use client";

import { useState, useEffect, useCallback } from "react";

export interface Message {
  id: string;
  sender_role: "user" | "assistant";
  content: string;
  intent?: string;
  navigation_url?: string;
  created_at: Date;
}

export interface Conversation {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
}

export function useWorkBot(pathname: string, userRole: string, isOpen: boolean) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [quickActions, setQuickActions] = useState<
    Array<{ label: string; action: string }>
  >([]);

  // Get Auth Headers with JWT Token
  const getAuthHeaders = useCallback((): Record<string, string> => {
    if (typeof window === "undefined") return {};

    const token =
      localStorage.getItem("token") || localStorage.getItem("access_token");
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token || ""}`,
    };
  }, []);

  // Fetch past conversations list
  const fetchConversations = useCallback(async () => {
    try {
      const response = await fetch("/api/chatbot/conversations", {
        headers: getAuthHeaders(),
        credentials: "include",
      });

      if (response.status === 401) {
        console.warn("[WorkBot] 401 on conversations – skipping");
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setConversations(data);
        if (data.length > 0 && !activeConvId) {
          setActiveConvId(data[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load conversations", err);
    }
  }, [activeConvId, getAuthHeaders]);

  // Load chat messages inside a conversation session
  const loadMessages = useCallback(async (convId: number) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/chatbot/conversations/${convId}/messages`,
        {
          headers: getAuthHeaders(),
          credentials: "include",
        }
      );

      if (response.status === 401) {
        console.warn("[WorkBot] 401 on messages – skipping");
        return;
      }

      if (response.ok) {
        const data = await response.json();
        const formatted: Message[] = data.map((m: any) => ({
          id: String(m.id),
          sender_role: m.sender_role,
          content: m.content,
          intent: m.intent,
          navigation_url: m.navigation_url,
          created_at: new Date(m.created_at),
        }));
        setMessages(formatted);
      }
    } catch (err) {
      setError("Failed to load chat history.");
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  // Fetch page-specific suggestions dynamically
  const fetchPageContext = useCallback(async () => {
    try {
      const response = await fetch("/api/chatbot/context", {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({
          pathname,
          userRole,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions || []);
        setQuickActions(data.quickActions || []);
      }
    } catch (err) {
      console.error("Failed to fetch page context", err);
    }
  }, [pathname, userRole, getAuthHeaders]);

  // Send a message to the bot
  const sendMessage = useCallback(
    async (content: string, conversationId: number | null) => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `/api/chatbot/conversations/${
            conversationId || "new"
          }/messages`,
          {
            method: "POST",
            headers: getAuthHeaders(),
            credentials: "include",
            body: JSON.stringify({
              content,
              userRole,
              pathname,
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          const newMessage: Message = {
            id: String(data.id),
            sender_role: data.sender_role,
            content: data.content,
            intent: data.intent,
            navigation_url: data.navigation_url,
            created_at: new Date(data.created_at),
          };

          setMessages((prev) => [...prev, newMessage]);

          // If response contains a new conversation ID, update it
          if (data.conversation_id && !conversationId) {
            setActiveConvId(data.conversation_id);
            await fetchConversations();
          }

          return newMessage;
        } else {
          setError("Failed to send message");
        }
      } catch (err) {
        setError("Failed to send message");
        console.error("Failed to send message", err);
      } finally {
        setLoading(false);
      }
    },
    [getAuthHeaders, userRole, pathname, fetchConversations]
  );

  // Initialize on mount: fetch conversations and page context if open
  useEffect(() => {
    if (isOpen && typeof window !== "undefined") {
      fetchConversations();
      fetchPageContext();
    }
  }, [isOpen, fetchConversations, fetchPageContext]);

  // Load messages when active conversation changes
  useEffect(() => {
    if (activeConvId && isOpen) {
      loadMessages(activeConvId);
    }
  }, [activeConvId, isOpen, loadMessages]);

  return {
    conversations,
    activeConvId,
    setActiveConvId,
    messages,
    loading,
    error,
    suggestions,
    quickActions,
    sendMessage,
    fetchConversations,
    fetchPageContext,
  };
}
