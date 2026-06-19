import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmployeeTool } from '@/types/employee';
import { formatCurrency } from '@/lib/formatters';
import { formatCurrency as formatCurrencyMask, parseCurrency } from '@/lib/masks';
import {
  useEmployeeTools,
  useAddEmployeeTool,
  useUpdateEmployeeTool,
  useDeleteEmployeeTool,
} from '@/hooks/useEmployees';
import { Plus, Pencil, Trash2, Check, X, Wrench, RefreshCw, ExternalLink } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTools } from '@/hooks/useTools';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface EmployeeToolsTableProps {
  employeeId: string;
  employeeName: string;
}

export function EmployeeToolsTable({ employeeId, employeeName }: EmployeeToolsTableProps) {
  const { data: tools = [], isLoading } = useEmployeeTools(employeeId);
  const { data: catalog = [], refetch: refetchCatalog } = useTools();
  const addTool = useAddEmployeeTool();
  const updateTool = useUpdateEmployeeTool();
  const deleteTool = useDeleteEmployeeTool();

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteToolId, setDeleteToolId] = useState<string | null>(null);
  const [emptyCatalogDialogOpen, setEmptyCatalogDialogOpen] = useState(false);

  const handleOpenAdd = () => {
    if (availableTools.length === 0) {
      setEmptyCatalogDialogOpen(true);
    } else {
      setIsAdding(true);
    }
  };

  const activeCatalog = catalog.filter((t) => t.isActive);
  const availableTools = activeCatalog.filter(
    (opt) => !tools.some((t) => t.name === opt.name)
  );

  const [newTool, setNewTool] = useState({
    catalogId: '',
    name: '',
    description: '',
    monthlyCost: 0,
    monthlyCostDisplay: '',
  });

  const handleSelectCatalog = (catalogId: string) => {
    const item = activeCatalog.find((t) => t.id === catalogId);
    if (!item) return;
    setNewTool({
      catalogId,
      name: item.name,
      description: item.description || '',
      monthlyCost: item.value,
      monthlyCostDisplay: formatCurrencyMask(item.value),
    });
  };

  const [editData, setEditData] = useState({
    name: '',
    description: '',
    monthlyCost: 0,
    monthlyCostDisplay: '',
  });

  const totalCost = tools.reduce((sum, tool) => sum + Number(tool.monthly_cost), 0);

  const handleAdd = () => {
    if (!newTool.name.trim()) return;
    
    addTool.mutate(
      {
        employeeId,
        name: newTool.name.trim(),
        description: newTool.description.trim() || undefined,
        monthlyCost: newTool.monthlyCost,
      },
      {
        onSuccess: () => {
          setIsAdding(false);
          setNewTool({ catalogId: '', name: '', description: '', monthlyCost: 0, monthlyCostDisplay: '' });
        },
      }
    );
  };

  const startEdit = (tool: EmployeeTool) => {
    setEditingId(tool.id);
    setEditData({
      name: tool.name,
      description: tool.description || '',
      monthlyCost: Number(tool.monthly_cost),
      monthlyCostDisplay: formatCurrencyMask(Number(tool.monthly_cost)),
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({ name: '', description: '', monthlyCost: 0, monthlyCostDisplay: '' });
  };

  const saveEdit = (id: string) => {
    if (!editData.name.trim()) return;
    
    updateTool.mutate(
      {
        id,
        employeeId,
        updates: {
          name: editData.name.trim(),
          description: editData.description.trim() || undefined,
          monthlyCost: editData.monthlyCost,
        },
      },
      {
        onSuccess: () => {
          setEditingId(null);
        },
      }
    );
  };

  const handleDelete = () => {
    if (!deleteToolId) return;
    
    deleteTool.mutate(
      { id: deleteToolId, employeeId },
      {
        onSuccess: () => {
          setDeleteToolId(null);
        },
      }
    );
  };

  if (isLoading) {
    return <div className="text-center py-4 text-muted-foreground">Carregando...</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            
             <CardTitle className="text-lg">Ferramentas e Assinaturas</CardTitle>
          </CardTitle>
          <CardDescription>
            Ferramentas pagas para {employeeName}
          </CardDescription>
        </div>
        {!isAdding && (
          <Button onClick={handleOpenAdd} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Adicionar
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {tools.length === 0 && !isAdding ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma ferramenta cadastrada para este funcionário.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ferramenta</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right">Custo Mensal</TableHead>
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isAdding && (
                    <TableRow>
                      <TableCell colSpan={2}>
                        <div className="flex items-center gap-2">
                          <Select value={newTool.catalogId} onValueChange={handleSelectCatalog}>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Selecione do catálogo" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableTools.map((opt) => (
                                <SelectItem key={opt.id} value={opt.id}>
                                  {opt.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => refetchCatalog()}
                            title="Atualizar catálogo"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          value={newTool.monthlyCostDisplay}
                          onChange={(e) => {
                            const formatted = formatCurrencyMask(e.target.value);
                            setNewTool({
                              ...newTool,
                              monthlyCostDisplay: formatted,
                              monthlyCost: parseCurrency(formatted),
                            });
                          }}
                          placeholder="R$ 0,00"
                          className="w-[140px] text-right"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={handleAdd}
                            disabled={addTool.isPending || !newTool.name.trim()}
                          >
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setIsAdding(false);
                              setNewTool({ catalogId: '', name: '', description: '', monthlyCost: 0, monthlyCostDisplay: '' });
                            }}
                          >
                            <X className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                  {tools.map((tool) => (
                    <TableRow key={tool.id}>
                      <TableCell>
                        {editingId === tool.id ? (
                          <Input
                            value={editData.name}
                            onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                            className="w-full"
                          />
                        ) : (
                          <span className="font-medium">{tool.name}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === tool.id ? (
                          <Input
                            value={editData.description}
                            onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                            className="w-full"
                          />
                        ) : (
                          <span className="text-muted-foreground">{tool.description || '-'}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {editingId === tool.id ? (
                          <Input
                            value={editData.monthlyCostDisplay}
                            onChange={(e) => {
                              const formatted = formatCurrencyMask(e.target.value);
                              setEditData({
                                ...editData,
                                monthlyCostDisplay: formatted,
                                monthlyCost: parseCurrency(formatted),
                              });
                            }}
                            className="w-[140px] text-right"
                          />
                        ) : (
                          formatCurrency(Number(tool.monthly_cost))
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === tool.id ? (
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => saveEdit(tool.id)}
                              disabled={updateTool.isPending}
                            >
                              <Check className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={cancelEdit}
                            >
                              <X className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => startEdit(tool)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setDeleteToolId(tool.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {tools.length > 0 && (
              <div className="flex justify-end">
                <div className="bg-muted/50 rounded-lg p-3">
                  <span className="text-sm text-muted-foreground">Total Mensal: </span>
                  <span className="font-semibold text-lg">{formatCurrency(totalCost)}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* Empty catalog dialog */}
      <Dialog open={emptyCatalogDialogOpen} onOpenChange={setEmptyCatalogDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nenhuma ferramenta disponível</DialogTitle>
            <DialogDescription>
              Todas as ferramentas do catálogo já foram adicionadas a este funcionário, ou o catálogo ainda não possui itens cadastrados.
              Acesse a página de Ferramentas e Benefícios para criar novos itens.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmptyCatalogDialogOpen(false)}>
              Fechar
            </Button>
            <Button
              onClick={() => {
                window.open('/rh/ferramentas-beneficios', '_blank');
                setEmptyCatalogDialogOpen(false);
              }}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Ir para Ferramentas e Benefícios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteToolId} onOpenChange={() => setDeleteToolId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir ferramenta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}