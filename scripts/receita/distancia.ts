/**
 * Distância em linha reta da sede de Formiga à sede do município da empresa (US-0015), pela
 * fórmula de haversine. A carga usa isto para gravar `pulse.empresas.distancia_km`.
 */

/** "MG|FORMIGA": UF e nome sem acento, em maiúsculas, como a Receita escreve. */
export function chaveDoMunicipio(uf: string, nome: string): string {
  const semAcento = nome.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
  return `${uf.toUpperCase()}|${semAcento.replace(/[^A-Z0-9]+/g, ' ').trim()}`;
}

const RAIO_DA_TERRA_KM = 6371.0088;
const radianos = (graus: number) => (graus * Math.PI) / 180;

/** Km inteiros, truncados, entre dois pontos [latitude, longitude]. */
export function kmEntre([lat1, lon1]: readonly [number, number], [lat2, lon2]: readonly [number, number]): number {
  const h = Math.sin(radianos(lat2 - lat1) / 2) ** 2
    + Math.cos(radianos(lat1)) * Math.cos(radianos(lat2)) * Math.sin(radianos(lon2 - lon1) / 2) ** 2;
  return Math.trunc(2 * RAIO_DA_TERRA_KM * Math.asin(Math.sqrt(h)));
}
