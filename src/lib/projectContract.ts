export const CONTRACT_MAX_SIZE_BYTES = 10 * 1024 * 1024;
export const CONTRACT_MIME_TYPE = "application/pdf";

export type ContractValidationError =
	| "invalid-type"
	| "too-large"
	| "invalid-pdf";

function readFileSignature(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			const bytes = new Uint8Array(reader.result as ArrayBuffer);
			resolve(String.fromCharCode(...bytes));
		};
		reader.onerror = () => reject(reader.error);
		reader.readAsArrayBuffer(file.slice(0, 5));
	});
}

export async function validateContractFile(
	file: File,
): Promise<ContractValidationError | null> {
	if (file.type !== CONTRACT_MIME_TYPE || !file.name.toLowerCase().endsWith(".pdf")) {
		return "invalid-type";
	}

	if (file.size > CONTRACT_MAX_SIZE_BYTES) return "too-large";

	let signature: string;
	try {
		signature = await readFileSignature(file);
	} catch {
		return "invalid-pdf";
	}

	const isPdf = signature === "%PDF-";
	return isPdf ? null : "invalid-pdf";
}

export function getContractValidationMessage(
	error: ContractValidationError,
): string {
	const messages: Record<ContractValidationError, string> = {
		"invalid-type": "Selecione um arquivo PDF.",
		"too-large": "O contrato deve ter no máximo 10MB.",
		"invalid-pdf": "O arquivo não parece ser um PDF válido.",
	};

	return messages[error];
}

export function createContractStoragePath(
	tenantId: string,
	projectId: string,
): string {
	return `${tenantId}/${projectId}/${crypto.randomUUID()}.pdf`;
}
