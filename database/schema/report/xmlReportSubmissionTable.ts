export const createXmlReportSubmissionTable = `
  CREATE TABLE IF NOT EXISTS xml_report_submission (
    id BIGSERIAL PRIMARY KEY,
    ticket_number INTEGER NOT NULL REFERENCES ticket(ticket_number),
    ticket_type TEXT NOT NULL CHECK (ticket_type IN ('Pawn', 'Buy')),
    ticket_datetime TEXT NOT NULL,
    environment TEXT NOT NULL CHECK (environment IN ('sandbox', 'production')),
    status TEXT NOT NULL CHECK (status IN ('submitted', 'failed')),
    attempt_count INTEGER NOT NULL DEFAULT 1 CHECK (attempt_count > 0),
    error_code INTEGER,
    message TEXT NOT NULL DEFAULT '',
    submitted_at TIMESTAMPTZ,
    last_attempt_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (ticket_number, ticket_type, ticket_datetime, environment)
  );
`;

export const createXmlReportSubmissionIndexes = `
  CREATE INDEX IF NOT EXISTS idx_xml_report_submission_status
  ON xml_report_submission(environment, status, last_attempt_at);
`;
