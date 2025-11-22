import { Button } from "./ui/button";
import { Video, MessageSquare } from "lucide-react";

interface LandingProps {
  onStartChat: () => void;
}

export function Landing({ onStartChat }: LandingProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-6xl">RandomChat</h1>
          <p className="text-xl text-gray-600">
            Talk to strangers instantly. Video chat and text with random people from around the world.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-6 border-2 border-gray-200 rounded-xl space-y-3">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                <Video className="w-6 h-6 text-blue-600" />
              </div>
              <h3>Video Chat</h3>
              <p className="text-gray-600 text-sm">
                Connect face-to-face with random strangers via webcam
              </p>
            </div>

            <div className="p-6 border-2 border-gray-200 rounded-xl space-y-3">
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto">
                <MessageSquare className="w-6 h-6 text-indigo-600" />
              </div>
              <h3>Text Chat</h3>
              <p className="text-gray-600 text-sm">
                Chat anonymously with people using the text box
              </p>
            </div>
          </div>

          <Button 
            onClick={onStartChat}
            className="w-full py-6 text-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
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
  );
}
