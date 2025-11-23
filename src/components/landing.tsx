import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { MessageSquare } from "lucide-react";
import { useState } from "react";

interface LandingProps {
  onStartChat: (username: string) => void;
}

export function Landing({ onStartChat }: LandingProps) {
  const [username, setUsername] = useState("");
  return (
    <>
    <nav className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="text-3xl text-red-600" style={{ fontWeight: 700 }}>CU-usap</div>
          </div>
          <div className="flex-1 items-center flex justify-center">
              <div className="hidden md:flex items-center space-x-10">
                <a href="#" className="text-gray-700 hover:text-indigo-600 px-3 py-2 text-sm font-medium">Home</a>
                <a href="#features" className="text-gray-500 hover:text-indigo-600 px-3 py-2 text-sm font-medium">Features</a>
                <a href="#how-it-works" className="text-gray-500 hover:text-indigo-600 px-3 py-2 text-sm font-medium">How It Works</a>
                <a href="#safety" className="text-gray-500 hover:text-indigo-600 px-3 py-2 text-sm font-medium">Safety</a>
              </div>
            </div>
          </div>
        </div>
      </nav>
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-6xl text-red-600" style={{fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: '2.5rem'}}>Chat Without Showing Identity</h1>
          <p className="text-xl text-gray-600">
            Talk to strangers instantly with anonymous text chat from fellow students. Share your thoughts,
            ask questions, or just freely explore the conversation.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
          <div className="p-6 border-2 border-gray-200 rounded-xl space-y-3 max-w-md mx-auto">
            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto">
              <MessageSquare className="w-6 h-6 text-indigo-600" />
            </div>
            <h3>Text Chat</h3>
            <p className="text-gray-600 text-sm">
              Chat anonymously with random people using a simple text interface.
            </p>

            <Input
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mb-4"
            />
          </div>

          <Button 
            onClick={() => onStartChat(username)}
            className="w-full py-6 text-lg" disabled={!username.trim()}
            style={{background: "linear-gradient(to right, rgb(220 38 38), rgb(236 72 153))", color: "white"}}
          >
            Start Chatting
          </Button>

          <p className="text-xs text-gray-500">
            By using this service, you agree to be respectful and follow community guidelines
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4 text-sm text-gray-600">
          <div className="space-y-1">
            <div className="text-2xl">🌍</div>
            <p>Global Connections</p>
          </div>
          <div className="space-y-1">
            <div className="text-2xl">🎭</div>
            <p>Anonymous Chat</p>
          </div>
          <div className="space-y-1">
            <div className="text-2xl">⚡</div>
            <p>Instant Matching</p>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
