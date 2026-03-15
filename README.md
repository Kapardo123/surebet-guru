# Surebet Guru

Aplikacja do wyszukiwania i zarządzania typami bukmacherskimi (Surebets), zintegrowana z Supabase i Stripe.

## Rozpoczęcie pracy

### Wymagania
- Node.js (wersja 18 lub nowsza)
- npm

### Instalacja

1. Zainstaluj zależności:
   ```sh
   npm install
   ```

2. Skonfiguruj plik `.env` z danymi swojego projektu Supabase:
   ```env
   VITE_SUPABASE_URL=twoj_url
   VITE_SUPABASE_ANON_KEY=twoj_klucz_anon
   ```

3. Uruchom serwer deweloperski:
   ```sh
   npm run dev
   ```

## Wdrożenie (Self-Hosting)

Możesz wdrożyć tę aplikację na własnej infrastrukturze, używając **Supabase** jako bazy danych i **Vercel** do hostingu frontendu.

### 1. Konfiguracja Supabase

1. Utwórz nowy projekt na [Supabase](https://supabase.com/).
2. **Baza danych**: Wykonaj zapytania SQL z folderu `supabase/migrations/` w Edytorze SQL Supabase, aby utworzyć tabele i polityki RLS.
3. **Edge Functions**: Wdróż funkcje z folderu `supabase/functions/` za pomocą Supabase CLI:
   ```sh
   supabase functions deploy create-payment
   supabase functions deploy verify-payment
   supabase functions deploy premium-status
   supabase functions deploy referral
   ```
4. **Zmienne środowiskowe**: Skonfiguruj `STRIPE_SECRET_KEY` w ustawieniach funkcji Supabase.

### 2. Wdrożenie na Vercel

1. Połącz swoje repozytorium GitHub z [Vercel](https://vercel.com/).
2. Skonfiguruj następujące zmienne środowiskowe w panelu Vercel:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Vercel automatycznie zbuduje i wdroży projekt.

## Technologia

- **Frontend**: React + Vite + TypeScript
- **UI**: shadcn/ui + Tailwind CSS
- **Backend/DB**: Supabase
- **Płatności**: Stripe
- **Animacje**: Framer Motion
