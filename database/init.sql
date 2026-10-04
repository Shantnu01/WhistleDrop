-- 1. Moderators Table
CREATE TABLE moderators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE,
    password TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Reports Table
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_code TEXT UNIQUE,
    category TEXT,
    description TEXT,
    evidence_url TEXT,
    status TEXT DEFAULT 'SUBMITTED',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. Status Updates Table
CREATE TABLE status_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID REFERENCES reports(id),
    status TEXT,
    note TEXT,
    moderator_id UUID REFERENCES moderators(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Make searching by case code fast
CREATE INDEX idx_reports_case_code ON reports(case_code);
