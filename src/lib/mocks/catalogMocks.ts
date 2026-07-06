import { Benefit } from '@/types/benefit';
import { Tool } from '@/types/tool';

const NOW = '2026-06-19T13:00:00.000Z';

export const MOCK_BENEFITS: Benefit[] = [
  {
    id: 'mock-benefit-1',
    tenantId: 'mock-tenant',
    name: 'Vale Refeição',
    description: 'Cartão de benefícios para refeições e alimentação (Alelo/Sodexo).',
    value: 800,
    isActive: true,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'mock-benefit-2',
    tenantId: 'mock-tenant',
    name: 'Plano de Saúde',
    description: 'Plano médico coparticipativo — cobertura nacional (Unimed/Amil).',
    value: 450,
    isActive: true,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'mock-benefit-3',
    tenantId: 'mock-tenant',
    name: 'Gympass',
    description: 'Acesso a academias e estúdios pelo app Gympass.',
    value: 89.90,
    isActive: false,
    createdAt: NOW,
    updatedAt: NOW,
  },
];

export const MOCK_TOOLS: Tool[] = [
  {
    id: 'mock-tool-1',
    tenantId: 'mock-tenant',
    name: 'GitHub Copilot',
    description: 'Assistente de código com IA integrado ao VS Code e JetBrains.',
    value: 100,
    isActive: true,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'mock-tool-2',
    tenantId: 'mock-tenant',
    name: 'Figma',
    description: 'Ferramenta de design de interfaces — plano Professional.',
    value: 75,
    isActive: true,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'mock-tool-3',
    tenantId: 'mock-tenant',
    name: 'Slack Pro',
    description: 'Plano pago do Slack com histórico ilimitado e integrações.',
    value: 35,
    isActive: false,
    createdAt: NOW,
    updatedAt: NOW,
  },
];
