import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MessageRow } from '@/components/email/MessageRow';
import { ReadingPane } from '@/components/email/ReadingPane';
import { MAIL_CLASSIFICATION } from '@/types/microsoftGraph';
import type { MailMessage } from '@/types/microsoftGraph';

const MESSAGE: MailMessage = {
  id: 'm1',
  subject: 'Tecnologia não é só programação',
  from: 'Professor Gustavo Guanabara',
  preview: 'Hardware, redes, Linux e segurança',
  receivedAt: '2026-10-20T14:31:00Z',
  isRead: false,
  webLink: null,
  classification: MAIL_CLASSIFICATION.FOCUSED,
  to: ['Lucas Couto'],
};

describe('coluna de leitura', () => {
  it('sem e-mail aberto, convida a selecionar um', () => {
    render(<ReadingPane messageId={null} />);
    expect(screen.getByText('Selecione um e-mail para ler.')).toBeInTheDocument();
  });
});

describe('MessageRow', () => {
  it('o e-mail aberto ao lado fica marcado como atual', () => {
    render(
      <ul>
        <MessageRow message={MESSAGE} onOpen={vi.fn()} selected />
      </ul>,
    );
    const row = screen.getByRole('button', { name: /Tecnologia não é só programação/ });
    expect(row).toHaveAttribute('aria-current', 'true');
  });

  it('em Enviados mostra para quem foi', () => {
    render(
      <ul>
        <MessageRow message={MESSAGE} onOpen={vi.fn()} showRecipients />
      </ul>,
    );
    expect(screen.getByText('Para: Lucas Couto')).toBeInTheDocument();
    expect(screen.queryByText('Professor Gustavo Guanabara')).not.toBeInTheDocument();
  });
});
