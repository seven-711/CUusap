import { useState, useEffect, useRef } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card } from "./ui/card";
import { SkipForward, X, Send } from "lucide-react";
import { createClient } from "../utils/supabase/client";
import { projectId, publicAnonKey } from "../utils/supabase/info";

interface ChatInterfaceProps {
  onDisconnect: () => void;
  userId: string;
}

interface Message {
  id: string;
  sender_id: string;
  message_text: string;
  sent_at: string;
}

interface ChatSession {
  id: string;
  user1_id: string;
  user2_id: string;
  status: string;
}

export function ChatInterface({ onDisconnect, userId }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isSearching, setIsSearching] = useState(true);
  const [chatSession, setChatSession] = useState<ChatSession | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const searchIntervalRef = useRef<number | null>(null);
  const supabase = createClient();

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Start searching for a partner
  useEffect(() => {
    startSearching();
    
    return () => {
      if (searchIntervalRef.current) {
        clearInterval(searchIntervalRef.current);
      }
    };
  }, []);

  // Subscribe to new messages when chat session is active
  useEffect(() => {
    if (!chatSession) return;

    // Load existing messages
    loadMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel(`chat_${chatSession.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `chat_session_id=eq.${chatSession.id}`,
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some(m => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatSession]);

  const loadMessages = async () => {
    if (!chatSession) return;

    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("chat_session_id", chatSession.id)
      .order("sent_at", { ascending: true });

    if (error) {
      console.error("Error loading messages:", error);
      return;
    }

    setMessages(data || []);
  };

  const startSearching = async () => {
    setIsSearching(true);
    
    // Try to find a match
    const tryMatch = async () => {
      try {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-1b522738/search/start`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${publicAnonKey}`,
            },
            body: JSON.stringify({ userId }),
          }
        );

        const data = await response.json();

        if (data.success && data.matched) {
          setIsSearching(false);
          setIsConnected(true);
          setChatSession(data.chatSession);
          if (searchIntervalRef.current) {
            clearInterval(searchIntervalRef.current);
          }
        }
      } catch (error) {
        console.error("Error searching for match:", error);
      }
    };

    // Try immediately
    await tryMatch();

    // Then poll every 2 seconds
    searchIntervalRef.current = window.setInterval(tryMatch, 2000);
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !isConnected || !chatSession) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1b522738/message/send`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            chatSessionId: chatSession.id,
            senderId: userId,
            messageText: inputMessage,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setInputMessage("");
      } else {
        console.error("Error sending message:", data.error);
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleSkip = async () => {
    if (chatSession) {
      // End current chat
      try {
        await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-1b522738/chat/end`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${publicAnonKey}`,
            },
            body: JSON.stringify({
              chatSessionId: chatSession.id,
              userId,
            }),
          }
        );
      } catch (error) {
        console.error("Error ending chat:", error);
      }
    }

    // Reset state
    setIsConnected(false);
    setChatSession(null);
    setMessages([]);

    // Start new search
    startSearching();
  };

  const handleExit = async () => {
    if (chatSession) {
      try {
        await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-1b522738/chat/end`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${publicAnonKey}`,
            },
            body: JSON.stringify({
              chatSessionId: chatSession.id,
              userId,
            }),
          }
        );
      } catch (error) {
        console.error("Error ending chat:", error);
      }
    }

    // Stop searching
    if (isSearching) {
      try {
        await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-1b522738/search/stop`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${publicAnonKey}`,
            },
            body: JSON.stringify({ userId }),
          }
        );
      } catch (error) {
        console.error("Error stopping search:", error);
      }
    }

    // Set user offline
    try {
      await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1b522738/user/online`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            userId,
            isOnline: false,
          }),
        }
      );
    } catch (error) {
      console.error("Error setting user offline:", error);
    }

    onDisconnect();
  };

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl">RandomChat</h1>
            <p className="text-sm text-gray-600">
              {isSearching ? "Searching for a stranger..." : isConnected ? "Connected to: Stranger" : "Disconnected"}
            </p>
          </div>
          <Button
            variant="destructive"
            onClick={handleExit}
            className="gap-2"
          >
            <X className="w-4 h-4" />
            Exit
          </Button>
        </div>

        <div className="grid lg:grid-cols-2 gap-4 justify-items-center">
          {/* Text Chat Section only */}
          <div className="lg:col-span-1 lg:max-w-2xl w-full">
            <Card className="h-[calc(100vh-12rem)] flex flex-col">
              <div className="p-4 border-b">
                <h2>Text Chat</h2>
                <p className="text-sm text-gray-500">
                  {isConnected ? "You can type here" : "Waiting for connection..."}
                </p>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 && !isSearching && (
                  <p className="text-center text-gray-500 text-sm">
                    No messages yet. Start the conversation!
                  </p>
                )}
                {messages.map((message) => {
                  const isYou = message.sender_id === userId;
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isYou ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-4 py-2 ${
                          isYou
                            ? "bg-blue-600 text-white"
                            : "bg-gray-200 text-gray-900"
                        }`}
                      >
                        <p className="text-sm">
                          {message.message_text}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <Input
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                    placeholder={isConnected ? "Type a message..." : "Waiting..."}
                    disabled={!isConnected}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!isConnected || !inputMessage.trim()}
                    size="icon"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={handleSkip}
                    disabled={isSearching}
                    className="gap-2"
                  >
                    <SkipForward className="w-5 h-5" />
                    Next
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
