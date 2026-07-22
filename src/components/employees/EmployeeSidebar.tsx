import { useRef, useState } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImageCropDialog } from "@/components/ui/image-crop-dialog";
import { EmployeeCostSummaryCard } from "@/components/employees/EmployeeCostSummaryCard";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { CostBreakdown } from "@/lib/employeeCostCalculator";
import { ContractType } from "@/types/employee";

interface EmployeeSidebarProps {
  nome: string;
  cargo?: string;
  fotoUrl: string | null | undefined;
  onFotoChange: (url: string) => void;
  costBreakdown: CostBreakdown | null;
  tipoContratacao: ContractType;
  className?: string;
}

export function EmployeeSidebar({
  nome,
  cargo,
  fotoUrl,
  onFotoChange,
  costBreakdown,
  tipoContratacao,
  className,
}: EmployeeSidebarProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [tempImageSrc, setTempImageSrc] = useState<string | null>(null);

  const handlePhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Erro",
        description: "Apenas imagens são permitidas",
        variant: "destructive",
      });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Erro",
        description: "A imagem deve ter no máximo 5MB",
        variant: "destructive",
      });
      return;
    }
    const imageUrl = URL.createObjectURL(file);
    setTempImageSrc(imageUrl);
    setCropDialogOpen(true);
    event.target.value = "";
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    setUploadingPhoto(true);
    try {
      const fileName = `${Date.now()}-avatar.jpg`;
      const { data, error } = await supabase.storage
        .from("employee-photos")
        .upload(fileName, croppedBlob, { contentType: "image/jpeg" });
      if (error) {
        toast({
          title: "Erro",
          description: "Falha ao enviar foto",
          variant: "destructive",
        });
        return;
      }
      const { data: urlData } = supabase.storage
        .from("employee-photos")
        .getPublicUrl(data.path);
      onFotoChange(urlData.publicUrl);
    } catch {
      toast({
        title: "Erro",
        description: "Falha ao enviar foto",
        variant: "destructive",
      });
    } finally {
      setUploadingPhoto(false);
      if (tempImageSrc) {
        URL.revokeObjectURL(tempImageSrc);
        setTempImageSrc(null);
      }
    }
  };

  const handleRemovePhoto = () => {
    onFotoChange("");
  };

  return (
    <aside className={cn("w-full space-y-4 lg:sticky lg:top-4 lg:w-[250px] lg:shrink-0 lg:self-start", className)}>
      <div className="relative h-[220px] w-full overflow-hidden rounded-xl">
        {fotoUrl ? (
          <div className="group relative h-full w-full">
            <button
              type="button"
              className="h-full w-full"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto}
              aria-label="Alterar foto"
            >
              <img src={fotoUrl} alt="Foto do funcionário" className="h-full w-full object-cover" />
            </button>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/55 opacity-0 transition-opacity group-hover:opacity-100">
              <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-white/95 text-primary">
                <Pencil className="h-3.5 w-3.5" />
              </span>
              <span className="text-xs font-semibold text-white">Alterar Foto</span>
            </div>
            <button
              type="button"
              onClick={handleRemovePhoto}
              disabled={uploadingPhoto}
              aria-label="Remover foto"
              className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
            {uploadingPhoto && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <Loader2 className="h-6 w-6 animate-spin text-white" />
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-xl border-[1.5px] border-dashed border-input bg-muted/40 px-3">
            <span className="flex h-[34px] w-[34px] items-center justify-center rounded-full border-[1.5px] border-muted-foreground text-muted-foreground">
              <Plus className="h-4 w-4" />
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto}
            >
              {uploadingPhoto && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Adicionar Foto
            </Button>
            <span className="text-center text-[11px] text-muted-foreground">
              PNG ou JPG, máx. 5MB
            </span>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handlePhotoSelect}
        />
      </div>

      {tempImageSrc && (
        <ImageCropDialog
          open={cropDialogOpen}
          onOpenChange={setCropDialogOpen}
          imageSrc={tempImageSrc}
          onCropComplete={handleCropComplete}
        />
      )}

      <div className="text-center">
        <div className="text-sm font-bold">{nome}</div>
        {cargo && <div className="text-xs text-muted-foreground">{cargo}</div>}
      </div>

      <EmployeeCostSummaryCard costBreakdown={costBreakdown} tipoContratacao={tipoContratacao} />
    </aside>
  );
}
