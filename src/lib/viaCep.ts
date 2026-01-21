export interface ViaCepResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

export interface AddressData {
  logradouro: string;
  bairro: string;
  cidade: string;
  estado: string;
}

export const fetchAddressByCep = async (cep: string): Promise<AddressData | null> => {
  const cleanCep = cep.replace(/\D/g, '');
  
  if (cleanCep.length !== 8) {
    return null;
  }

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
    
    if (!response.ok) {
      return null;
    }

    const data: ViaCepResponse = await response.json();

    if (data.erro) {
      return null;
    }

    return {
      logradouro: data.logradouro || '',
      bairro: data.bairro || '',
      cidade: data.localidade || '',
      estado: data.uf || '',
    };
  } catch (error) {
    console.error('Error fetching address from ViaCEP:', error);
    return null;
  }
};
