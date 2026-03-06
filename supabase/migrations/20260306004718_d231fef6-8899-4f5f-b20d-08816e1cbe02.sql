-- Add new values to the termination_document_type enum
ALTER TYPE termination_document_type ADD VALUE IF NOT EXISTS 'medical_exam';
ALTER TYPE termination_document_type ADD VALUE IF NOT EXISTS 'final_report';
ALTER TYPE termination_document_type ADD VALUE IF NOT EXISTS 'performance_eval';
ALTER TYPE termination_document_type ADD VALUE IF NOT EXISTS 'contract_termination';
ALTER TYPE termination_document_type ADD VALUE IF NOT EXISTS 'quitacao';
ALTER TYPE termination_document_type ADD VALUE IF NOT EXISTS 'contract_amendment';
ALTER TYPE termination_document_type ADD VALUE IF NOT EXISTS 'meeting_minutes';
ALTER TYPE termination_document_type ADD VALUE IF NOT EXISTS 'quota_transfer';
ALTER TYPE termination_document_type ADD VALUE IF NOT EXISTS 'activity_report';