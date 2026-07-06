import { ExternalLink, FileText, Loader2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
	getContractValidationMessage,
	validateContractFile,
} from "@/lib/projectContract";
import { projectContractService } from "@/services/projectContractService";

interface ProjectContractUploadProps {
	projectId: string;
	currentPath?: string | null;
	isReadOnly?: boolean;
	compact?: boolean;
	onSkip?: () => void;
	onUploadSuccess?: (storagePath: string) => void;
}

export function ProjectContractUpload({
	projectId,
	currentPath,
	isReadOnly = false,
	compact = false,
	onSkip,
	onUploadSuccess,
}: ProjectContractUploadProps) {
	const inputRef = useRef<HTMLInputElement>(null);
	const [isUploading, setIsUploading] = useState(false);
	const [isOpening, setIsOpening] = useState(false);
	const { employee } = useAuth();
	const { toast } = useToast();

	const handleFile = async (file: File) => {
		const validationError = await validateContractFile(file);
		if (validationError) {
			toast({
				title: "Contrato não enviado",
				description: getContractValidationMessage(validationError),
				variant: "destructive",
			});
			return;
		}

		if (!employee?.tenant_id) {
			toast({
				title: "Contrato não enviado",
				description: "Não foi possível identificar o tenant atual.",
				variant: "destructive",
			});
			return;
		}

		setIsUploading(true);
		try {
			const storagePath = await projectContractService.upload({
				file,
				projectId,
				tenantId: employee.tenant_id,
			});
			onUploadSuccess?.(storagePath);
			toast({ title: "Contrato anexado com sucesso." });
		} catch {
			toast({
				title: "Erro ao enviar contrato",
				description: "Tente novamente ou pule por enquanto.",
				variant: "destructive",
			});
		} finally {
			setIsUploading(false);
		}
	};

	const handleOpen = async () => {
		if (!currentPath) return;
		setIsOpening(true);
		try {
			const signedUrl = await projectContractService.createDownloadUrl(currentPath);
			window.open(signedUrl, "_blank", "noopener,noreferrer");
		} catch {
			toast({
				title: "Não foi possível abrir o contrato",
				description: "Tente novamente em instantes.",
				variant: "destructive",
			});
		} finally {
			setIsOpening(false);
		}
	};

	const content = (
		<div className="space-y-4">
			<input
				ref={inputRef}
				type="file"
				accept="application/pdf,.pdf"
				className="sr-only"
				onChange={(event) => {
					const file = event.target.files?.[0];
					if (file) void handleFile(file);
					event.target.value = "";
				}}
			/>

			{currentPath ? (
				<div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-4 sm:flex-row sm:items-center">
					<FileText className="h-5 w-5 shrink-0 text-primary" />
					<div className="min-w-0 flex-1">
						<p className="text-sm font-medium">Contrato assinado</p>
						<p className="text-xs text-muted-foreground">PDF armazenado com acesso privado</p>
					</div>
					<Button variant="outline" onClick={() => void handleOpen()} disabled={isOpening}>
						{isOpening ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ExternalLink className="mr-2 h-4 w-4" />}
						Abrir contrato
					</Button>
				</div>
			) : isReadOnly ? (
				<p className="text-sm text-muted-foreground">Nenhum contrato anexado.</p>
			) : (
				<>
					{!compact && (
						<p className="text-sm text-muted-foreground">
							Adicione o contrato assinado em PDF. O limite é 10MB.
						</p>
					)}
					<div className="grid gap-3 sm:grid-cols-2">
						<Button
							variant="outline"
							onClick={() => inputRef.current?.click()}
							disabled={isUploading}
						>
							{isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
							{isUploading ? "Enviando..." : "Fazer upload"}
						</Button>
						{onSkip && (
							<Button variant="outline" onClick={onSkip} disabled={isUploading}>
								Pular por enquanto
							</Button>
						)}
					</div>
				</>
			)}
		</div>
	);

	if (compact) return content;

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2 text-base">
					<FileText className="h-4 w-4" />
					Contrato
				</CardTitle>
			</CardHeader>
			<CardContent>{content}</CardContent>
		</Card>
	);
}
