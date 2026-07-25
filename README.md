# Great Sport Bets

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

### Import typów (panel Admin → zakładka Import)

Panel obsługuje dwa źródła. Funkcje scrapujące wołają serwisy zewnętrzne po stronie
serwera (żaden z nich nie wysyła nagłówków CORS), więc muszą być wdrożone:

```sh
supabase functions deploy sportytrader-proxy --no-verify-jwt
supabase functions deploy zawodtyper-proxy --no-verify-jwt
supabase functions deploy ai-rewrite --no-verify-jwt
supabase functions deploy ai-analyze --no-verify-jwt
```

Funkcje AI wymagają sekretu `OPENROUTER_API_KEY`.

**ZawodTyper** — źródło publikuje ~115 typów dziennie, więc AI jest celowo
oddzielone od pobierania:

1. `zawodtyper-proxy` pobiera cały dzień jako surowe dane (polski tekst autora).
   **Nie uruchamia AI i nie kosztuje tokenów.**
2. Admin filtruje (dyscyplina, kurs, skuteczność autora) i zaznacza mecze.
3. Dopiero przycisk „Generuj analizy AI" woła `ai-analyze` — wyłącznie dla
   zaznaczonych. AI pisze angielski typ, ligę i analizę.
4. Przyciski Tip / Hero / Coupon są aktywne dopiero po wygenerowaniu analizy.

Analiza celowo **odwzorowuje oryginał**, a nie streszcza go: ta sama argumentacja
w tej samej kolejności, ta sama długość, jeden akapit na każdą nogę zakładu przy
betbuilderach — tylko z poprawioną ortografią i interpunkcją, bez emoji, pozdrowień
i nazw bukmacherów. Gdy model jest nieosiągalny, `ai-analyze` zwraca `ok: false`
i surowy polski tekst; panel oznacza taki wiersz na bursztynowo i **blokuje import**,
żeby nieprzetłumaczona notka nie trafiła na produkcję.

Reguły parsowania `zawodtyper-proxy` są testowane na prawdziwej odpowiedzi API
(`npm test`, fixture w `src/lib/__fixtures__/`).

#### Weryfikacja terminu meczu

`match_date` w zawodtyper jest wpisywany ręcznie przez typera, więc bywa błędny.
`zawodtyper-proxy` sprawdza każdy typ względem niezależnego terminarza
(odds-api.io) i dokleja wynik do meczu:

| Status | Znaczenie |
|---|---|
| `confirmed` | mecz istnieje o podanej godzinie |
| `time_mismatch` | godzina się nie zgadza — karta pokazuje oficjalną |
| `cancelled` | mecz odwołany |
| `not_found` | nie dopasowano (nie znaczy „błędny") |

Przy imporcie **wygrywa terminarz**: tip dostaje oficjalną godzinę i oficjalną
ligę, nawet jeśli typer wpisał inne. Dyscypliny bez terminarza (żużel) zostają
bez weryfikacji zamiast być raportowane jako nieznalezione.

Dopasowanie nazw jest tolerancyjne (zawieranie tokenów, transliteracja `ł`/`ø`,
polskie egzonimy typu Lipsk→Leipzig), bo typerzy piszą „Lech" tam, gdzie
terminarz ma „KKS Lech Poznan". Tolerancja czasu zależy od dyscypliny: 15 minut
dla sportów zespołowych, 120 dla rozgrywanych po kolei (tenis, MMA, dart,
e-sport), gdzie start zależy od końca poprzedniego meczu.

Klucz `ODDS_API_KEY` można ustawić jako sekret funkcji; bez niego używany jest
klucz zaszyty w kliencie.

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
