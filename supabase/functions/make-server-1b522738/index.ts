// @ts-nocheck
import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  } try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const url = new URL(req.url)
    const path = url.pathname
    console.log("Request path:", path)

    // Helper function to generate session ID
    function generateSessionId(): string {
      return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Create or get user session
    if (path.endsWith('/user/session') && req.method === 'POST') {
      const { sessionId } = await req.json()
      
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
          
          return new Response(
            JSON.stringify({ success: true, user: updatedUser }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
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
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      return new Response(
        JSON.stringify({ success: true, user: newUser }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Start searching for a chat partner
    if (path.endsWith('/search/start') && req.method === 'POST') {
      const { userId } = await req.json();
      
      if (!userId) {
        return new Response(
          JSON.stringify({ success: false, error: "User ID required" }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      // Check if user is already in an active chat
      const { data: activeSessions } = await supabase
        .from("chat_sessions")
        .select("*")
        .eq("status", "active")
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
        .limit(1);
      
      if (activeSessions && activeSessions.length > 0) {
        return new Response(
          JSON.stringify({ 
            success: true, 
            matched: true, 
            chatSession: activeSessions[0] 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
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
          return new Response(
            JSON.stringify({ success: false, error: sessionError.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        
        // Remove both users from queue
        await supabase.from("waiting_queue").delete().eq("user_id", partner.user_id);
        await supabase.from("waiting_queue").delete().eq("user_id", userId);
        
        // Update both users
        await supabase
          .from("users")
          .update({ is_searching: false })
          .in("id", [userId, partner.user_id]);
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            matched: true, 
            chatSession 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } else {
        // Check if already in queue to avoid duplicates
        const { data: existingQueueEntry } = await supabase
          .from("waiting_queue")
          .select("*")
          .eq("user_id", userId)
          .single();
        
        if (existingQueueEntry) {
          // Already in queue, just return success
          return new Response(
            JSON.stringify({ 
              success: true, 
              matched: false, 
              message: "Already in queue" 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        
        // Add to waiting queue
        const { error: queueError } = await supabase
          .from("waiting_queue")
          .insert({
            user_id: userId,
            joined_at: new Date().toISOString(),
          });
        
        if (queueError) {
          return new Response(
            JSON.stringify({ success: false, error: queueError.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            matched: false, 
            message: "Added to queue" 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Stop searching
    if (path.endsWith('/search/stop') && req.method === 'POST') {
      const { userId } = await req.json();
      
      if (!userId) {
        return new Response(
          JSON.stringify({ success: false, error: "User ID required" }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      await supabase
        .from("users")
        .update({ is_searching: false })
        .eq("id", userId);
      
      await supabase
        .from("waiting_queue")
        .delete()
        .eq("user_id", userId);
      
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Send a message
    if (path.endsWith('/message/send') && req.method === 'POST') {
      const { chatSessionId, senderId, messageText } = await req.json();
      
      if (!chatSessionId || !senderId || !messageText) {
        return new Response(
          JSON.stringify({ success: false, error: "Missing required fields" }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
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
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      return new Response(
        JSON.stringify({ success: true, message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // End chat session
    if (path.endsWith('/chat/end') && req.method === 'POST') {
      const { chatSessionId, userId } = await req.json();
      
      if (!chatSessionId || !userId) {
        return new Response(
          JSON.stringify({ success: false, error: "Missing required fields" }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
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
      
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get active chat session for user
    if (path.startsWith('/chat/active/') && req.method === 'GET') {
      const userId = path.split('/')[3]
      
      const { data: chatSessions } = await supabase
        .from("chat_sessions")
        .select("*")
        .eq("status", "active")
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
        .order("started_at", { ascending: false })
        .limit(1);
      
      if (chatSessions && chatSessions.length > 0) {
        return new Response(
          JSON.stringify({ success: true, chatSession: chatSessions[0] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      return new Response(
        JSON.stringify({ success: true, chatSession: null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update user online status
    if (path.endsWith('/user/online') && req.method === 'POST') {
      const { userId, isOnline } = await req.json();
      
      if (!userId) {
        return new Response(
          JSON.stringify({ success: false, error: "User ID required" }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
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
      
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (path.startsWith('/user/') && req.method === 'GET') {
      const userId = path.split('/')[2]
      
      const { data: user, error } = await supabase
        .from("users")
        .select("id, username, session_id")
        .eq("id", userId)
        .single();
      
      if (error || !user) {
        return new Response(
          JSON.stringify({ success: false, error: "User not found" }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      return new Response(
        JSON.stringify({ success: true, user }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (path.endsWith('/health') && req.method === 'GET') {
      return new Response(
        JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Handle user by ID route (needs to be last)
    if (path.includes('/user/') && req.method === 'GET' && !path.endsWith('/session')) {
      const pathParts = path.split('/')
      const userId = pathParts[pathParts.length - 1]
      
      const { data: user, error } = await supabase
        .from("users")
        .select("id, username, session_id")
        .eq("id", userId)
        .single();
      
      if (error || !user) {
        return new Response(
          JSON.stringify({ success: false, error: "User not found" }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      return new Response(
        JSON.stringify({ success: true, user }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Add other routes as needed...
    return new Response(
      JSON.stringify({ error: 'Route not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})