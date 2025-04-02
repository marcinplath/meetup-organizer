# Meetup Organizer

Aplikacja do organizacji spotkań wśród znajomych. Umożliwia tworzenie zamkniętych grup użytkowników, zarządzanie wydarzeniami cyklicznymi i jednorazowymi, oraz komunikację między uczestnikami.

## Funkcje

- Rejestracja użytkowników z kodem dostępu
- Zarządzanie zamkniętymi grupami
- Tworzenie i zarządzanie wydarzeniami (jednorazowymi i cyklicznymi)
- System powiadomień
- Profil użytkownika
- Responsywny interfejs

## Technologie

- React + TypeScript
- Chakra UI
- Supabase (backend)
- React Router
- React Query

## Wymagania

- Node.js 16+
- npm lub yarn

## Instalacja

1. Sklonuj repozytorium:
```bash
git clone https://github.com/yourusername/meetup-organizer.git
cd meetup-organizer
```

2. Zainstaluj zależności:
```bash
npm install
# lub
yarn install
```

3. Skopiuj plik `.env.example` do `.env` i uzupełnij zmienne środowiskowe:
```bash
cp .env.example .env
```

4. Uruchom aplikację w trybie deweloperskim:
```bash
npm run dev
# lub
yarn dev
```

## Struktura projektu

```
meetup-organizer/
├── src/
│   ├── components/     # Komponenty wielokrotnego użytku
│   ├── layouts/       # Komponenty układu strony
│   ├── pages/         # Komponenty stron
│   ├── lib/           # Biblioteki i konfiguracja
│   ├── App.tsx        # Główny komponent aplikacji
│   └── main.tsx       # Punkt wejścia aplikacji
├── public/            # Statyczne pliki
├── index.html         # Szablon HTML
├── package.json       # Zależności i skrypty
├── tsconfig.json      # Konfiguracja TypeScript
└── vite.config.ts     # Konfiguracja Vite
```

## Rozwój

1. Utwórz nową gałąź dla swojej funkcjonalności:
```bash
git checkout -b feature/nazwa-funkcjonalnosci
```

2. Wprowadź zmiany i zatwierdź je:
```bash
git add .
git commit -m "Dodano nową funkcjonalność"
```

3. Wypchnij zmiany do repozytorium:
```bash
git push origin feature/nazwa-funkcjonalnosci
```

## Licencja

MIT 