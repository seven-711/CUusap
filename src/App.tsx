import { useState, useEffect } from "react";
import { Landing } from "./components/landing";
import { ChatInterface } from "./components/chat-interface";
import { projectId, publicAnonKey } from "./utils/supabase/info";

export default function App() {
  const [isInChat, setIsInChat] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize user session
  useEffect(() => {
    initializeUserSession();
  }, []);

  const initializeUserSession = async () => {
    try {
      // Check if we have a session ID in localStorage
      let sessionId = localStorage.getItem("chat_session_id");

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1b522738/user/session`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ sessionId }),
        }
      );

      const data = await response.json();

      if (data.success && data.user) {
        setUserId(data.user.id);
        localStorage.setItem("chat_session_id", data.user.session_id);
        // Restore chat UI state if we previously started chatting
        const storedUsername = localStorage.getItem("chat_username");
        if (storedUsername) {
          setUsername(storedUsername);
          setIsInChat(true);
        }
      } else {
        console.error("Error initializing user session:", data.error);
      }
    } catch (error) {
      console.error("Error initializing user session:", error);
    } finally {
      setIsLoading(false);
    }
  };

const handleStartChat = async (userUsername: string) => {
  console.log("App handleStartChat received username:", userUsername);

  if (!userId) return;            // safety check

  // 1. store locally so UI shows it immediately
  setUsername(userUsername);
  localStorage.setItem("chat_username", userUsername);

  // 2. persist in DB via Edge Function
  try {
    await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-1b522738/user/username`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({ userId, username: userUsername }),
      }
    );
  } catch (e) {
    console.error("Failed to save username:", e);
  }

  // 3. move to chat UI
  setIsInChat(true);
};

  const handleDisconnect = () => {
    setIsInChat(false);
    setUsername(null);
    localStorage.removeItem("chat_username");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-red-600">Error initializing session. Please refresh the page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {!isInChat ? (
        <Landing onStartChat={handleStartChat} />
      ) : (
        <ChatInterface onDisconnect={handleDisconnect} userId={userId} />
      )}
    </div>
  );
}
