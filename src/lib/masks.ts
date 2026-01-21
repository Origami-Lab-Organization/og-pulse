// Format phone number: (11) 99999-9999
export const formatPhone = (value: string): string => {
  const numbers = value.replace(/\D/g, '').slice(0, 11);
  
  if (numbers.length <= 2) {
    return numbers.length ? `(${numbers}` : '';
  }
  if (numbers.length <= 7) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  }
  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
};

// Format CPF: 000.000.000-00
export const formatCPF = (value: string): string => {
  const numbers = value.replace(/\D/g, '').slice(0, 11);
  
  if (numbers.length <= 3) {
    return numbers;
  }
  if (numbers.length <= 6) {
    return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
  }
  if (numbers.length <= 9) {
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
  }
  return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9)}`;
};

// Format currency: R$ 1.234,56
export const formatCurrency = (value: string | number): string => {
  // If it's already a number, format it directly
  if (typeof value === 'number') {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  }

  // Remove all non-digit characters
  const numbers = value.replace(/\D/g, '');
  
  if (!numbers) return '';
  
  // Convert to cents then to reais
  const amount = parseInt(numbers, 10) / 100;
  
  return amount.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
};

// Parse currency string back to number
export const parseCurrency = (value: string): number => {
  if (!value) return 0;
  
  // Remove currency symbol and spaces
  const cleaned = value.replace(/[R$\s.]/g, '').replace(',', '.');
  
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

// Unformat phone (get only numbers)
export const unformatPhone = (value: string): string => {
  return value.replace(/\D/g, '');
};

// Unformat CPF (get only numbers)
export const unformatCPF = (value: string): string => {
  return value.replace(/\D/g, '');
};
