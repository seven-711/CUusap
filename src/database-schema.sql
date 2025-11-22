-- =====================================================
-- Database Schema for Omegle-like Chat Application
-- =====================================================

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. USERS TABLE
-- =====================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id TEXT UNIQUE NOT NULL,
    is_online BOOLEAN DEFAULT true,
    is_searching BOOLEAN DEFAULT false,
    video_enabled BOOLEAN DEFAULT true,
    audio_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. CHAT SESSIONS TABLE
-- =====================================================
CREATE TABLE chat_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user1_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user2_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'ended')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT different_users CHECK (user1_id != user2_id)
);

-- =====================================================
-- 3. MESSAGES TABLE
-- =====================================================
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chat_session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message_text TEXT NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_read BOOLEAN DEFAULT false
);

-- =====================================================
-- 4. WAITING QUEUE TABLE
-- =====================================================
CREATE TABLE waiting_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    interests TEXT[]
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Users table indexes
CREATE INDEX idx_users_session_id ON users(session_id);
CREATE INDEX idx_users_online_searching ON users(is_online, is_searching);
CREATE INDEX idx_users_last_active ON users(last_active);

-- Chat sessions table indexes
CREATE INDEX idx_chat_sessions_status ON chat_sessions(status);
CREATE INDEX idx_chat_sessions_user1 ON chat_sessions(user1_id);
CREATE INDEX idx_chat_sessions_user2 ON chat_sessions(user2_id);
CREATE INDEX idx_chat_sessions_started_at ON chat_sessions(started_at);

-- Messages table indexes
CREATE INDEX idx_messages_chat_session ON messages(chat_session_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_sent_at ON messages(sent_at);

-- Waiting queue table indexes
CREATE INDEX idx_waiting_queue_joined_at ON waiting_queue(joined_at);
CREATE INDEX idx_waiting_queue_user_id ON waiting_queue(user_id);

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update last_active timestamp
CREATE OR REPLACE FUNCTION update_last_active()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE users SET last_active = NOW() WHERE id = NEW.sender_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update last_active when a message is sent
CREATE TRIGGER trigger_update_last_active
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION update_last_active();

-- Function to clean up inactive users (optional, for maintenance)
CREATE OR REPLACE FUNCTION cleanup_inactive_users()
RETURNS void AS $$
BEGIN
    -- Mark users as offline if inactive for more than 5 minutes
    UPDATE users 
    SET is_online = false, is_searching = false
    WHERE last_active < NOW() - INTERVAL '5 minutes' 
    AND is_online = true;
    
    -- Remove from waiting queue if inactive
    DELETE FROM waiting_queue 
    WHERE user_id IN (
        SELECT id FROM users WHERE is_online = false
    );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE users IS 'Stores anonymous user session information';
COMMENT ON TABLE chat_sessions IS 'Tracks chat rooms between two users';
COMMENT ON TABLE messages IS 'Stores all chat messages';
COMMENT ON TABLE waiting_queue IS 'Manages users waiting to be matched';

COMMENT ON COLUMN users.session_id IS 'Browser session identifier for anonymous users';
COMMENT ON COLUMN chat_sessions.status IS 'Status: waiting, active, or ended';
COMMENT ON COLUMN waiting_queue.interests IS 'Optional interests for future matching algorithm';
