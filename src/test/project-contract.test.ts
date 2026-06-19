import { describe, expect, it, vi } from "vitest";
import {
	CONTRACT_MAX_SIZE_BYTES,
	createContractStoragePath,
	getContractValidationMessage,
	validateContractFile,
} from "@/lib/projectContract";

function makePdf(name = "contrato.pdf", size?: number) {
	const content = new Uint8Array(size ?? 8);
	content.set(new TextEncoder().encode("%PDF-"));
	return new File([content], name, { type: "application/pdf" });
}

describe("projectContract", () => {
	it("aceita PDF com assinatura valida dentro do limite", async () => {
		expect(await validateContractFile(makePdf())).toBeNull();
	});

	it("rejeita tipo diferente de PDF antes do upload", async () => {
		const file = new File(["conteudo"], "contrato.txt", { type: "text/plain" });
		expect(await validateContractFile(file)).toBe("invalid-type");
	});

	it("rejeita arquivo acima de 10MB", async () => {
		expect(
			await validateContractFile(makePdf("contrato.pdf", CONTRACT_MAX_SIZE_BYTES + 1)),
		).toBe("too-large");
	});

	it("rejeita PDF sem assinatura esperada", async () => {
		const file = new File(["nao-e-pdf"], "contrato.pdf", {
			type: "application/pdf",
		});
		expect(await validateContractFile(file)).toBe("invalid-pdf");
		expect(getContractValidationMessage("invalid-pdf")).toMatch(/PDF válido/);
	});

	it("cria path isolado por tenant e projeto", () => {
		vi.stubGlobal("crypto", { randomUUID: () => "arquivo-id" });
		expect(createContractStoragePath("tenant-1", "project-1")).toBe(
			"tenant-1/project-1/arquivo-id.pdf",
		);
		vi.unstubAllGlobals();
	});
});
