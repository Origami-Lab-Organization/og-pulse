import { Cloud } from 'lucide-react';
import { ProjectDocumentsSection } from '@/components/projects/detail/ProjectDocumentsSection';
import { ProjectDriveLinkCard } from '@/components/projects/detail/ProjectDriveLinkCard';
import { ProjectDriveBrowser } from '@/components/projects/detail/ProjectDriveBrowser';
import { MicrosoftConnectPrompt } from '@/components/microsoft/MicrosoftConnectPrompt';
import { useProjectDriveLink } from '@/hooks/useProjectDrive';
import { useMicrosoftConnection } from '@/hooks/useMicrosoftGraph';
import { useAuth } from '@/contexts/AuthContext';

interface ProjectFilesTabProps {
  projectId: string;
  canManageFolders?: boolean;
  isReadOnly?: boolean;
}

export function ProjectFilesTab({
  projectId,
  canManageFolders = false,
  isReadOnly = false,
}: ProjectFilesTabProps) {
  const { employee } = useAuth();
  const { data: driveLink } = useProjectDriveLink(projectId);
  const { isConfigured, isConnected, isLoading, connect, isConnecting } = useMicrosoftConnection();

  const isDisconnected = isConfigured && !isConnected && !isLoading;

  /**
   * Só bloqueia quando o projeto JÁ aponta para o OneDrive: aí nada da aba
   * funciona sem token. O vínculo é do projeto, mas o token é de cada pessoa.
   * Sem vínculo, o modo local roda sem Microsoft alguma.
   */
  if (driveLink && isDisconnected) {
    return (
      <MicrosoftConnectPrompt
        icon={<Cloud className="h-8 w-8" aria-hidden="true" />}
        title="Conecte sua conta Microsoft"
        description="Os arquivos deste projeto ficam no OneDrive. Autorize o acesso para abrir a pasta sem sair do Pulse — você só enxerga o que já tem permissão por lá."
        onConnect={connect}
        isConnecting={isConnecting}
      />
    );
  }

  return (
    <div className="space-y-4">
      <ProjectDriveLinkCard projectId={projectId} canManage={canManageFolders} />

      {driveLink ? (
        <ProjectDriveBrowser
          link={driveLink}
          projectId={projectId}
          tenantId={employee?.tenant_id ?? undefined}
          canManageFolders={canManageFolders}
          isReadOnly={isReadOnly}
        />
      ) : (
        <ProjectDocumentsSection
          projectId={projectId}
          canManageFolders={canManageFolders}
          isReadOnly={isReadOnly}
        />
      )}
    </div>
  );
}
