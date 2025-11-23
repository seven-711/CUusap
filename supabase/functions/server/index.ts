import { Hono } from "npm:hono@4.6.14";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";

const app = new Hono();

// Middleware
app.use("*", cors());
app.use("*", logger(console.log));

// Create Supabase client
const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

// Helper function to generate session ID
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Create or get user session
app.post("/make-server-1b522738/user/session", async (c: any) => {
  try {
    const { sessionId } = await c.req.json();
    
    if (sessionId) {
      // Check if session exists
      const { data: existingUser } = await supabase
        .from("users")
        .select("*")
        .eq("session_id", sessionId)
        .single();
      
      if (existingUser) {
        // Update last_active and is_online
        const { data: updatedUser } = await supabase
          .from("users")
          .update({ 
            is_online: true, 
            last_active: new Date().toISOString() 
          })
          .eq("id", existingUser.id)
          .select()
          .single();
        
        return c.json({ success: true, user: updatedUser });
      }
    }
    
    // Create new user session
    const newSessionId = sessionId || generateSessionId();
    const { data: newUser, error } = await supabase
      .from("users")
      .insert({
        session_id: newSessionId,
        is_online: true,
        is_searching: false,
      })
      .select()
      .single();
    
    if (error) {
      console.error("Error creating user session:", error);
      return c.json({ success: false, error: error.message }, 500);
    }
    
    return c.json({ success: true, user: newUser });
  } catch (error) {
    console.error("Error in /user/session:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Start searching for a chat partner
app.post("/make-server-1b522738/search/start", async (c: any) => {
  try {
    const { userId } = await c.req.json();
    
    if (!userId) {
      return c.json({ success: false, error: "User ID required" }, 400);
    }
    
    // Check if user is already in an active chat
    const { data: activeSessions } = await supabase
      .from("chat_sessions")
      .select("*")
      .eq("status", "active")
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .limit(1);
    
    if (activeSessions && activeSessions.length > 0) {
      return c.json({ 
        success: true, 
        matched: true, 
        chatSession: activeSessions[0] 
      });
    }
    
    // Update user status
    await supabase
      .from("users")
      .update({ is_searching: true })
      .eq("id", userId);
    
    // Check if someone is waiting in queue
    const { data: waitingUsers } = await supabase
      .from("waiting_queue")
      .select("*")
      .neq("user_id", userId)
      .order("joined_at", { ascending: true })
      .limit(1);
    
    if (waitingUsers && waitingUsers.length > 0) {
      const partner = waitingUsers[0];
      
      // Create chat session
      const { data: chatSession, error: sessionError } = await supabase
        .from("chat_sessions")
        .insert({
          user1_id: userId,
          user2_id: partner.user_id,
          status: "active",
        })
        .select()
        .single();
      
      if (sessionError) {
        console.error("Error creating chat session:", sessionError);
        return c.json({ success: false, error: sessionError.message }, 500);
      }
      
      // Remove both users from queue
      await supabase.from("waiting_queue").delete().eq("user_id", partner.user_id);
      await supabase.from("waiting_queue").delete().eq("user_id", userId);
      
      // Update both users
      await supabase
        .from("users")
        .update({ is_searching: false })
        .in("id", [userId, partner.user_id]);
      
      return c.json({ 
        success: true, 
        matched: true, 
        chatSession 
      });
    } else {
      // Check if already in queue to avoid duplicates
      const { data: existingQueueEntry } = await supabase
        .from("waiting_queue")
        .select("*")
        .eq("user_id", userId)
        .single();
      
      if (existingQueueEntry) {
        // Already in queue, just return success
        return c.json({ 
          success: true, 
          matched: false, 
          message: "Already in queue" 
        });
      }
      
      // Add to waiting queue
      const { error: queueError } = await supabase
        .from("waiting_queue")
        .insert({
          user_id: userId,
          joined_at: new Date().toISOString(),
        });
      
      if (queueError) {
        console.error("Error adding to queue:", queueError);
        return c.json({ success: false, error: queueError.message }, 500);
      }
      
      return c.json({ 
        success: true, 
        matched: false, 
        message: "Added to queue" 
      });
    }
  } catch (error) {
    console.error("Error in /search/start:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Stop searching
app.post("/make-server-1b522738/search/stop", async (c: any) => {
  try {
    const { userId } = await c.req.json();
    
    if (!userId) {
      return c.json({ success: false, error: "User ID required" }, 400);
    }
    
    await supabase
      .from("users")
      .update({ is_searching: false })
      .eq("id", userId);
    
    await supabase
      .from("waiting_queue")
      .delete()
      .eq("user_id", userId);
    
    return c.json({ success: true });
  } catch (error) {
    console.error("Error in /search/stop:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Send a message
app.post("/make-server-1b522738/message/send", async (c: any) => {
  try {
    const { chatSessionId, senderId, messageText } = await c.req.json();
    
    if (!chatSessionId || !senderId || !messageText) {
      return c.json({ success: false, error: "Missing required fields" }, 400);
    }
    
    const { data: message, error } = await supabase
      .from("messages")
      .insert({
        chat_session_id: chatSessionId,
        sender_id: senderId,
        message_text: messageText,
      })
      .select()
      .single();
    
    if (error) {
      console.error("Error sending message:", error);
      return c.json({ success: false, error: error.message }, 500);
    }
    
    return c.json({ success: true, message });
  } catch (error) {
    console.error("Error in /message/send:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// End chat session
app.post("/make-server-1b522738/chat/end", async (c: any) => {
  try {
    const { chatSessionId, userId } = await c.req.json();
    
    if (!chatSessionId || !userId) {
      return c.json({ success: false, error: "Missing required fields" }, 400);
    }
    
    // Update chat session status
    await supabase
      .from("chat_sessions")
      .update({ 
        status: "ended", 
        ended_at: new Date().toISOString() 
      })
      .eq("id", chatSessionId);
    
    // Update user status
    await supabase
      .from("users")
      .update({ is_searching: false })
      .eq("id", userId);
    
    return c.json({ success: true });
  } catch (error) {
    console.error("Error in /chat/end:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Get active chat session for user
app.get("/make-server-1b522738/chat/active/:userId", async (c: any) => {
  try {
    const userId = c.req.param("userId");
    
    const { data: chatSessions } = await supabase
      .from("chat_sessions")
      .select("*")
      .eq("status", "active")
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .order("started_at", { ascending: false })
      .limit(1);
    
    if (chatSessions && chatSessions.length > 0) {
      return c.json({ success: true, chatSession: chatSessions[0] });
    }
    
    return c.json({ success: true, chatSession: null });
  } catch (error) {
    console.error("Error in /chat/active:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Update user online status
app.post("/make-server-1b522738/user/online", async (c: any) => {
  try {
    const { userId, isOnline } = await c.req.json();
    
    if (!userId) {
      return c.json({ success: false, error: "User ID required" }, 400);
    }
    
    await supabase
      .from("users")
      .update({ 
        is_online: isOnline,
        last_active: new Date().toISOString()
      })
      .eq("id", userId);
    
    if (!isOnline) {
      // Remove from queue if going offline
      await supabase
        .from("waiting_queue")
        .delete()
        .eq("user_id", userId);
    }
    
    return c.json({ success: true });
  } catch (error) {
    console.error("Error in /user/online:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Get user by ID
app.get("/make-server-1b522738/user/:userId", async (c: any) => {
  try {
    const { userId } = c.req.param();
    
    const { data: user, error } = await supabase
      .from("users")
      .select("id, username, session_id")
      .eq("id", userId)
      .single();
    
    if (error || !user) {
      return c.json({ success: false, error: "User not found" }, 404);
    }
    
    return c.json({ success: true, user });
  } catch (error) {
    console.error("Error in /user/:userId:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Health check
app.get("/make-server-1b522738/health", (c: any) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

Deno.serve(app.fetch);