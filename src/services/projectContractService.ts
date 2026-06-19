import { supabase } from "@/integrations/supabase/client";
import { createContractStoragePath } from "@/lib/projectContract";

const CONTRACTS_BUCKET = "project-contracts";

interface UploadProjectContractInput {
	file: File;
	projectId: string;
	tenantId: string;
}

async function removeUploadedFile(storagePath: string) {
	await supabase.storage.from(CONTRACTS_BUCKET).remove([storagePath]);
}

export const projectContractService = {
	async upload({
		file,
		projectId,
		tenantId,
	}: UploadProjectContractInput): Promise<string> {
		const storagePath = createContractStoragePath(tenantId, projectId);
		const { error: uploadError } = await supabase.storage
			.from(CONTRACTS_BUCKET)
			.upload(storagePath, file, { contentType: "application/pdf" });

		if (uploadError) throw uploadError;

		const { error: persistError } = await supabase.rpc("attach_project_contract", {
			p_tenant_id: tenantId,
			p_project_id: projectId,
			p_file_name: file.name,
			p_file_size: file.size,
			p_storage_path: storagePath,
		});

		if (persistError) {
			await removeUploadedFile(storagePath);
			throw persistError;
		}

		return storagePath;
	},

	async createDownloadUrl(storagePath: string): Promise<string> {
		const { data, error } = await supabase.storage
			.from(CONTRACTS_BUCKET)
			.createSignedUrl(storagePath, 60);

		if (error) throw error;
		return data.signedUrl;
	},
};
