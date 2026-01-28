import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PayrollProfile {
  fgtsRateClt: number;
  fgtsRateApprentice: number;
  inssPatronalRate: number;
  ratRate: number;
  terceirosRate: number;
  outrosRate: number;
  inssPatronalProlaboreRate: number;
  fgtsProlaboreRate: number;
  applyFgtsOn13th: boolean;
  applyInssOn13th: boolean;
  applyRatOn13th: boolean;
  applyTerceirosOn13th: boolean;
  applyOutrosOn13th: boolean;
  applyFgtsOnVacation: boolean;
  applyInssOnVacation: boolean;
  applyRatOnVacation: boolean;
  applyTerceirosOnVacation: boolean;
  applyOutrosOnVacation: boolean;
}

const DEFAULT_PAYROLL_PROFILE: PayrollProfile = {
  fgtsRateClt: 0.08,
  fgtsRateApprentice: 0.02,
  inssPatronalRate: 0,
  ratRate: 0,
  terceirosRate: 0,
  outrosRate: 0,
  inssPatronalProlaboreRate: 0,
  fgtsProlaboreRate: 0,
  applyFgtsOn13th: true,
  applyInssOn13th: false,
  applyRatOn13th: false,
  applyTerceirosOn13th: false,
  applyOutrosOn13th: false,
  applyFgtsOnVacation: true,
  applyInssOnVacation: false,
  applyRatOnVacation: false,
  applyTerceirosOnVacation: false,
  applyOutrosOnVacation: false,
};

interface CostBreakdownDetails {
  fgts: number;
  inss: number;
  rat: number;
  terceiros: number;
  outros: number;
  provisao13: number;
  provisaoFeriasBase: number;
  provisaoFeriasTerco: number;
  provisaoFerias: number;
  provisaoRecesso: number;
  fgts13: number;
  fgtsFerias: number;
  encargos13: number;
  encargosFerias: number;
}

interface CostBreakdown {
  baseAmount: number;
  chargesAmount: number;
  provisionsAmount: number;
  benefitsAmount: number;
  toolsAmount: number;
  totalMonthlyCost: number;
  totalAnnualCost: number;
  details: CostBreakdownDetails;
}

function sum13thApplicableRates(profile: PayrollProfile, fgtsRate: number): number {
  let total = 0;
  if (profile.applyFgtsOn13th) total += fgtsRate;
  if (profile.applyInssOn13th) total += profile.inssPatronalRate;
  if (profile.applyRatOn13th) total += profile.ratRate;
  if (profile.applyTerceirosOn13th) total += profile.terceirosRate;
  if (profile.applyOutrosOn13th) total += profile.outrosRate;
  return total;
}

function sumVacationApplicableRates(profile: PayrollProfile, fgtsRate: number): number {
  let total = 0;
  if (profile.applyFgtsOnVacation) total += fgtsRate;
  if (profile.applyInssOnVacation) total += profile.inssPatronalRate;
  if (profile.applyRatOnVacation) total += profile.ratRate;
  if (profile.applyTerceirosOnVacation) total += profile.terceirosRate;
  if (profile.applyOutrosOnVacation) total += profile.outrosRate;
  return total;
}

function calculateEmployeeCost(
  tipoContratacao: string,
  salarioBruto: number,
  bolsaAuxilio: number,
  valorContratoPj: number,
  proLabore: number,
  dividendos: number,
  benefitsTotal: number,
  toolsTotal: number,
  profile: PayrollProfile
): CostBreakdown {
  let baseAmount = 0;
  let chargesAmount = 0;
  let provisionsAmount = 0;
  
  const details: CostBreakdownDetails = {
    fgts: 0,
    inss: 0,
    rat: 0,
    terceiros: 0,
    outros: 0,
    provisao13: 0,
    provisaoFeriasBase: 0,
    provisaoFeriasTerco: 0,
    provisaoFerias: 0,
    provisaoRecesso: 0,
    fgts13: 0,
    fgtsFerias: 0,
    encargos13: 0,
    encargosFerias: 0,
  };

  switch (tipoContratacao) {
    case 'CLT':
    case 'MENOR_APRENDIZ': {
      baseAmount = salarioBruto;
      const fgtsRate = tipoContratacao === 'CLT' 
        ? profile.fgtsRateClt 
        : profile.fgtsRateApprentice;

      details.fgts = baseAmount * fgtsRate;
      details.inss = baseAmount * profile.inssPatronalRate;
      details.rat = baseAmount * profile.ratRate;
      details.terceiros = baseAmount * profile.terceirosRate;
      details.outros = baseAmount * profile.outrosRate;

      details.provisao13 = baseAmount / 12;
      details.provisaoFeriasBase = baseAmount / 12;
      details.provisaoFeriasTerco = details.provisaoFeriasBase / 3;
      details.provisaoFerias = details.provisaoFeriasBase + details.provisaoFeriasTerco;

      details.fgts13 = profile.applyFgtsOn13th ? details.provisao13 * fgtsRate : 0;
      details.fgtsFerias = profile.applyFgtsOnVacation ? details.provisaoFerias * fgtsRate : 0;

      const rates13 = sum13thApplicableRates(profile, fgtsRate);
      const ratesVacation = sumVacationApplicableRates(profile, fgtsRate);
      
      details.encargos13 = details.provisao13 * rates13;
      details.encargosFerias = details.provisaoFerias * ratesVacation;

      chargesAmount = details.fgts + details.inss + details.rat + details.terceiros + details.outros
                    + details.encargos13 + details.encargosFerias;
      provisionsAmount = details.provisao13 + details.provisaoFerias;
      break;
    }

    case 'ESTAGIO': {
      baseAmount = bolsaAuxilio;
      details.provisaoRecesso = baseAmount / 12;
      provisionsAmount = details.provisaoRecesso;
      break;
    }

    case 'PJ': {
      baseAmount = valorContratoPj;
      break;
    }

    case 'SOCIO': {
      baseAmount = proLabore + dividendos;
      
      if (proLabore > 0) {
        details.inss = proLabore * profile.inssPatronalProlaboreRate;
        details.fgts = proLabore * profile.fgtsProlaboreRate;
        chargesAmount = details.inss + details.fgts;
      }
      break;
    }

    default:
      baseAmount = salarioBruto;
  }

  const totalMonthlyCost = baseAmount + chargesAmount + provisionsAmount + benefitsTotal + toolsTotal;

  return {
    baseAmount,
    chargesAmount,
    provisionsAmount,
    benefitsAmount: benefitsTotal,
    toolsAmount: toolsTotal,
    totalMonthlyCost,
    totalAnnualCost: totalMonthlyCost * 12,
    details,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all tenants
    const { data: tenants, error: tenantsError } = await supabase
      .from("tenants")
      .select("id");

    if (tenantsError) {
      throw tenantsError;
    }

    let updatedCount = 0;
    let errorCount = 0;

    for (const tenant of tenants || []) {
      // Get payroll profile for this tenant
      const { data: profileData } = await supabase
        .from("payroll_profiles")
        .select("*")
        .eq("tenant_id", tenant.id)
        .single();

      const profile: PayrollProfile = profileData ? {
        fgtsRateClt: Number(profileData.fgts_rate_clt) || DEFAULT_PAYROLL_PROFILE.fgtsRateClt,
        fgtsRateApprentice: Number(profileData.fgts_rate_apprentice) || DEFAULT_PAYROLL_PROFILE.fgtsRateApprentice,
        inssPatronalRate: Number(profileData.inss_patronal_rate) || DEFAULT_PAYROLL_PROFILE.inssPatronalRate,
        ratRate: Number(profileData.rat_rate) || DEFAULT_PAYROLL_PROFILE.ratRate,
        terceirosRate: Number(profileData.terceiros_rate) || DEFAULT_PAYROLL_PROFILE.terceirosRate,
        outrosRate: Number(profileData.outros_rate) || DEFAULT_PAYROLL_PROFILE.outrosRate,
        inssPatronalProlaboreRate: Number(profileData.inss_patronal_prolabore_rate) || DEFAULT_PAYROLL_PROFILE.inssPatronalProlaboreRate,
        fgtsProlaboreRate: Number(profileData.fgts_prolabore_rate) || DEFAULT_PAYROLL_PROFILE.fgtsProlaboreRate,
        applyFgtsOn13th: profileData.apply_fgts_on_13th ?? DEFAULT_PAYROLL_PROFILE.applyFgtsOn13th,
        applyInssOn13th: profileData.apply_inss_on_13th ?? DEFAULT_PAYROLL_PROFILE.applyInssOn13th,
        applyRatOn13th: profileData.apply_rat_on_13th ?? DEFAULT_PAYROLL_PROFILE.applyRatOn13th,
        applyTerceirosOn13th: profileData.apply_terceiros_on_13th ?? DEFAULT_PAYROLL_PROFILE.applyTerceirosOn13th,
        applyOutrosOn13th: profileData.apply_outros_on_13th ?? DEFAULT_PAYROLL_PROFILE.applyOutrosOn13th,
        applyFgtsOnVacation: profileData.apply_fgts_on_vacation ?? DEFAULT_PAYROLL_PROFILE.applyFgtsOnVacation,
        applyInssOnVacation: profileData.apply_inss_on_vacation ?? DEFAULT_PAYROLL_PROFILE.applyInssOnVacation,
        applyRatOnVacation: profileData.apply_rat_on_vacation ?? DEFAULT_PAYROLL_PROFILE.applyRatOnVacation,
        applyTerceirosOnVacation: profileData.apply_terceiros_on_vacation ?? DEFAULT_PAYROLL_PROFILE.applyTerceirosOnVacation,
        applyOutrosOnVacation: profileData.apply_outros_on_vacation ?? DEFAULT_PAYROLL_PROFILE.applyOutrosOnVacation,
      } : DEFAULT_PAYROLL_PROFILE;

      // Get all employees for this tenant
      const { data: employees, error: employeesError } = await supabase
        .from("employees")
        .select(`
          id,
          tipo_contratacao,
          salario_mensal,
          bolsa_auxilio,
          valor_contrato_pj,
          pro_labore,
          dividendos,
          employee_tools(monthly_cost),
          employee_benefits(monthly_value)
        `)
        .eq("tenant_id", tenant.id);

      if (employeesError) {
        console.error(`Error fetching employees for tenant ${tenant.id}:`, employeesError);
        continue;
      }

      for (const emp of employees || []) {
        try {
          const benefitsTotal = (emp.employee_benefits || []).reduce(
            (sum: number, b: { monthly_value: number }) => sum + Number(b.monthly_value),
            0
          );
          const toolsTotal = (emp.employee_tools || []).reduce(
            (sum: number, t: { monthly_cost: number }) => sum + Number(t.monthly_cost),
            0
          );

          const breakdown = calculateEmployeeCost(
            emp.tipo_contratacao,
            Number(emp.salario_mensal) || 0,
            Number(emp.bolsa_auxilio) || 0,
            Number(emp.valor_contrato_pj) || 0,
            Number(emp.pro_labore) || 0,
            Number(emp.dividendos) || 0,
            benefitsTotal,
            toolsTotal,
            profile
          );

          const { error: updateError } = await supabase
            .from("employees")
            .update({
              fgts: breakdown.details.fgts,
              inss_empresa: breakdown.details.inss,
              encargos: breakdown.chargesAmount,
              decimo_terceiro: breakdown.details.provisao13 || breakdown.details.provisaoRecesso,
              ferias: breakdown.details.provisaoFerias,
              provisao_13: breakdown.details.provisao13,
              provisao_ferias: breakdown.details.provisaoFerias,
              provisao_recesso: breakdown.details.provisaoRecesso,
              total_monthly_cost_estimated: breakdown.totalMonthlyCost,
              total_annual_cost_estimated: breakdown.totalAnnualCost,
              breakdown_json: breakdown,
            })
            .eq("id", emp.id);

          if (updateError) {
            console.error(`Error updating employee ${emp.id}:`, updateError);
            errorCount++;
          } else {
            updatedCount++;
          }
        } catch (empError) {
          console.error(`Error processing employee ${emp.id}:`, empError);
          errorCount++;
        }
      }
    }

    console.log(`Recalculation complete: ${updatedCount} updated, ${errorCount} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Recalculated costs for ${updatedCount} employees`,
        updatedCount,
        errorCount,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in recalculate-employee-costs:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
