import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DateInput } from '@/components/ui/date-input';

function getField() {
  return screen.getByLabelText('Data de início') as HTMLInputElement;
}

describe('DateInput', () => {
  it('aplica a máscara dd/MM/yyyy automaticamente enquanto digita', () => {
    render(<DateInput value={undefined} onChange={vi.fn()} ariaLabel="Data de início" />);
    const field = getField();

    fireEvent.change(field, { target: { value: '01012025' } });
    expect(field.value).toBe('01/01/2025');
  });

  it('insere as barras progressivamente e ignora caracteres não numéricos', () => {
    render(<DateInput value={undefined} onChange={vi.fn()} ariaLabel="Data de início" />);
    const field = getField();

    fireEvent.change(field, { target: { value: '15' } });
    expect(field.value).toBe('15');

    fireEvent.change(field, { target: { value: '15a06b' } });
    expect(field.value).toBe('15/06');
  });

  it('dispara onChange com a Date correta ao completar uma data válida', () => {
    const onChange = vi.fn();
    render(<DateInput value={undefined} onChange={onChange} ariaLabel="Data de início" />);

    fireEvent.change(getField(), { target: { value: '10032026' } });

    expect(onChange).toHaveBeenCalledTimes(1);
    const arg = onChange.mock.calls[0][0] as Date;
    expect(arg.getFullYear()).toBe(2026);
    expect(arg.getMonth()).toBe(2); // março = índice 2
    expect(arg.getDate()).toBe(10);
  });

  it('marca aria-invalid e não dispara onChange para data impossível (31/02)', () => {
    const onChange = vi.fn();
    render(<DateInput value={undefined} onChange={onChange} ariaLabel="Data de início" />);
    const field = getField();

    fireEvent.change(field, { target: { value: '31022025' } });

    expect(field.value).toBe('31/02/2025');
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('dispara onChange(undefined) ao limpar o campo', () => {
    const onChange = vi.fn();
    render(<DateInput value={new Date(2026, 0, 1)} onChange={onChange} ariaLabel="Data de início" />);
    const field = getField();

    fireEvent.change(field, { target: { value: '' } });

    expect(onChange).toHaveBeenCalledWith(undefined);
  });

  it('reflete no texto o valor recebido por prop (escolha externa/calendário)', () => {
    const { rerender } = render(
      <DateInput value={undefined} onChange={vi.fn()} ariaLabel="Data de início" />,
    );
    expect(getField().value).toBe('');

    rerender(<DateInput value={new Date(2026, 5, 19)} onChange={vi.fn()} ariaLabel="Data de início" />);
    expect(getField().value).toBe('19/06/2026');
  });
});
