import { LegalPage } from '@/landing/LegalPage';
import { LEGAL } from '@/landing/content';

/** `/privacidade`: pré-renderizada no build com título e description próprios (PUL-240). Texto em `content.ts`. */
const Privacy = () => <LegalPage document={LEGAL.privacy} />;

export default Privacy;
