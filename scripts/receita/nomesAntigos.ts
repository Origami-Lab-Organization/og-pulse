/**
 * Municípios que a Receita grafa pelo nome antigo (UF + nome como a Receita escreve → código do
 * IBGE), conferidos à mão contra o IBGE (anexo da US-0015). Usado pelas sedes (distância) e pelos
 * nomes das cidades na tela.
 */
export const NOMES_ANTIGOS: Record<string, string> = {
  'RS|SANTANA DO LIVRAMENTO': '4317103',
  'SC|BALNEARIO DE PICARRAS': '4212809',
  'RJ|PARATI': '3303807',
  'PA|SANTA ISABEL DO PARA': '1506500',
  'MT|SANTO ANTONIO DO LEVERGER': '5107800',
  'MG|BRASOPOLIS': '3108909',
  'PA|ELDORADO DOS CARAJAS': '1502954',
  'BA|MUQUEM DE SAO FRANCISCO': '2922250',
  'BA|SANTA TERESINHA': '2928505',
  'TO|COUTO DE MAGALHAES': '1706001',
  'RR|SAO LUIZ': '1400605',
  'RN|ARES': '2401206',
  'TO|SAO VALERIO DA NATIVIDADE': '1720499',
  'RN|BOA SAUDE': '2405306',
  'TO|FORTALEZA DO TABOCAO': '1708254',
  'MG|AMPARO DA SERRA': '3102506',
  'SE|AMPARO DE SAO FRANCISCO': '2800100',
  'GO|BOM JESUS DE GOIAS': '5203500',
};
