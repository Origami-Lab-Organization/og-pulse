-- Adicionar campo de data de nascimento (nullable para registros existentes)
ALTER TABLE public.employees ADD COLUMN data_nascimento date;

-- Adicionar campo de URL da foto (opcional)
ALTER TABLE public.employees ADD COLUMN foto_url text;

-- Criar bucket de storage para fotos de funcionarios
INSERT INTO storage.buckets (id, name, public) VALUES ('employee-photos', 'employee-photos', true);

-- Politica para upload de fotos (admins do tenant)
CREATE POLICY "Admins can upload employee photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'employee-photos' AND
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- Politica para visualizar fotos (todos podem ver - bucket publico)
CREATE POLICY "Users can view employee photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'employee-photos');

-- Politica para deletar fotos (admins)
CREATE POLICY "Admins can delete employee photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'employee-photos' AND
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- Politica para atualizar fotos (admins)
CREATE POLICY "Admins can update employee photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'employee-photos' AND
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);