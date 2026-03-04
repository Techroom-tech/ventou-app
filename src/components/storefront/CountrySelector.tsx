/**
 * CountrySelector — storefront header dropdown
 * Desktop: Flag + Country Name (CURRENCY) ▼
 * Mobile: Flag + CC (compact)
 * Uses FlagCDN for flag images.
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
import { useIsMobile } from '@/hooks/use-mobile';

const CURRENCY_LABELS: Record<string, string> = {
  XOF: 'FCFA',
  XAF: 'FCFA',
  EUR: 'EUR',
  USD: 'USD',
  GBP: 'GBP',
  NGN: 'NGN',
  GHS: 'GHS',
};

export default function CountrySelector() {
  const { country, setCountry, allCountries } = useCountry();
  const isMobile = useIsMobile();

  const currencyLabel = CURRENCY_LABELS[country.currency] || country.currency;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 px-2 text-sm font-medium"
        >
          <img
            src={`https://flagcdn.com/w20/${country.code.toLowerCase()}.png`}
            srcSet={`https://flagcdn.com/w40/${country.code.toLowerCase()}.png 2x`}
            alt={country.name}
            className="w-5 h-auto rounded-sm"
            width={20}
            height={15}
          />
          {isMobile ? (
            <span>{country.code}</span>
          ) : (
            <span>{country.name} ({currencyLabel})</span>
          )}
          <ChevronDown className="h-3 w-3 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {allCountries.map(c => {
          const label = CURRENCY_LABELS[c.currency] || c.currency;
          return (
            <DropdownMenuItem
              key={c.code}
              onSelect={() => setCountry(c.code)}
              className={`gap-2.5 cursor-pointer ${country.code === c.code ? 'bg-accent' : ''}`}
            >
              <img
                src={`https://flagcdn.com/w20/${c.code.toLowerCase()}.png`}
                srcSet={`https://flagcdn.com/w40/${c.code.toLowerCase()}.png 2x`}
                alt={c.name}
                className="w-5 h-auto rounded-sm"
                width={20}
                height={15}
              />
              <span className="flex-1 text-sm">{c.name}</span>
              <span className="text-xs text-muted-foreground">{label}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
