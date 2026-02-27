import { MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function FloatingChatButton() {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate('/support')}
      className="fixed bottom-20 lg:bottom-6 right-4 z-50 h-14 w-14 rounded-full bg-accent text-accent-foreground shadow-lg hover:bg-accent/90 transition-all flex items-center justify-center hover:scale-105"
      aria-label="Support chat"
    >
      <MessageCircle className="h-6 w-6" />
    </button>
  );
}
