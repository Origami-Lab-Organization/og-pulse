import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Package, Plus } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { InternalProductCard } from '@/components/products/InternalProductCard';
import { ProjectFormDialog } from '@/components/projects/ProjectFormDialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { INTERNAL_PRODUCTS_QUERY_KEY, useInternalProducts } from '@/hooks/useInternalProducts';
import { useCreateProject } from '@/hooks/useProjects';
import { PROJECT_KIND } from '@/lib/projectKind.constants';
import type { InternalProductSummary } from '@/types/internalProduct';
import type { CreateProjectInput } from '@/types/project';

interface ProductListProps {
  products: InternalProductSummary[];
  isLoading: boolean;
  hasError: boolean;
}

function ProductList(props: ProductListProps) {
  const { products, isLoading, hasError } = props;

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <Skeleton key={item} className="h-64 w-full" />
        ))}
      </div>
    );
  }

  if (hasError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Não foi possível carregar os produtos. Tente de novo em instantes.</AlertDescription>
      </Alert>
    );
  }

  if (!products.length) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
          <Package className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm font-medium text-foreground">Nenhum produto interno ainda.</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Produto interno é o que a casa constrói para si, como o Pulse. Ele nasce sem cliente, não
            faturável, e as horas vão para o centro Projeto Interno.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {products.map((product) => (
        <InternalProductCard key={product.projectId} product={product} />
      ))}
    </div>
  );
}

/**
 * Produtos internos (ADR-0049): o Pulse, o Harness e o que mais a casa construir para si.
 * Cada produto é um projeto marcado como produto; esta tela é a visão de gestão por cima dele.
 */
export default function Produtos() {
  const { can } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: products = [], isLoading, error } = useInternalProducts();
  const createProject = useCreateProject();
  const [formOpen, setFormOpen] = useState(false);
  const canCreate = can('projeto:editar');

  const handleCreate = (input: CreateProjectInput) => {
    createProject.mutate(input, {
      onSuccess: (project) => {
        setFormOpen(false);
        queryClient.invalidateQueries({ queryKey: [INTERNAL_PRODUCTS_QUERY_KEY] });
        navigate(`/projects/${project.id}`);
      },
    });
  };

  return (
    <AppLayout
      title="Produtos"
      description="O que a casa constrói para si: quanto já investimos, quem cuida e o que vem a seguir."
      breadcrumbs={[{ label: 'Projetos', href: '/projetos' }, { label: 'Produtos' }]}
      financialValues={can('financeiro:ler')}
      actions={
        canCreate && (
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Novo produto
          </Button>
        )
      }
    >
      <ProductList products={products} isLoading={isLoading} hasError={Boolean(error)} />

      {canCreate && (
        <ProjectFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          onSubmit={handleCreate}
          isSubmitting={createProject.isPending}
          defaultKind={PROJECT_KIND.PRODUCT}
        />
      )}
    </AppLayout>
  );
}
