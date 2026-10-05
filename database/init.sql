-- 1. Moderators Table
CREATE TABLE IF NOT EXISTS moderators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE,
    password TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Reports Table
CREATE TABLE IF NOT EXISTS reports (
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
CREATE TABLE IF NOT EXISTS status_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID REFERENCES reports(id),
    status TEXT,
    note TEXT,
    moderator_id UUID REFERENCES moderators(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- ==========================================
-- HIGH-PERFORMANCE PRODUCTION INDEXES
-- ==========================================

-- Fast O(1) Case Code Lookups for Whistleblowers
CREATE INDEX IF NOT EXISTS idx_reports_case_code ON reports(case_code);

-- Compound Index for Filtered & Sorted Moderator Lists (Status + Date)
CREATE INDEX IF NOT EXISTS idx_reports_status_created ON reports(status, created_at DESC);

-- Compound Index for Category Filtered Queries
CREATE INDEX IF NOT EXISTS idx_reports_category_created ON reports(category, created_at DESC);

-- Fast Lookups for Audit Logs per Report
CREATE INDEX IF NOT EXISTS idx_status_updates_report_id ON status_updates(report_id, created_at DESC);
