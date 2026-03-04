import { supabase } from '@/integrations/supabase/client';
import {
  EmployeeTermination,
  TerminationDocument,
  PayrollAdjustment,
  EmployeeTerminationFormData,
  PayrollAdjustmentFormData,
  TerminationStatus,
  TerminationType,
  TerminationDocumentType,
} from '@/types/termination';

// ─── Terminations ───────────────────────────────────────────────

export interface TerminationFilters {
  status?: TerminationStatus;
  termination_type?: TerminationType;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}

export interface TerminationWithEmployee extends EmployeeTermination {
  employees: {
    id: string;
    nome: string;
    cargo: string;
    email: string;
    tipo_contratacao: string;
    foto_url: string | null;
  };
}

export interface TerminationDetail extends TerminationWithEmployee {
  termination_documents: TerminationDocument[];
  payroll_adjustments: PayrollAdjustment[];
}

export const terminationService = {
  // 1. POST - Iniciar processo de desligamento
  async create(
    data: EmployeeTerminationFormData,
    createdBy?: string
  ): Promise<EmployeeTermination> {
    // Insert termination record
    const { data: termination, error } = await supabase
      .from('employee_terminations')
      .insert({
        employee_id: data.employee_id,
        termination_date: data.termination_date,
        notification_date: data.notification_date || null,
        termination_type: data.termination_type,
        reason: data.reason || null,
        reason_category: data.reason_category,
        notice_period_days: data.notice_period_days,
        notice_worked: data.notice_worked,
        exit_interview_completed: data.exit_interview_completed,
        exit_interview_notes: data.exit_interview_notes || null,
        status: data.status || 'pending',
        created_by: createdBy || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar desligamento:', error);
      throw new Error('Falha ao iniciar processo de desligamento');
    }

    // Update employee status to 'desligado' and link termination
    const { error: empError } = await supabase
      .from('employees')
      .update({
        status: 'desligado',
        termination_id: termination.id,
      })
      .eq('id', data.employee_id);

    if (empError) {
      console.error('Erro ao atualizar status do funcionário:', empError);
      // Don't throw - termination was created successfully
    }

    return termination as unknown as EmployeeTermination;
  },

  // 2. GET - Listar todos os desligamentos com filtros e paginação
  async getAll(filters: TerminationFilters = {}): Promise<{
    data: TerminationWithEmployee[];
    count: number;
  }> {
    const { status, termination_type, date_from, date_to, limit = 20, offset = 0 } = filters;

    let query = supabase
      .from('employee_terminations')
      .select(
        '*, employees!inner(id, nome, cargo, email, tipo_contratacao, foto_url)',
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }
    if (termination_type) {
      query = query.eq('termination_type', termination_type);
    }
    if (date_from) {
      query = query.gte('termination_date', date_from);
    }
    if (date_to) {
      query = query.lte('termination_date', date_to);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Erro ao listar desligamentos:', error);
      throw new Error('Falha ao buscar lista de desligamentos');
    }

    return {
      data: (data || []) as unknown as TerminationWithEmployee[],
      count: count || 0,
    };
  },

  // 3. GET :id - Detalhes completos de um desligamento
  async getById(id: string): Promise<TerminationDetail | null> {
    const { data, error } = await supabase
      .from('employee_terminations')
      .select(
        '*, employees!inner(id, nome, cargo, email, tipo_contratacao, foto_url), termination_documents(*), payroll_adjustments(*)'
      )
      .eq('id', id)
      .single();

    if (error) {
      console.error('Erro ao buscar desligamento:', error);
      return null;
    }

    return data as unknown as TerminationDetail;
  },

  // 4. PUT :id - Atualizar desligamento
  async update(
    id: string,
    updates: Partial<EmployeeTerminationFormData>
  ): Promise<EmployeeTermination> {
    const dbUpdates: Record<string, unknown> = {};

    if (updates.termination_date !== undefined) dbUpdates.termination_date = updates.termination_date;
    if (updates.notification_date !== undefined) dbUpdates.notification_date = updates.notification_date;
    if (updates.termination_type !== undefined) dbUpdates.termination_type = updates.termination_type;
    if (updates.reason !== undefined) dbUpdates.reason = updates.reason;
    if (updates.reason_category !== undefined) dbUpdates.reason_category = updates.reason_category;
    if (updates.notice_period_days !== undefined) dbUpdates.notice_period_days = updates.notice_period_days;
    if (updates.notice_worked !== undefined) dbUpdates.notice_worked = updates.notice_worked;
    if (updates.exit_interview_completed !== undefined) dbUpdates.exit_interview_completed = updates.exit_interview_completed;
    if (updates.exit_interview_notes !== undefined) dbUpdates.exit_interview_notes = updates.exit_interview_notes;
    if (updates.status !== undefined) dbUpdates.status = updates.status;

    const { data, error } = await supabase
      .from('employee_terminations')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar desligamento:', error);
      throw new Error('Falha ao atualizar processo de desligamento');
    }

    return data as unknown as EmployeeTermination;
  },

  // 5. DELETE :id - Cancelar desligamento (apenas se pendente)
  async cancel(id: string): Promise<void> {
    // Fetch to check status and get employee_id
    const { data: termination, error: fetchError } = await supabase
      .from('employee_terminations')
      .select('status, employee_id')
      .eq('id', id)
      .single();

    if (fetchError || !termination) {
      throw new Error('Desligamento não encontrado');
    }

    if (termination.status !== 'pending') {
      throw new Error('Apenas desligamentos com status "Pendente" podem ser cancelados');
    }

    // Update termination status to cancelled
    const { error: updateError } = await supabase
      .from('employee_terminations')
      .update({ status: 'cancelled' })
      .eq('id', id);

    if (updateError) {
      throw new Error('Falha ao cancelar desligamento');
    }

    // Revert employee status
    const { error: empError } = await supabase
      .from('employees')
      .update({ status: 'ativo', termination_id: null })
      .eq('id', termination.employee_id);

    if (empError) {
      console.error('Erro ao reverter status do funcionário:', empError);
    }
  },

  // ─── Documents ──────────────────────────────────────────────

  // 6. POST - Upload de documento
  async addDocument(
    terminationId: string,
    file: File,
    documentType: TerminationDocumentType,
    uploadedBy?: string
  ): Promise<TerminationDocument> {
    // Validate file
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
    ];

    if (!allowedTypes.includes(file.type)) {
      throw new Error('Tipo de arquivo não permitido. Aceitos: PDF, DOC, DOCX, JPG, PNG');
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new Error('Arquivo excede o limite de 10MB');
    }

    // Upload to storage
    const fileName = `${terminationId}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from('termination-documents')
      .upload(fileName, file);

    if (uploadError) {
      console.error('Erro no upload:', uploadError);
      throw new Error('Falha ao fazer upload do documento');
    }

    const { data: urlData } = supabase.storage
      .from('termination-documents')
      .getPublicUrl(fileName);

    // Insert record
    const { data, error } = await supabase
      .from('termination_documents')
      .insert({
        termination_id: terminationId,
        document_name: file.name,
        document_type: documentType,
        file_url: urlData.publicUrl,
        file_size: file.size,
        mime_type: file.type,
        uploaded_by: uploadedBy || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao registrar documento:', error);
      throw new Error('Falha ao registrar documento');
    }

    return data as unknown as TerminationDocument;
  },

  // 7. GET - Listar documentos
  async getDocuments(terminationId: string): Promise<TerminationDocument[]> {
    const { data, error } = await supabase
      .from('termination_documents')
      .select('*')
      .eq('termination_id', terminationId)
      .order('uploaded_at', { ascending: false });

    if (error) {
      console.error('Erro ao listar documentos:', error);
      throw new Error('Falha ao buscar documentos');
    }

    return (data || []) as unknown as TerminationDocument[];
  },

  // 8. DELETE - Remover documento
  async deleteDocument(docId: string): Promise<void> {
    const { error } = await supabase
      .from('termination_documents')
      .delete()
      .eq('id', docId);

    if (error) {
      console.error('Erro ao remover documento:', error);
      throw new Error('Falha ao remover documento');
    }
  },

  // ─── Payroll Adjustments ─────────────────────────────────────

  // 9. POST - Adicionar ajuste de folha
  async addPayrollAdjustment(
    data: PayrollAdjustmentFormData
  ): Promise<PayrollAdjustment> {
    const { data: adjustment, error } = await supabase
      .from('payroll_adjustments')
      .insert({
        termination_id: data.termination_id,
        adjustment_type: data.adjustment_type,
        description: data.description || null,
        amount: data.amount,
        is_credit: data.is_credit,
        calculation_details: data.calculation_details || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao adicionar ajuste:', error);
      throw new Error('Falha ao adicionar ajuste de folha');
    }

    return adjustment as unknown as PayrollAdjustment;
  },

  // 10. GET - Listar ajustes com totais
  async getPayrollAdjustments(terminationId: string): Promise<{
    adjustments: PayrollAdjustment[];
    totalCredits: number;
    totalDebits: number;
    balance: number;
  }> {
    const { data, error } = await supabase
      .from('payroll_adjustments')
      .select('*')
      .eq('termination_id', terminationId)
      .order('created_at');

    if (error) {
      console.error('Erro ao listar ajustes:', error);
      throw new Error('Falha ao buscar ajustes de folha');
    }

    const adjustments = (data || []) as unknown as PayrollAdjustment[];

    const totalCredits = adjustments
      .filter((a) => a.is_credit)
      .reduce((sum, a) => sum + Number(a.amount), 0);

    const totalDebits = adjustments
      .filter((a) => !a.is_credit)
      .reduce((sum, a) => sum + Number(a.amount), 0);

    return {
      adjustments,
      totalCredits,
      totalDebits,
      balance: totalCredits - totalDebits,
    };
  },

  // 11. PUT - Editar ajuste
  async updatePayrollAdjustment(
    adjustmentId: string,
    updates: Partial<PayrollAdjustmentFormData>
  ): Promise<PayrollAdjustment> {
    const dbUpdates: Record<string, unknown> = {};

    if (updates.adjustment_type !== undefined) dbUpdates.adjustment_type = updates.adjustment_type;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
    if (updates.is_credit !== undefined) dbUpdates.is_credit = updates.is_credit;
    if (updates.calculation_details !== undefined) dbUpdates.calculation_details = updates.calculation_details;

    const { data, error } = await supabase
      .from('payroll_adjustments')
      .update(dbUpdates)
      .eq('id', adjustmentId)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar ajuste:', error);
      throw new Error('Falha ao atualizar ajuste de folha');
    }

    return data as unknown as PayrollAdjustment;
  },

  // 12. DELETE - Remover ajuste
  async deletePayrollAdjustment(adjustmentId: string): Promise<void> {
    const { error } = await supabase
      .from('payroll_adjustments')
      .delete()
      .eq('id', adjustmentId);

    if (error) {
      console.error('Erro ao remover ajuste:', error);
      throw new Error('Falha ao remover ajuste de folha');
    }
  },
};
