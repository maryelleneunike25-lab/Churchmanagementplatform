CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE IF NOT EXISTS users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email citext UNIQUE NOT NULL,
    name text NOT NULL,
    password_hash text,
    google_id text UNIQUE,
    auth_provider text NOT NULL,
    role text CHECK (role IN ('super_admin', 'admin')) NOT NULL DEFAULT 'admin',
    status text CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')) NOT NULL DEFAULT 'pending',
    permissions jsonb DEFAULT '{}'::jsonb,
    komisi_leader_of text[] DEFAULT '{}'::text[],
    approved_by uuid REFERENCES users(id) ON DELETE SET NULL,
    approved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS auth_allowlist (
    email citext PRIMARY KEY,
    added_by uuid REFERENCES users(id) ON DELETE SET NULL,
    added_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS families (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    label text,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS komsel (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    display_name text NOT NULL,
    name_key text UNIQUE NOT NULL,
    day text,
    time text,
    location text,
    status text NOT NULL DEFAULT 'active',
    leader_jemaat_id uuid, -- We'll add FK later after jemaat table
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS jemaat (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id uuid REFERENCES families(id) ON DELETE SET NULL,
    family_role text CHECK (family_role IN ('kepala', 'pasangan', 'anak')),
    komsel_id uuid REFERENCES komsel(id) ON DELETE SET NULL,
    name text NOT NULL,
    nickname text,
    email text,
    phones text[] DEFAULT '{}'::text[],
    address text,
    instagram text,
    birth_place text,
    birth_date date,
    birth_date_raw text,
    gender text,
    marital_status text,
    anniversary date,
    baptism_status text,
    ibadah text[] DEFAULT '{}'::text[],
    pelayan text[] DEFAULT '{}'::text[],
    lama_beribadah text,
    spouse_church text,
    status text NOT NULL DEFAULT 'active',
    join_date date,
    source_updated_at timestamp with time zone,
    source_row int,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE komsel ADD CONSTRAINT fk_komsel_leader FOREIGN KEY (leader_jemaat_id) REFERENCES jemaat(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS komisi (
    id text PRIMARY KEY,
    name text NOT NULL,
    min_age int,
    max_age int
);

CREATE TABLE IF NOT EXISTS komisi_members (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    komisi_id text REFERENCES komisi(id) ON DELETE CASCADE,
    jemaat_id uuid REFERENCES jemaat(id) ON DELETE CASCADE,
    role text CHECK (role IN ('anggota', 'pengurus', 'guru')) NOT NULL DEFAULT 'anggota',
    manual_name text,
    manual_phone text,
    manual_birth_date date,
    UNIQUE (komisi_id, jemaat_id)
);

CREATE TABLE IF NOT EXISTS komisi_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    komisi_id text REFERENCES komisi(id) ON DELETE CASCADE,
    date date NOT NULL,
    title text NOT NULL
);

CREATE TABLE IF NOT EXISTS komisi_attendance (
    session_id uuid REFERENCES komisi_sessions(id) ON DELETE CASCADE,
    member_id uuid REFERENCES komisi_members(id) ON DELETE CASCADE,
    present boolean NOT NULL DEFAULT false,
    PRIMARY KEY (session_id, member_id)
);

CREATE TABLE IF NOT EXISTS attendance_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    date date NOT NULL,
    service_type text NOT NULL,
    UNIQUE (date, service_type)
);

CREATE TABLE IF NOT EXISTS attendance_present (
    session_id uuid REFERENCES attendance_sessions(id) ON DELETE CASCADE,
    jemaat_id uuid REFERENCES jemaat(id) ON DELETE CASCADE,
    PRIMARY KEY (session_id, jemaat_id)
);

CREATE TABLE IF NOT EXISTS app_kv (
    key text PRIMARY KEY,
    value jsonb,
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_log (
    id bigserial PRIMARY KEY,
    user_id uuid REFERENCES users(id) ON DELETE SET NULL,
    action text NOT NULL,
    target text NOT NULL,
    detail jsonb,
    at timestamp with time zone DEFAULT now()
);

-- Seed basic komisi based on the spec
INSERT INTO komisi (id, name, min_age, max_age) VALUES
('sekolah-minggu', 'Sekolah Minggu', 0, 12),
('teens', 'Teens', 13, 17),
('vessel', 'Vessel', 18, 30),
('wbi', 'WBI', NULL, NULL),
('kompas', 'Kompas', NULL, NULL),
('kowari', 'Kowari', NULL, NULL),
('koemas', 'Koemas', NULL, NULL)
ON CONFLICT (id) DO NOTHING;
