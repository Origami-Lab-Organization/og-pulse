import { LegalPage } from '@/landing/LegalPage';
import { LEGAL } from '@/landing/content';

/** `/termos`: pré-renderizada no build com título e description próprios (PUL-240). Texto em `content.ts`. */
const Terms = () => <LegalPage document={LEGAL.terms} />;

export default Terms;
