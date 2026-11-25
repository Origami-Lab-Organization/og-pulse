import { Navigate, useParams } from 'react-router-dom';

/**
 * A página de cada linha virou uma aba do Catálogo de serviços (US-0046). O endereço antigo
 * continua respondendo, porque link salvo e favorito não sabem que a tela mudou.
 */
const ServiceLineDetail = () => {
  const { lineId = '' } = useParams<{ lineId: string }>();
  return <Navigate to={`/admin/servicos?linha=${encodeURIComponent(lineId)}`} replace />;
};

export default ServiceLineDetail;
