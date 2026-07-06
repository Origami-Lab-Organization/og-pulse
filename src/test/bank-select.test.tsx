import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BankSelect } from '@/components/employees/BankSelect';

// cmdk chama scrollIntoView em itens do Command; jsdom não implementa
HTMLElement.prototype.scrollIntoView = vi.fn();

// Radix Popover usa ResizeObserver internamente
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('BankSelect', () => {
  it('exibe placeholder quando nenhum banco está selecionado', () => {
    render(<BankSelect value={null} onChange={vi.fn()} />);
    expect(screen.getByText('Selecione o banco')).toBeInTheDocument();
  });

  it('exibe o nome do banco selecionado', () => {
    render(<BankSelect value="260 - Nubank" onChange={vi.fn()} />);
    expect(screen.getByText('260 - Nubank')).toBeInTheDocument();
  });

  it('não exibe botão de limpar quando sem valor', () => {
    render(<BankSelect value={null} onChange={vi.fn()} />);
    // X é um ícone inline; sem valor, não deve haver SVG de clear clicável
    const trigger = screen.getByRole('combobox');
    expect(trigger).toBeInTheDocument();
    // botão X só aparece quando há valor — verifica que não há dois SVGs
    const svgs = trigger.querySelectorAll('svg');
    expect(svgs).toHaveLength(1); // só ChevronsUpDown
  });

  it('exibe botão de limpar quando há valor selecionado', () => {
    render(<BankSelect value="341 - Itau" onChange={vi.fn()} />);
    const trigger = screen.getByRole('combobox');
    const svgs = trigger.querySelectorAll('svg');
    expect(svgs).toHaveLength(2); // X + ChevronsUpDown
  });

  it('chama onChange(null) ao clicar no botão de limpar', () => {
    const onChange = vi.fn();
    render(<BankSelect value="237 - Bradesco" onChange={onChange} />);

    const trigger = screen.getByRole('combobox');
    const xIcon = trigger.querySelectorAll('svg')[0]; // primeiro svg = X
    fireEvent.click(xIcon);

    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('abre o dropdown ao clicar no trigger', async () => {
    render(<BankSelect value={null} onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('combobox'));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Buscar banco...')).toBeInTheDocument();
    });
  });

  it('filtra bancos pelo nome ao digitar na busca', async () => {
    render(<BankSelect value={null} onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('combobox'));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Buscar banco...')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('Buscar banco...'), {
      target: { value: 'nubank' },
    });

    await waitFor(() => {
      expect(screen.getByText('260 - Nubank')).toBeInTheDocument();
    });

    // Bradesco não deve aparecer neste filtro
    expect(screen.queryByText('237 - Bradesco')).not.toBeInTheDocument();
  });

  it('chama onChange com o label completo ao selecionar um banco', async () => {
    const onChange = vi.fn();
    render(<BankSelect value={null} onChange={onChange} />);
    fireEvent.click(screen.getByRole('combobox'));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Buscar banco...')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('Buscar banco...'), {
      target: { value: 'nubank' },
    });

    await waitFor(() => {
      expect(screen.getByText('260 - Nubank')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('260 - Nubank'));

    expect(onChange).toHaveBeenCalledWith('260 - Nubank');
  });

  it('exibe mensagem quando banco não é encontrado', async () => {
    render(<BankSelect value={null} onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('combobox'));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Buscar banco...')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('Buscar banco...'), {
      target: { value: 'xyzxyzxyz' },
    });

    await waitFor(() => {
      expect(screen.getByText('Banco não encontrado.')).toBeInTheDocument();
    });
  });

  it('não chama onChange ao clicar no trigger (apenas abre/fecha)', () => {
    const onChange = vi.fn();
    render(<BankSelect value={null} onChange={onChange} />);
    fireEvent.click(screen.getByRole('combobox'));
    expect(onChange).not.toHaveBeenCalled();
  });
});
