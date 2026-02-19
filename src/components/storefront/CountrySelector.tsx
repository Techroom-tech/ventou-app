/**
 * CountrySelector — storefront header dropdown
 * Shows flag + country code; expands to full list on click.
 */
import { ChevronDown } from 'lucide-react';
import { useCountry } from '@/contexts/CountryContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function CountrySelector() {
  const { country, setCountry, allCountries } = useCountry();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1 px-2 text-sm font-medium"
        >
          <span>{country.flag}</span>
          <span className="hidden sm:inline">{country.code}</span>
          <ChevronDown className="h-3 w-3 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {allCountries.map(c => (
          <DropdownMenuItem
            key={c.code}
            onSelect={() => setCountry(c.code)}
            className={`gap-2 cursor-pointer ${country.code === c.code ? 'bg-accent' : ''}`}
          >
            <span className="text-base">{c.flag}</span>
            <span className="flex-1 text-sm">{c.name}</span>
            <span className="text-xs text-muted-foreground">{c.currency}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
