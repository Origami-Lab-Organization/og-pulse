import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	upload: vi.fn(),
	remove: vi.fn(),
	persist: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
	supabase: {
		storage: {
			from: () => ({
				upload: mocks.upload,
				remove: mocks.remove,
			}),
		},
		rpc: mocks.persist,
	},
}));

import { projectContractService } from "@/services/projectContractService";

const file = new File(["%PDF-1"], "contrato.pdf", {
	type: "application/pdf",
});

describe("projectContractService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.stubGlobal("crypto", { randomUUID: () => "arquivo-id" });
		mocks.upload.mockResolvedValue({ error: null });
		mocks.remove.mockResolvedValue({ error: null });
		mocks.persist.mockResolvedValue({ data: "file-1", error: null });
	});

	it("persiste metadados e referencia do projeto apos o upload", async () => {
		await expect(
			projectContractService.upload({
				file,
				projectId: "project-1",
				tenantId: "tenant-1",
			}),
		).resolves.toBe("tenant-1/project-1/arquivo-id.pdf");

		expect(mocks.remove).not.toHaveBeenCalled();
	});

	it("remove o arquivo quando a persistencia transacional falha", async () => {
		mocks.persist.mockResolvedValue({
			data: null,
			error: new Error("persistencia"),
		});

		await expect(
			projectContractService.upload({
				file,
				projectId: "project-1",
				tenantId: "tenant-1",
			}),
		).rejects.toThrow("persistencia");

		expect(mocks.remove).toHaveBeenCalledWith([
			"tenant-1/project-1/arquivo-id.pdf",
		]);
	});
});
