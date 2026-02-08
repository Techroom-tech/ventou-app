import { Link } from 'react-router-dom';
import { LanguageToggle } from './LanguageToggle';

export function AuthHeader() {
  return (
    <header className="absolute top-0 left-0 right-0 z-10 p-4 sm:p-6">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-xl">V</span>
          </div>
          <span className="text-xl font-bold text-foreground">VENTOU</span>
        </Link>
        <LanguageToggle />
      </div>
    </header>
  );
}
