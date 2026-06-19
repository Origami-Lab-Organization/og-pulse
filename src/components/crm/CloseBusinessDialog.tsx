import { zodResolver } from "@hookform/resolvers/zod";
import confetti from "canvas-confetti";
import { addMonths, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
	AlertTriangle,
	Briefcase,
	Building2,
	Calendar,
	DollarSign,
	Eye,
	Lock,
	type LucideIcon,
	RefreshCw,
	Sparkles,
	Target,
	Trophy,
	User,
	Wand2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useClients } from "@/hooks/useClients";
import { useEmployees } from "@/hooks/useEmployees";
import {
	type CloseBusinessInstallment,
	calculateCloseBusinessTotal,
	createInstallmentSchedule,
	distributeInstallmentsEqually,
	getNextRecurringCharges,
	resizeInstallmentSchedule,
} from "@/lib/closeBusinessFinancials";
import {
	formatCurrency as formatCurrencyValue,
	formatDate,
} from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { BudgetWithDetails } from "@/types/budget";
import type { LeadWithBudget } from "@/types/lead";
import {
	PAYMENT_METHOD_OPTIONS,
	PROJECT_TYPE_DESCRIPTIONS,
	PROJECT_TYPE_LABELS,
	type ProjectDB,
	type ProjectType,
} from "@/types/project";
import type { Service } from "@/types/service";
import { ProjectContractUpload } from "@/components/projects/ProjectContractUpload";

const PROJECT_TYPE_ICONS: Record<ProjectType, LucideIcon> = {
	fixed_scope: Target,
	continuous: RefreshCw,
	success_fee: Trophy,
	non_revenue: Eye,
};

const installmentSchema = z.object({
	installmentNumber: z.number().min(1),
	invoiceDate: z.string().optional().default(""),
	dueDate: z.string().min(1, "Vencimento é obrigatório"),
	value: z.coerce.number().min(0, "Valor não pode ser negativo"),
});

const closeBusinessSchema = z
	.object({
		projectType: z
			.enum(["fixed_scope", "continuous", "success_fee", "non_revenue"])
			.default("fixed_scope"),
		managerId: z.string().min(1, "Gerente é obrigatório"),
		paymentMethod: z.string().default("mensal"),
		installmentsCount: z.coerce.number().min(1).default(1),
		dueDay: z.coerce.number().min(1).max(31).default(10),
		dueDate: z.string().optional().default(""),
		firstInvoiceDate: z.string().optional().default(""),
		startDate: z.string().min(1, "Data de início é obrigatória"),
		endDate: z.string().optional().default(""),
		renewalDate: z.string().optional().default(""),
		successFeePercent: z.coerce.number().min(0).max(100).optional(),
		installments: z.array(installmentSchema).default([]),
		projectName: z.string().optional(),
		clientId: z.string().optional(),
		totalValue: z.coerce.number().optional(),
		monthlyValue: z.coerce.number().optional(),
	})
	.superRefine((data, ctx) => {
		if (data.projectType === "success_fee" && !data.successFeePercent) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "% de Sucesso é obrigatória para projetos de taxa de sucesso",
				path: ["successFeePercent"],
			});
		}

		if (data.projectType === "continuous" && !data.renewalDate) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message:
					"Data de renovação é necessária para gerar as parcelas mensais",
				path: ["renewalDate"],
			});
		}

		if (data.projectType === "fixed_scope" && data.installments.length === 0) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "Defina ao menos uma parcela",
				path: ["installments"],
			});
		}
	});

export type CloseBusinessFormValues = z.infer<typeof closeBusinessSchema>;

interface CloseBusinessDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	budget: BudgetWithDetails | null;
	lead?: LeadWithBudget | null;
	onConfirm: (
		data: CloseBusinessFormValues,
	) => Promise<ProjectDB | void> | ProjectDB | void;
	onClosed?: (projectId: string) => void;
	isSubmitting?: boolean;
	services?: Service[];
}

function getClientName(
	budget: BudgetWithDetails | null,
	lead?: LeadWithBudget | null,
): string {
	return (
		budget?.client?.company_name ||
		lead?.company_name ||
		lead?.name ||
		"Cliente"
	);
}

function getBaseValue(
	projectType: ProjectType,
	budget: BudgetWithDetails | null,
	lead?: LeadWithBudget | null,
): number {
	if (projectType === "non_revenue") return 0;
	return budget?.final_total ?? lead?.estimated_value ?? 0;
}

function normalizeInstallments(
	installments: CloseBusinessFormValues["installments"] | undefined,
): CloseBusinessInstallment[] {
	return (installments ?? []).map((installment, index) => ({
		installmentNumber: installment.installmentNumber ?? index + 1,
		invoiceDate: installment.invoiceDate ?? "",
		dueDate: installment.dueDate ?? "",
		value: installment.value ?? 0,
	}));
}

export function CloseBusinessDialog({
	open,
	onOpenChange,
	budget,
	lead,
	onConfirm,
	onClosed,
	isSubmitting,
	services = [],
}: CloseBusinessDialogProps) {
	const { data: employees = [] } = useEmployees();
	const { data: clients = [] } = useClients();

	const hasBudget = !!budget;
	const budgetMissingClient = hasBudget && !budget?.client_id;
	const needsClientField = !hasBudget || budgetMissingClient;

	const [suggestedManagerId, setSuggestedManagerId] = useState<string>("");
	const [celebration, setCelebration] = useState<{
		projectId?: string;
		clientName: string;
		projectName: string;
		valueLabel: string;
	} | null>(null);

	const managers = useMemo(() => {
		return employees.filter(
			(employee) =>
				employee.systemRole === "manager" || employee.systemRole === "admin",
		);
	}, [employees]);

	const derivedProjectType = useMemo((): ProjectType => {
		if (!lead?.service_line || !services.length) return "fixed_scope";

		const billingType = services.find(
			(service) => service.id === lead.service_line,
		)?.billingType;
		if (!billingType) return "fixed_scope";

		const billingToProject: Record<string, ProjectType> = {
			fixed_scope: "fixed_scope",
			recurring: "continuous",
			success_fee: "success_fee",
			no_revenue: "non_revenue",
		};

		return billingToProject[billingType] ?? "fixed_scope";
	}, [lead?.service_line, services]);

	const form = useForm<CloseBusinessFormValues>({
		resolver: zodResolver(closeBusinessSchema),
		defaultValues: {
			projectType: "fixed_scope",
			managerId: "",
			paymentMethod: "mensal",
			installmentsCount: budget?.duration_months || 1,
			dueDay: 10,
			dueDate: "",
			firstInvoiceDate: "",
			startDate: "",
			endDate: "",
			renewalDate: "",
			successFeePercent: undefined,
			installments: [],
			projectName: "",
			clientId: "",
			totalValue: 0,
			monthlyValue: 0,
		},
	});

	const projectType = form.watch("projectType");
	const startDateValue = form.watch("startDate");
	const paymentMethodValue = form.watch("paymentMethod");
	const clientIdValue = form.watch("clientId");
	const managerIdValue = form.watch("managerId");
	const installmentsCountValue = form.watch("installmentsCount");
	const dueDayValue = form.watch("dueDay");
	const firstInvoiceDateValue = form.watch("firstInvoiceDate");
	const totalValue = form.watch("totalValue") || 0;
	const monthlyValue = form.watch("monthlyValue") || 0;
	const successFeePercent = form.watch("successFeePercent");
	const installments = normalizeInstallments(form.watch("installments"));

	const isUnicoPayment = paymentMethodValue === "unico";
	const showInstallmentFields = projectType === "fixed_scope";
	const showSuccessFeeField = projectType === "success_fee";
	const isNonRevenue = projectType === "non_revenue";
	const isContinuous = projectType === "continuous";
	const clientName = getClientName(budget, lead);
	const baseValue = getBaseValue(projectType, budget, lead);

	const reviewTotal = calculateCloseBusinessTotal({
		projectType,
		installments,
		totalValue: budget?.final_total ?? totalValue,
		monthlyValue: isContinuous
			? monthlyValue || budget?.final_total
			: undefined,
		successFeePercent,
	});

	const recurringPreview = useMemo(() => {
		if (!isContinuous || !firstInvoiceDateValue) return [];
		return getNextRecurringCharges({
			firstInvoiceDate: firstInvoiceDateValue,
			dueDay: dueDayValue,
			monthlyValue: monthlyValue || budget?.final_total || 0,
		});
	}, [
		budget?.final_total,
		dueDayValue,
		firstInvoiceDateValue,
		isContinuous,
		monthlyValue,
	]);

	useEffect(() => {
		if (!open) {
			setCelebration(null);
			return;
		}

		const suggestedManager =
			lead?.responsible_id &&
			managers.some((manager) => manager.id === lead.responsible_id)
				? lead.responsible_id
				: "";
		const resolvedProjectType = derivedProjectType;
		const resolvedBaseValue = getBaseValue(resolvedProjectType, budget, lead);
		const start = budget?.start_date || "";
		const end = budget
			? addMonths(
					new Date(`${budget.start_date}T00:00:00`),
					budget.duration_months,
				)
					.toISOString()
					.split("T")[0]
			: "";
		const count = budget?.duration_months || 1;
		const firstInvoiceDate = start;

		setSuggestedManagerId(suggestedManager);
		setCelebration(null);

		form.reset({
			projectType: resolvedProjectType,
			managerId: suggestedManager,
			paymentMethod: "mensal",
			installmentsCount: count,
			dueDay: 10,
			dueDate: "",
			firstInvoiceDate,
			startDate: start,
			endDate: end,
			renewalDate: "",
			successFeePercent: undefined,
			installments:
				resolvedProjectType === "fixed_scope"
					? createInstallmentSchedule({
							totalValue: resolvedBaseValue,
							installmentsCount: count,
							firstInvoiceDate,
							dueDay: 10,
						})
					: [],
			projectName: budget?.title || lead?.name || "",
			clientId: budget?.client_id || lead?.client_id || "",
			totalValue: resolvedBaseValue,
			monthlyValue: resolvedBaseValue,
		});
	}, [open, budget, lead, form, derivedProjectType, managers]);

	useEffect(() => {
		if (startDateValue && budget && open && projectType === "fixed_scope") {
			const newEndDate = addMonths(
				new Date(`${startDateValue}T00:00:00`),
				budget.duration_months,
			);
			form.setValue("endDate", newEndDate.toISOString().split("T")[0]);
		}
	}, [startDateValue, budget, form, open, projectType]);

	useEffect(() => {
		if (!open || projectType !== "fixed_scope") return;

		const currentInstallments = normalizeInstallments(form.getValues("installments"));
		const resizedSchedule = resizeInstallmentSchedule({
			installments: currentInstallments,
			installmentsCount: installmentsCountValue,
			firstInvoiceDate: firstInvoiceDateValue,
			dueDay: dueDayValue,
		});

		form.setValue("installments", resizedSchedule);
	}, [
		dueDayValue,
		firstInvoiceDateValue,
		form,
		installmentsCountValue,
		open,
		projectType,
	]);

	const handleInstallmentChange = (
		index: number,
		field: keyof CloseBusinessInstallment,
		value: string | number,
	) => {
		const nextInstallments = installments.map((installment, currentIndex) =>
			currentIndex === index ? { ...installment, [field]: value } : installment,
		);

		form.setValue("installments", nextInstallments, {
			shouldDirty: true,
			shouldValidate: true,
		});
	};

	const handleDistributeEqually = () => {
		const distributed = distributeInstallmentsEqually(
			budget?.final_total ?? totalValue,
			installments,
		);
		form.setValue("installments", distributed, {
			shouldDirty: true,
			shouldValidate: true,
		});
	};

	const runCelebration = () => {
		confetti({
			particleCount: 120,
			spread: 72,
			origin: { y: 0.62 },
			scalar: 0.9,
			ticks: 220,
		});
	};

	const handleSubmit = async (values: CloseBusinessFormValues) => {
		let project: ProjectDB | void;

		try {
			project = await onConfirm(values);
		} catch {
			return;
		}

		const projectId = project?.id;

		runCelebration();
		setCelebration({
			projectId,
			clientName,
			projectName: project?.name || values.projectName || lead?.name || "Projeto",
			valueLabel: formatCurrencyValue(reviewTotal),
		});

		if (projectId) onClosed?.(projectId);
	};

	if (!budget && !lead) return null;

	const startDate = budget?.start_date
		? new Date(`${budget.start_date}T00:00:00`)
		: new Date();
	const endDate = budget
		? addMonths(startDate, budget.duration_months)
		: new Date();

	const dialogDescription = lead
		? [lead.name, lead.company_name].filter(Boolean).join(" — ") +
			(budget ? ` · Orçamento ${budget.budget_number}` : "")
		: hasBudget
			? "Um projeto será criado automaticamente com os dados do orçamento"
			: "Preencha os dados do projeto para fechar a oportunidade";

	return (
		<>
		<Dialog open={open && !celebration} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Briefcase className="h-5 w-5 text-primary" />
						Fechar oportunidade
					</DialogTitle>
					<DialogDescription>{dialogDescription}</DialogDescription>
				</DialogHeader>

				{hasBudget && budget && (
					<>
						<div className="rounded-lg border bg-muted/30 p-4 space-y-3">
							<div className="flex items-center justify-between">
								<span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
									Dados do Orçamento (somente leitura)
								</span>
								<Lock className="h-3.5 w-3.5 text-muted-foreground" />
							</div>
							<div className="flex items-center justify-between">
								<span className="text-sm text-muted-foreground">Orçamento</span>
								<Badge variant="secondary">{budget.budget_number}</Badge>
							</div>
							<h3 className="font-semibold text-lg">{budget.title}</h3>
							<div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
								<div className="flex items-center gap-2">
									<Building2 className="h-4 w-4 text-muted-foreground" />
									<span>
										{budget.client?.company_name ||
											budget.lead_name ||
											"Sem cliente"}
									</span>
								</div>
								<div className="flex items-center gap-2">
									<DollarSign className="h-4 w-4 text-muted-foreground" />
									<span className="font-medium text-primary">
										{formatCurrencyValue(budget.final_total)}
									</span>
								</div>
								<div className="flex items-center gap-2">
									<Calendar className="h-4 w-4 text-muted-foreground" />
									<span>
										{format(startDate, "MMM/yyyy", { locale: ptBR })} -{" "}
										{format(endDate, "MMM/yyyy", { locale: ptBR })}
									</span>
								</div>
								<div className="flex items-center gap-2">
									<User className="h-4 w-4 text-muted-foreground" />
									<span>{budget.duration_months} meses</span>
								</div>
							</div>
						</div>
						<Separator />
					</>
				)}

				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(handleSubmit)}
						className="space-y-5"
					>
						<p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
							Tipo de Projeto
						</p>
						<FormField
							control={form.control}
							name="projectType"
							render={({ field }) => (
								<FormItem>
									<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
										{(
											[
												"fixed_scope",
												"continuous",
												"success_fee",
												"non_revenue",
											] as ProjectType[]
										).map((type) => {
											const Icon = PROJECT_TYPE_ICONS[type];
											const isSelected = field.value === type;
											const isSuggested = type === derivedProjectType;

											return (
												<button
													key={type}
													type="button"
													onClick={() => field.onChange(type)}
													disabled={!!celebration || isSubmitting}
													className={cn(
														"flex items-start gap-3 rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
														isSelected
															? "border-primary bg-primary/5 text-primary"
															: "border-border hover:border-muted-foreground/40 hover:bg-muted/30",
														(!!celebration || isSubmitting) &&
															"cursor-not-allowed opacity-60",
													)}
												>
													<Icon
														className={cn(
															"h-4 w-4 mt-0.5 shrink-0",
															isSelected
																? "text-primary"
																: "text-muted-foreground",
														)}
													/>
													<div className="min-w-0 flex-1">
														<div className="flex items-center gap-1.5">
															<p
																className={cn(
																	"text-sm font-medium leading-tight",
																	!isSelected && "text-foreground",
																)}
															>
																{PROJECT_TYPE_LABELS[type]}
															</p>
															{isSuggested && (
																<Badge
																	variant="secondary"
																	className="text-[9px] px-1 py-0 h-4 leading-none"
																>
																	Sugerido
																</Badge>
															)}
														</div>
														<p className="text-xs text-muted-foreground leading-tight mt-0.5">
															{PROJECT_TYPE_DESCRIPTIONS[type]}
														</p>
													</div>
												</button>
											);
										})}
									</div>
									<FormMessage />
								</FormItem>
							)}
						/>

						<Separator />

						<p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
							Dados do Projeto
						</p>

						{budgetMissingClient && !clientIdValue && (
							<Alert variant="destructive" className="py-2">
								<AlertTriangle className="h-4 w-4" />
								<AlertDescription className="text-xs">
									Este orçamento não tem cliente associado. Selecione um cliente
									abaixo para continuar.
								</AlertDescription>
							</Alert>
						)}

						{!hasBudget && (
							<FormField
								control={form.control}
								name="projectName"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Nome do Projeto *</FormLabel>
										<FormControl>
											<Input
												{...field}
												disabled={!!celebration || isSubmitting}
												placeholder="Nome do projeto"
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						)}

						{needsClientField && (
							<FormField
								control={form.control}
								name="clientId"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Cliente *</FormLabel>
										<Select
											onValueChange={field.onChange}
											value={field.value}
											disabled={!!celebration || isSubmitting}
										>
											<FormControl>
												<SelectTrigger>
													<SelectValue placeholder="Selecione o cliente" />
												</SelectTrigger>
											</FormControl>
											<SelectContent>
												{clients.map((client) => (
													<SelectItem key={client.id} value={client.id}>
														{client.companyName}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										<FormMessage />
									</FormItem>
								)}
							/>
						)}

						<FormField
							control={form.control}
							name="managerId"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Gerente do Projeto *</FormLabel>
									<Select
										onValueChange={field.onChange}
										value={field.value}
										disabled={!!celebration || isSubmitting}
									>
										<FormControl>
											<SelectTrigger>
												<SelectValue placeholder="Selecione o gerente" />
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											{managers.length > 0 ? (
												managers.map((employee) => (
													<SelectItem key={employee.id} value={employee.id}>
														{employee.nome}
													</SelectItem>
												))
											) : (
												<div className="p-2 text-sm text-muted-foreground text-center">
													Nenhum gerente disponível.
													<br />
													Atribua o perfil "Gerente de Projetos" ou
													"Administrador" a um funcionário.
												</div>
											)}
										</SelectContent>
									</Select>
									{suggestedManagerId &&
										managerIdValue === suggestedManagerId && (
											<p className="text-xs text-muted-foreground">
												Sugerido com base no responsável da oportunidade.
											</p>
										)}
									<FormMessage />
								</FormItem>
							)}
						/>

						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<FormField
								control={form.control}
								name="startDate"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Data de Início *</FormLabel>
										<FormControl>
											<Input
												type="date"
												{...field}
												disabled={!!celebration || isSubmitting}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							{isContinuous ? (
								<FormField
									control={form.control}
									name="renewalDate"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Renovação em *</FormLabel>
											<FormControl>
												<Input
													type="date"
													{...field}
													disabled={!!celebration || isSubmitting}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							) : (
								<FormField
									control={form.control}
									name="endDate"
									render={({ field }) => (
										<FormItem>
											<FormLabel>
												Data de Fim{" "}
												{isNonRevenue || showSuccessFeeField ? "" : "*"}
											</FormLabel>
											<FormControl>
												<Input
													type="date"
													{...field}
													disabled={!!celebration || isSubmitting}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							)}
						</div>

						{(showInstallmentFields || isContinuous || showSuccessFeeField) && (
							<>
								<Separator />
								<p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
									Condições Financeiras
								</p>
							</>
						)}

						{(showInstallmentFields || showSuccessFeeField) && !hasBudget && (
							<FormField
								control={form.control}
								name="totalValue"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											{showSuccessFeeField
												? "Valor Base Estimado *"
												: "Valor Total do Contrato *"}
										</FormLabel>
										<FormControl>
											<CurrencyInput
												value={field.value || 0}
												onValueChange={field.onChange}
												disabled={!!celebration || isSubmitting}
												showPrefix
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						)}

						{isContinuous && (
							<>
								<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
									<FormField
										control={form.control}
										name="monthlyValue"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Valor Mensal</FormLabel>
												<FormControl>
													<CurrencyInput
														value={field.value || 0}
														onValueChange={field.onChange}
														disabled={
															!!celebration || isSubmitting || hasBudget
														}
														showPrefix
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="firstInvoiceDate"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Data Primeira NF</FormLabel>
												<FormControl>
													<Input
														type="date"
														{...field}
														disabled={!!celebration || isSubmitting}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="dueDay"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Dia de Vencimento</FormLabel>
												<FormControl>
													<Input
														type="number"
														min="1"
														max="31"
														{...field}
														disabled={!!celebration || isSubmitting}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
								</div>

								<div className="rounded-lg border bg-muted/20 p-3">
									<p className="mb-2 text-sm font-medium">
										Próximos 3 meses de cobrança
									</p>
									{recurringPreview.length > 0 ? (
										<div className="grid gap-2 sm:grid-cols-3">
											{recurringPreview.map((charge) => (
												<div
													key={charge.installmentNumber}
													className="rounded-md border bg-background p-3 text-sm"
												>
													<p className="font-medium">
														{formatDate(charge.dueDate)}
													</p>
													<p className="text-muted-foreground">
														{formatCurrencyValue(charge.value)}
													</p>
												</div>
											))}
										</div>
									) : (
										<p className="text-sm text-muted-foreground">
											Informe a primeira NF para visualizar as próximas
											cobranças.
										</p>
									)}
								</div>
							</>
						)}

						{showSuccessFeeField && (
							<>
								<FormField
									control={form.control}
									name="successFeePercent"
									render={({ field }) => (
										<FormItem>
											<FormLabel>% de Sucesso *</FormLabel>
											<FormControl>
												<div className="relative">
													<Input
														type="number"
														min="0"
														max="100"
														step="0.1"
														placeholder="Ex: 15"
														{...field}
														value={field.value ?? ""}
														disabled={!!celebration || isSubmitting}
														onChange={(event) =>
															field.onChange(
																event.target.value
																	? Number(event.target.value)
																	: undefined,
															)
														}
													/>
													<span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
														%
													</span>
												</div>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<div className="rounded-lg border bg-muted/20 p-3 text-sm">
									<p className="font-medium">Apuração prevista</p>
									<div className="mt-2 grid gap-2 sm:grid-cols-3">
										<div>
											<span className="text-muted-foreground">Data</span>
											<p>{formatDate(form.watch("endDate"))}</p>
										</div>
										<div>
											<span className="text-muted-foreground">Percentual</span>
											<p>{successFeePercent ?? 0}%</p>
										</div>
										<div>
											<span className="text-muted-foreground">
												Base estimada
											</span>
											<p>{formatCurrencyValue(baseValue || totalValue)}</p>
										</div>
									</div>
								</div>
							</>
						)}

						{showInstallmentFields && (
							<>
								<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
									<FormField
										control={form.control}
										name="paymentMethod"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Forma de Pagamento</FormLabel>
												<Select
													onValueChange={field.onChange}
													value={field.value}
													disabled={!!celebration || isSubmitting}
												>
													<FormControl>
														<SelectTrigger>
															<SelectValue placeholder="Selecione" />
														</SelectTrigger>
													</FormControl>
													<SelectContent>
														{PAYMENT_METHOD_OPTIONS.map((option) => (
															<SelectItem
																key={option.value}
																value={option.value}
															>
																{option.label}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
												<FormMessage />
											</FormItem>
										)}
									/>

									<FormField
										control={form.control}
										name="installmentsCount"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Parcelas</FormLabel>
												<FormControl>
													<Input
														type="number"
														min="1"
														{...field}
														disabled={!!celebration || isSubmitting}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
								</div>

								<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
									<FormField
										control={form.control}
										name="firstInvoiceDate"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Data Primeira NF *</FormLabel>
												<FormControl>
													<Input
														type="date"
														{...field}
														disabled={!!celebration || isSubmitting}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>

									{isUnicoPayment ? (
										<FormField
											control={form.control}
											name="dueDate"
											render={({ field }) => (
												<FormItem>
													<FormLabel>Data de Vencimento</FormLabel>
													<FormControl>
														<Input
															type="date"
															{...field}
															disabled={!!celebration || isSubmitting}
														/>
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>
									) : (
										<FormField
											control={form.control}
											name="dueDay"
											render={({ field }) => (
												<FormItem>
													<FormLabel>Dia de Vencimento</FormLabel>
													<FormControl>
														<Input
															type="number"
															min="1"
															max="31"
															{...field}
															disabled={!!celebration || isSubmitting}
														/>
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>
									)}
								</div>

								<div className="rounded-lg border">
									<div className="flex flex-col gap-3 border-b p-3 sm:flex-row sm:items-center sm:justify-between">
										<div>
											<p className="font-medium">Cronograma de parcelas</p>
											<p className="text-sm text-muted-foreground">
												Soma atual: {formatCurrencyValue(reviewTotal)}
											</p>
										</div>
										<Button
											type="button"
											variant="outline"
											size="sm"
											onClick={handleDistributeEqually}
											disabled={
												!!celebration ||
												isSubmitting ||
												installments.length === 0
											}
										>
											<Wand2 className="mr-2 h-4 w-4" />
											Distribuir igualmente
										</Button>
									</div>
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead className="w-16">#</TableHead>
												<TableHead>Emissão</TableHead>
												<TableHead>Vencimento</TableHead>
												<TableHead className="min-w-36">Valor</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{installments.map((installment, index) => (
												<TableRow key={installment.installmentNumber}>
													<TableCell className="font-medium">
														{installment.installmentNumber}
													</TableCell>
													<TableCell>
														<Input
															type="date"
															value={installment.invoiceDate}
															disabled={!!celebration || isSubmitting}
															onChange={(event) =>
																handleInstallmentChange(
																	index,
																	"invoiceDate",
																	event.target.value,
																)
															}
														/>
													</TableCell>
													<TableCell>
														<Input
															type="date"
															value={installment.dueDate}
															disabled={!!celebration || isSubmitting}
															onChange={(event) =>
																handleInstallmentChange(
																	index,
																	"dueDate",
																	event.target.value,
																)
															}
														/>
													</TableCell>
													<TableCell>
														<CurrencyInput
															value={installment.value}
															onValueChange={(value) =>
																handleInstallmentChange(index, "value", value)
															}
															disabled={!!celebration || isSubmitting}
															compact
															showPrefix
														/>
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</div>
							</>
						)}

						<Separator />

						<div className="rounded-lg border bg-muted/20 p-4">
							<p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
								Revisão
							</p>
							<div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
								<div>
									<span className="text-muted-foreground">Cliente</span>
									<p className="font-medium">{clientName}</p>
								</div>
								<div>
									<span className="text-muted-foreground">Modelo</span>
									<p className="font-medium">
										{PROJECT_TYPE_LABELS[projectType]}
									</p>
								</div>
								<div>
									<span className="text-muted-foreground">Início</span>
									<p className="font-medium">{formatDate(startDateValue)}</p>
								</div>
								<div>
									<span className="text-muted-foreground">
										Valor de referência
									</span>
									<p className="text-lg font-semibold text-primary">
										{formatCurrencyValue(reviewTotal)}
									</p>
								</div>
							</div>
						</div>

						<div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
							<Button
								type="button"
								variant="outline"
								onClick={() => onOpenChange(false)}
								disabled={isSubmitting}
							>
								{celebration ? "Continuar" : "Cancelar"}
							</Button>
							{!celebration && (
								<Button type="submit" disabled={isSubmitting}>
									{isSubmitting ? "Criando..." : "Confirmar e celebrar!"}
								</Button>
							)}
						</div>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
		<Dialog
			open={open && !!celebration}
			onOpenChange={(nextOpen) => {
				if (!nextOpen) onOpenChange(false);
			}}
		>
			<DialogContent className="max-w-md overflow-hidden">
				<div className="space-y-5 text-center">
					<div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
						<Sparkles className="h-7 w-7" />
					</div>
					<DialogHeader className="space-y-3 text-center">
						<DialogTitle className="text-2xl">
							{celebration?.clientName} fechado!
						</DialogTitle>
						<DialogDescription className="text-base leading-relaxed">
							O projeto foi criado no Portfólio e já está em Planejamento para
							o time iniciar a próxima etapa.
						</DialogDescription>
					</DialogHeader>
					<div className="rounded-lg border bg-muted/30 p-4 text-left">
						<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
							Resumo do fechamento
						</p>
						<div className="mt-3 space-y-3">
							<div className="flex items-start justify-between gap-4">
								<span className="text-sm text-muted-foreground">Projeto</span>
								<span className="text-right text-sm font-medium">
									{celebration?.projectName}
								</span>
							</div>
							<div className="flex items-center justify-between gap-4">
								<span className="text-sm text-muted-foreground">
									Valor de referência
								</span>
								<span className="text-lg font-semibold text-primary">
									{celebration?.valueLabel}
								</span>
							</div>
						</div>
					</div>
					<div className="rounded-lg border p-4 text-left">
						<p className="font-medium">Deseja anexar o contrato agora?</p>
						<p className="mb-4 mt-1 text-sm text-muted-foreground">
							PDF de até 10MB. Você também poderá anexá-lo depois na aba
							Arquivos do projeto.
						</p>
						{celebration?.projectId ? (
							<ProjectContractUpload
								compact
								projectId={celebration.projectId}
								onSkip={() => onOpenChange(false)}
								onUploadSuccess={() => onOpenChange(false)}
							/>
						) : (
							<Button
								variant="outline"
								className="w-full"
								onClick={() => onOpenChange(false)}
							>
								Continuar
							</Button>
						)}
					</div>
				</div>
			</DialogContent>
		</Dialog>
		</>
	);
}
