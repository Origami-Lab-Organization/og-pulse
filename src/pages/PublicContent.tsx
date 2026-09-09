import { useParams } from 'react-router-dom';
import { ContentPage } from '@/landing/ContentPage';
import { findContentPage } from '@/landing/pages';
import NotFound from '@/pages/NotFound';

/** Rota `/:slug` (PUL-242): resolve a página de conteúdo pelo slug; desconhecido cai na 404. */
const PublicContent = () => {
  const { slug = '' } = useParams();
  const page = findContentPage(`/${slug}`);
  return page ? <ContentPage page={page} /> : <NotFound />;
};

export default PublicContent;
