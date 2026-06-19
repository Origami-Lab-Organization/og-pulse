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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/formatters';
import { formatCurrency as formatCurrencyMask, parseCurrency } from '@/lib/masks';
import { Plus, Pencil, Trash2, Check, X, Wrench } from 'lucide-react';
import { useTools } from '@/hooks/useTools';

export interface LocalTool {
  id: string;
  name: string;
  description: string;
  monthlyCost: number;
}

interface EmployeeToolsLocalTableProps {
  tools: LocalTool[];
  onChange: (tools: LocalTool[]) => void;
  employeeName?: string;
}

export function EmployeeToolsLocalTable({
  tools,
  onChange,
  employeeName = 'Funcionário',
}: EmployeeToolsLocalTableProps) {
  const { data: catalog = [] } = useTools();
  const activeCatalog = catalog.filter((t) => t.isActive);

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [newTool, setNewTool] = useState({
    catalogId: '',
    name: '',
    description: '',
    monthlyCost: 0,
    monthlyCostDisplay: '',
  });

  const [editData, setEditData] = useState({
    name: '',
    description: '',
    monthlyCost: 0,
    monthlyCostDisplay: '',
  });

  const totalCost = tools.reduce((sum, t) => sum + t.monthlyCost, 0);

  const availableOptions = activeCatalog.filter(
    (opt) => !tools.some((t) => t.name === opt.name)
  );

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

  const handleAdd = () => {
    if (!newTool.name.trim()) return;
    onChange([
      ...tools,
      {
        id: `temp-${Date.now()}`,
        name: newTool.name.trim(),
        description: newTool.description.trim(),
        monthlyCost: newTool.monthlyCost,
      },
    ]);
    setIsAdding(false);
    setNewTool({ catalogId: '', name: '', description: '', monthlyCost: 0, monthlyCostDisplay: '' });
  };

  const startEdit = (tool: LocalTool) => {
    setEditingId(tool.id);
    setEditData({
      name: tool.name,
      description: tool.description,
      monthlyCost: tool.monthlyCost,
      monthlyCostDisplay: formatCurrencyMask(tool.monthlyCost),
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({ name: '', description: '', monthlyCost: 0, monthlyCostDisplay: '' });
  };

  const saveEdit = (id: string) => {
    if (!editData.name.trim()) return;
    onChange(
      tools.map((t) =>
        t.id === id
          ? { ...t, name: editData.name.trim(), description: editData.description.trim(), monthlyCost: editData.monthlyCost }
          : t
      )
    );
    setEditingId(null);
  };

  const handleDelete = (id: string) => onChange(tools.filter((t) => t.id !== id));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Ferramentas e Assinaturas
          </CardTitle>
          <CardDescription>Ferramentas pagas para {employeeName}</CardDescription>
        </div>
        {!isAdding && availableOptions.length > 0 && (
          <Button type="button" onClick={() => setIsAdding(true)} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Adicionar
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {tools.length === 0 && !isAdding ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma ferramenta cadastrada. Clique em "Adicionar" para incluir.
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
                        <Select value={newTool.catalogId} onValueChange={handleSelectCatalog}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecione do catálogo" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableOptions.map((opt) => (
                              <SelectItem key={opt.id} value={opt.id}>
                                {opt.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={handleAdd}
                            disabled={!newTool.name.trim()}
                          >
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button
                            type="button"
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
                          formatCurrency(tool.monthlyCost)
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === tool.id ? (
                          <div className="flex gap-1">
                            <Button type="button" size="icon" variant="ghost" onClick={() => saveEdit(tool.id)}>
                              <Check className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button type="button" size="icon" variant="ghost" onClick={cancelEdit}>
                              <X className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex gap-1">
                            <Button type="button" size="icon" variant="ghost" onClick={() => startEdit(tool)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button type="button" size="icon" variant="ghost" onClick={() => handleDelete(tool.id)}>
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
    </Card>
  );
}
