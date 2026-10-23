import { useState } from 'react';
import { Inbox, Loader2, Mail, Search, X } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { MessageRow } from '@/components/email/MessageRow';
import { MessageDetailDialog } from '@/components/email/MessageDetailDialog';
import { MicrosoftConnectPrompt } from '@/components/microsoft/MicrosoftConnectPrompt';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MailFolderNav } from '@/components/email/MailFolderNav';
import { ReadingPane } from '@/components/email/ReadingPane';
import { useIsWideScreen } from '@/hooks/useIsWideScreen';
import { folderKey, showsRecipients } from '@/components/email/mailFolders';
import {
  describeGraphError,
  useFolderPages,
  useFolderSearch,
  useMailFolders,
  useMicrosoftConnection,
} from '@/hooks/useMicrosoftGraph';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { MAIL_CLASSIFICATION, WELL_KNOWN_FOLDER } from '@/types/microsoftGraph';
import type { MailClassification } from '@/types/microsoftGraph';

const PAGE_SIZE = 25;
const SEARCH_DEBOUNCE_MS = 400;
const MIN_SEARCH_LENGTH = 2;

function ListSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2, 3].map((row) => (
        <Skeleton key={row} className="h-20 w-full" />
      ))}
    </div>
  );
}

function EmptyInbox({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
        <Inbox className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  );
}

interface InboxListProps {
  query: ReturnType<typeof useFolderPages> | ReturnType<typeof useFolderSearch>;
  emptyMessage: string;
  onOpenMessage: (messageId: string) => void;
  /** Quando presente, mostra só a classificação pedida das páginas carregadas. */
  classification?: MailClassification;
  /** Enviados/Rascunhos mostram o destinatário no lugar do remetente. */
  showRecipients?: boolean;
  /** E-mail aberto na coluna de leitura, destacado na lista. */
  selectedId?: string | null;
}

/** Mensagens das páginas já carregadas, só da classificação pedida quando houver. */
function loadedMessages(query: InboxListProps['query'], classification?: MailClassification) {
  const loaded = (query.data?.pages ?? []).flatMap((page) => page.messages);
  if (!classification) return loaded;
  return loaded.filter((message) => message.classification === classification);
}

/** Lista paginada de uma classificação, com "carregar mais" ao final. */
function InboxList(props: InboxListProps) {
  const { query, emptyMessage, onOpenMessage, classification, showRecipients, selectedId } = props;
  if (query.isLoading) return <ListSkeleton />;

  if (query.error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{describeGraphError(query.error)}</AlertDescription>
      </Alert>
    );
  }

  const messages = loadedMessages(query, classification);

  if (!messages.length) return <EmptyInbox message={emptyMessage} />;

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {messages.map((message) => (
          <MessageRow
            key={message.id}
            message={message}
            onOpen={() => onOpenMessage(message.id)}
            showRecipients={showRecipients}
            selected={message.id === selectedId}
          />
        ))}
      </ul>

      {query.hasNextPage && (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => query.fetchNextPage()}
          disabled={query.isFetchingNextPage}
        >
          {query.isFetchingNextPage ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
          ) : null}
          Carregar mais
        </Button>
      )}
    </div>
  );
}

/**
 * Caixa de entrada, espelhando a visualização Destaques do Outlook.
 *
 * A separação entre Prioritários e Outros é o `inferenceClassification` que a
 * própria Microsoft calcula — o mesmo que alimenta as abas do Outlook. Não há
 * regra de classificação nossa aqui, então um e-mail cai na mesma aba nos dois
 * lugares.
 */
export default function MeusEmails() {
  const { isConfigured, isLoading, isConnected, connect, isConnecting } =
    useMicrosoftConnection();

  const [openMessageId, setOpenMessageId] = useState<string | null>(null);
  const [folder, setFolder] = useState<string>(WELL_KNOWN_FOLDER.INBOX);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedTerm = useDebouncedValue(searchTerm, SEARCH_DEBOUNCE_MS);
  const isSearching = debouncedTerm.trim().length >= MIN_SEARCH_LENGTH;

  const folders = useMailFolders(isConnected);
  const inbox = useFolderPages(folder, PAGE_SIZE, isConnected);
  const search = useFolderSearch(folder, debouncedTerm, PAGE_SIZE, isConnected);
  const folderName =
    folders.data?.find((item) => folderKey(item) === folder)?.name ?? 'Caixa de Entrada';
  const isInbox = folder === WELL_KNOWN_FOLDER.INBOX;
  // Tela larga lê na coluna da direita; estreita, na janela por cima.
  const isWide = useIsWideScreen();

  const listProps = {
    onOpenMessage: setOpenMessageId,
    showRecipients: showsRecipients(folder),
    selectedId: isWide ? openMessageId : null,
  };

  const changeFolder = (key: string) => {
    setFolder(key);
    setOpenMessageId(null);
  };

  const searchField = (
    <div className="relative">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        type="search"
        value={searchTerm}
        onChange={(changed) => setSearchTerm(changed.target.value)}
        placeholder={`Pesquisar em ${folderName}`}
        aria-label="Pesquisar e-mails"
        className="pl-9 pr-9"
      />
      {searchTerm && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
          aria-label="Limpar pesquisa"
          onClick={() => setSearchTerm('')}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </Button>
      )}
    </div>
  );

  const headerAction = isConnected ? (
    <Button asChild variant="outline" size="sm">
      <a href="https://outlook.office.com/mail/" target="_blank" rel="noopener noreferrer">
        <Mail className="mr-2 h-4 w-4" aria-hidden="true" />
        Abrir Outlook
      </a>
    </Button>
  ) : undefined;

  const renderBody = () => {
    if (!isConfigured) {
      return (
        <Alert>
          <AlertDescription>
            A integração com a Microsoft ainda não está configurada neste ambiente.
          </AlertDescription>
        </Alert>
      );
    }

    if (isLoading) return <ListSkeleton />;

    if (!isConnected) {
      return (
        <MicrosoftConnectPrompt
          icon={<Inbox className="h-8 w-8" aria-hidden="true" />}
          title="Conecte sua conta Microsoft"
          description="Autorize o acesso para ler seus e-mails aqui dentro do Pulse. Só você vê estas mensagens."
          onConnect={connect}
          isConnecting={isConnecting}
        />
      );
    }

    // Em tela larga cada coluna rola sozinha, como no Outlook.
    return (
      <div className="flex flex-col gap-6 md:flex-row lg:h-[calc(100vh-6.5rem)] lg:min-h-[32rem]">
        <div className="lg:overflow-y-auto">
          <MailFolderNav
            folders={folders.data}
            isLoading={folders.isLoading}
            selectedKey={folder}
            onSelect={changeFolder}
          />
        </div>
        <div className="min-w-0 flex-1 lg:w-[24rem] lg:flex-none lg:overflow-y-auto lg:pr-1">
          {renderFolder()}
        </div>
        {isWide && <ReadingPane messageId={openMessageId} />}
      </div>
    );
  };

  const renderFolder = () => {
    if (isSearching) {
      return (
        <div className="space-y-4">
          {searchField}
          <p className="text-sm text-muted-foreground">
            Resultados para "{debouncedTerm.trim()}" — por relevância, em {folderName}.
          </p>
          <InboxList
            query={search}
            emptyMessage="Nenhum e-mail encontrado."
            {...listProps}
          />
        </div>
      );
    }

    // Prioritários/Outros só existem na Caixa de Entrada, como no Outlook.
    if (!isInbox) {
      return (
        <div className="space-y-4">
          {searchField}
          <InboxList
            query={inbox}
            emptyMessage="Nenhum e-mail nesta pasta."
            {...listProps}
          />
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {searchField}
        <Tabs defaultValue={MAIL_CLASSIFICATION.FOCUSED} className="w-full">
          <TabsList>
            <TabsTrigger value={MAIL_CLASSIFICATION.FOCUSED}>Prioritários</TabsTrigger>
            <TabsTrigger value={MAIL_CLASSIFICATION.OTHER}>Outros</TabsTrigger>
          </TabsList>

          <TabsContent value={MAIL_CLASSIFICATION.FOCUSED} className="mt-4">
            <InboxList
              query={inbox}
              classification={MAIL_CLASSIFICATION.FOCUSED}
              emptyMessage="Nenhum e-mail prioritário entre os carregados."
              {...listProps}
            />
          </TabsContent>

          <TabsContent value={MAIL_CLASSIFICATION.OTHER} className="mt-4">
            <InboxList
              query={inbox}
              classification={MAIL_CLASSIFICATION.OTHER}
              emptyMessage="Nada em Outros entre os carregados."
              {...listProps}
            />
          </TabsContent>
        </Tabs>
      </div>
    );
  };

  return (
    <AppLayout
      title="E-mails"
      description="Sua caixa de entrada do Microsoft 365."
      actions={headerAction}
    >
      {renderBody()}

      <MessageDetailDialog
        messageId={isWide ? null : openMessageId}
        onOpenChange={(open) => !open && setOpenMessageId(null)}
      />
    </AppLayout>
  );
}
