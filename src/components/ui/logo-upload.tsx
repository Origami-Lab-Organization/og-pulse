import { useState, useRef } from 'react';
import { Building2, Camera, Loader2, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface LogoUploadProps {
  currentLogoUrl?: string | null;
  onLogoChange: (url: string | null) => void;
  entityType: 'client' | 'supplier';
  entityId?: string;
  disabled?: boolean;
  className?: string;
}

export const LogoUpload = ({
  currentLogoUrl,
  onLogoChange,
  entityType,
  entityId,
  disabled = false,
  className,
}: LogoUploadProps) => {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentLogoUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Formato inválido',
        description: 'Por favor, selecione uma imagem (PNG, JPG, etc.).',
        variant: 'destructive',
      });
      return;
    }

    // Validar tamanho (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Arquivo muito grande',
        description: 'A imagem deve ter no máximo 5MB.',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);

    try {
      // Criar preview local
      const localPreview = URL.createObjectURL(file);
      setPreviewUrl(localPreview);

      // Gerar nome único para o arquivo
      const fileExt = file.name.split('.').pop();
      const fileName = `${entityType}-${entityId || 'new'}-${Date.now()}.${fileExt}`;
      const filePath = `${entityType}s/${fileName}`;

      // Upload para o storage
      const { error: uploadError } = await supabase.storage
        .from('company-logos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('company-logos')
        .getPublicUrl(filePath);

      onLogoChange(publicUrl);
      setPreviewUrl(publicUrl);

      toast({
        title: 'Logo enviada',
        description: 'A logo foi carregada com sucesso.',
      });
    } catch (error) {
      console.error('Error uploading logo:', error);
      setPreviewUrl(currentLogoUrl || null);
      toast({
        title: 'Erro ao enviar logo',
        description: 'Não foi possível enviar a imagem. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveLogo = async () => {
    if (currentLogoUrl) {
      try {
        // Extrair o path do arquivo da URL
        const urlParts = currentLogoUrl.split('/company-logos/');
        if (urlParts[1]) {
          await supabase.storage
            .from('company-logos')
            .remove([urlParts[1]]);
        }
      } catch (error) {
        console.error('Error removing logo from storage:', error);
      }
    }
    
    setPreviewUrl(null);
    onLogoChange(null);
  };

  const handleClick = () => {
    if (!disabled && !isUploading) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className={cn('flex items-center gap-4', className)}>
      <div className="relative group">
        <div
          onClick={handleClick}
          className={cn(
            'relative w-20 h-20 rounded-lg border-2 border-dashed flex items-center justify-center overflow-hidden transition-all',
            disabled || isUploading
              ? 'cursor-not-allowed opacity-50'
              : 'cursor-pointer hover:border-primary/50 hover:bg-muted/50',
            previewUrl ? 'border-solid border-muted' : 'border-muted-foreground/25'
          )}
        >
          {isUploading ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : previewUrl ? (
            <img
              src={previewUrl}
              alt="Logo"
              className="w-full h-full object-contain"
            />
          ) : (
            <Building2 className="h-8 w-8 text-muted-foreground/50" />
          )}

          {/* Overlay de hover */}
          {!disabled && !isUploading && (
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera className="h-5 w-5 text-white" />
            </div>
          )}
        </div>

        {/* Botão de remover */}
        {previewUrl && !disabled && !isUploading && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleRemoveLogo();
            }}
            className="absolute -top-2 -right-2 p-1 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>

      <div className="flex-1 text-sm">
        <p className="font-medium">Logo da Empresa</p>
        <p className="text-muted-foreground text-xs">
          {previewUrl ? 'Clique para alterar' : 'Clique para adicionar'}
        </p>
        <p className="text-muted-foreground text-xs">PNG, JPG até 5MB</p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || isUploading}
      />
    </div>
  );
};
