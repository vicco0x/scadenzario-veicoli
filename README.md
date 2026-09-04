# Scadenzario Veicoli

PWA responsive per gestire veicoli, bolli, assicurazioni, revisioni e altre scadenze. È una riscrittura completa dell'MVP originale con React, TypeScript, validazione, repository dati astratto e integrazione Supabase pronta.

## Funzioni

- Dashboard con scadenze scadute, entro 30 giorni e regolari
- Agenda ordinata per le prossime scadenze, senza far sparire quelle future dietro record scaduti
- Archivio veicoli con ricerca
- CRUD veicoli e documenti con validazione e conferme di cancellazione
- Campi assicurazione dedicati
- Migrazione automatica dei dati dal vecchio `localStorage` (`scadenzario-veicoli`)
- Modalità `local` senza backend
- Modalità `supabase` con autenticazione email/password e sincronizzazione cloud
- Row Level Security per isolamento dei dati tra utenti
- Tipi TypeScript del database in `src/lib/database.types.ts`
- PWA installabile con cache offline dell'app shell
- CI GitHub per typecheck, lint e build
- Modali accessibili con focus management, `Esc` e focus trap

## Requisiti

- Node.js 22 o successivo
- npm 10 o successivo

## Avvio locale

```bash
npm install
cp .env.example .env
npm run dev
```

Per la modalità locale:

```env
VITE_DATA_MODE=local
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

## Collegare Supabase

1. Crea un progetto Supabase.
2. Applica `supabase/migrations/20260904_initial_schema.sql` dal SQL Editor oppure con la Supabase CLI.
3. Dal **Connect dialog** del progetto copia Project URL e **publishable key**.
4. Imposta:

```env
VITE_DATA_MODE=supabase
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_KEY
```

5. In **Authentication → Providers → Email** abilita email/password. Se vuoi accesso immediato durante lo sviluppo, puoi disabilitare temporaneamente la conferma email.
6. Riavvia il dev server.

`.env` è già ignorato da Git. La publishable key è destinata al client e lavora insieme alle policy RLS. Non inserire mai una Supabase secret key o una legacy `service_role` key nel frontend.

Per compatibilità, il codice accetta anche `VITE_SUPABASE_ANON_KEY`, ma i nuovi progetti dovrebbero usare `VITE_SUPABASE_PUBLISHABLE_KEY`.

## Database e sicurezza

Schema principale:

- `public.vehicles`
- `public.vehicle_documents`

Entrambe le tabelle hanno `user_id` e RLS attiva. Ogni utente autenticato può leggere e modificare solo i propri record. Il database applica inoltre vincoli su targa, lunghezza dei campi e tipi di documento.

## Script

```bash
npm run dev
npm run typecheck
npm run lint
npm run build
npm run preview
```

## Deployment

Il progetto è compatibile con Vercel, Netlify e hosting statici compatibili con Vite. In produzione configura le stesse variabili `VITE_*` nel provider di hosting.
