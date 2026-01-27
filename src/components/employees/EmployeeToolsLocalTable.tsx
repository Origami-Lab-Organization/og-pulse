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
import { formatCurrency } from '@/lib/formatters';
import { formatCurrency as formatCurrencyMask, parseCurrency } from '@/lib/masks';
import { Plus, Pencil, Trash2, Check, X, Wrench } from 'lucide-react';

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
  employeeName = 'Funcionário' 
}: EmployeeToolsLocalTableProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [newTool, setNewTool] = useState({
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

  const totalCost = tools.reduce((sum, tool) => sum + tool.monthlyCost, 0);

  const handleAdd = () => {
    if (!newTool.name.trim()) return;
    
    const newItem: LocalTool = {
      id: `temp-${Date.now()}`,
      name: newTool.name.trim(),
      description: newTool.description.trim(),
      monthlyCost: newTool.monthlyCost,
    };
    
    onChange([...tools, newItem]);
    setIsAdding(false);
    setNewTool({ name: '', description: '', monthlyCost: 0, monthlyCostDisplay: '' });
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
    
    onChange(tools.map(t => 
      t.id === id 
        ? { ...t, name: editData.name.trim(), description: editData.description.trim(), monthlyCost: editData.monthlyCost }
        : t
    ));
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    onChange(tools.filter(t => t.id !== id));
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Ferramentas e Assinaturas
          </CardTitle>
          <CardDescription>
            Ferramentas pagas para {employeeName}
          </CardDescription>
        </div>
        {!isAdding && (
          <Button onClick={() => setIsAdding(true)} size="sm">
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
                      <TableCell>
                        <Input
                          value={newTool.name}
                          onChange={(e) => setNewTool({ ...newTool, name: e.target.value })}
                          placeholder="Ex: Lovable, Figma..."
                          className="w-full"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={newTool.description}
                          onChange={(e) => setNewTool({ ...newTool, description: e.target.value })}
                          placeholder="Descrição (opcional)"
                          className="w-full"
                        />
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
                            disabled={!newTool.name.trim()}
                          >
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setIsAdding(false);
                              setNewTool({ name: '', description: '', monthlyCost: 0, monthlyCostDisplay: '' });
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
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => saveEdit(tool.id)}
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
                              onClick={() => handleDelete(tool.id)}
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
    </Card>
  );
}
