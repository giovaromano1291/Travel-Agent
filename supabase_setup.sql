-- Esegui questo SQL nel SQL Editor di Supabase
-- Vai su: supabase.com → tuo progetto → SQL Editor → New query

-- Crea la tabella degli itinerari
CREATE TABLE itineraries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  destination TEXT NOT NULL,
  period TEXT,
  trip_year INTEGER,
  duration TEXT,
  style TEXT,
  budget TEXT,
  departure TEXT,
  trav_type TEXT,
  adults INTEGER DEFAULT 2,
  children INTEGER DEFAULT 0,
  hotels TEXT,
  itinerary_text TEXT,
  food_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Abilita la sicurezza a livello di riga (RLS)
-- Ogni utente vede SOLO i propri itinerari
ALTER TABLE itineraries ENABLE ROW LEVEL SECURITY;

-- Policy: un utente può leggere solo i propri itinerari
CREATE POLICY "Utenti vedono i propri itinerari"
  ON itineraries FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: un utente può inserire solo i propri itinerari
CREATE POLICY "Utenti inseriscono i propri itinerari"
  ON itineraries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: un utente può eliminare solo i propri itinerari
CREATE POLICY "Utenti eliminano i propri itinerari"
  ON itineraries FOR DELETE
  USING (auth.uid() = user_id);
