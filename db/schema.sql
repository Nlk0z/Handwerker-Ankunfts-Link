-- Datenmodell Handwerker-Ankunfts-Link
-- Läuft unverändert auf der Demo-Datenbank (PGlite) und auf Supabase/Postgres.
-- Alle Befehle sind wiederholbar (IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS betrieb (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  telefon       text,
  sms_absender  text,                       -- max. 11 Zeichen, z. B. "ElektroMaier"
  karte_aktiv   boolean NOT NULL DEFAULT true,
  tarif         text NOT NULL DEFAULT 'test',
  erstellt_am   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mitarbeiter (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  betrieb_id    uuid NOT NULL REFERENCES betrieb(id) ON DELETE CASCADE,
  name          text NOT NULL,
  email         text NOT NULL UNIQUE,
  passwort_hash text NOT NULL,
  rolle         text NOT NULL DEFAULT 'monteur' CHECK (rolle IN ('inhaber', 'monteur')),
  erstellt_am   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS auftrag (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  betrieb_id        uuid NOT NULL REFERENCES betrieb(id) ON DELETE CASCADE,
  mitarbeiter_id    uuid REFERENCES mitarbeiter(id) ON DELETE SET NULL,
  kunde_name        text NOT NULL,
  kunde_telefon     text NOT NULL,          -- Format +49...
  adresse           text,
  termin_datum      date NOT NULL,
  fenster_von       time,
  fenster_bis       time,
  status            text NOT NULL DEFAULT 'geplant'
                    CHECK (status IN ('geplant', 'unterwegs', 'angekommen', 'erledigt', 'storniert')),
  eta               timestamptz,            -- voraussichtliche Ankunft
  losgefahren_am    timestamptz,
  angekommen_am     timestamptz,
  link_token        text NOT NULL UNIQUE,
  link_gueltig_bis  timestamptz NOT NULL,
  pos_lat           double precision,       -- letzte Position des Monteurs
  pos_lng           double precision,
  pos_zeit          timestamptz,
  notiz             text,
  erstellt_am       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS auftrag_betrieb_datum ON auftrag (betrieb_id, termin_datum);

CREATE TABLE IF NOT EXISTS benachrichtigung (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auftrag_id   uuid NOT NULL REFERENCES auftrag(id) ON DELETE CASCADE,
  typ          text NOT NULL CONSTRAINT benachrichtigung_typ_check
               CHECK (typ IN ('losgefahren', 'bald_da', 'verspaetung', 'angekommen', 'erledigt')),
  text         text NOT NULL,
  status       text NOT NULL CHECK (status IN ('demo', 'gesendet', 'fehler')),
  anbieter_id  text,
  fehler       text,
  gesendet_am  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS benachrichtigung_auftrag ON benachrichtigung (auftrag_id);

-- Ergänzungen (laufen auch auf bestehenden Datenbanken, mehrfach ausführbar)

-- Website, Bewertungs-Link (z. B. Google) und eigene SMS-Texte des Betriebs
ALTER TABLE betrieb ADD COLUMN IF NOT EXISTS website text;
ALTER TABLE betrieb ADD COLUMN IF NOT EXISTS bewertung_link text;
ALTER TABLE betrieb ADD COLUMN IF NOT EXISTS sms_vorlagen jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Neue SMS-Arten "angekommen" und "erledigt" (ältere Datenbanken kannten nur drei)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'benachrichtigung_typ_check' AND pg_get_constraintdef(oid) LIKE '%erledigt%'
  ) THEN
    ALTER TABLE benachrichtigung DROP CONSTRAINT IF EXISTS benachrichtigung_typ_check;
    ALTER TABLE benachrichtigung ADD CONSTRAINT benachrichtigung_typ_check
      CHECK (typ IN ('losgefahren', 'bald_da', 'verspaetung', 'angekommen', 'erledigt'));
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Bewertung des Kunden nach erledigtem Auftrag (eine pro Auftrag)
CREATE TABLE IF NOT EXISTS bewertung (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auftrag_id   uuid NOT NULL UNIQUE REFERENCES auftrag(id) ON DELETE CASCADE,
  sterne       integer NOT NULL CHECK (sterne BETWEEN 1 AND 5),
  text         text,
  erstellt_am  timestamptz NOT NULL DEFAULT now()
);

-- Wie oft der Kunde seinen Link geöffnet hat (für die Auswertung)
ALTER TABLE auftrag ADD COLUMN IF NOT EXISTS link_aufrufe integer NOT NULL DEFAULT 0;
ALTER TABLE auftrag ADD COLUMN IF NOT EXISTS link_erster_aufruf timestamptz;
