import { useMemo, useState } from 'react';
import { AuthError } from '@azure/msal-browser';
import { Check, DoorOpen, MapPin, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
  describeGraphError,
  useMeetingRooms,
  useRoomsAvailability,
} from '@/hooks/useMicrosoftGraph';
import { GraphError } from '@/services/microsoftGraphService';
import { GRAPH_ERROR_CODE, ROOM_AVAILABILITY } from '@/types/microsoftGraph';
import type { LocationValue } from '@/types/agenda';
import type { MeetingRoom, RoomAvailability } from '@/types/microsoftGraph';

interface LocationPickerProps {
  value: LocationValue;
  onChange: (value: LocationValue) => void;
  /** Início e fim do compromisso (`yyyy-MM-ddTHH:mm:ss`, local); `null` enquanto o horário é inválido. */
  start: string | null;
  end: string | null;
  /** Sala já reservada pelo evento em edição — ocupada por ele mesmo, não por outro. */
  bookedRoomEmail?: string | null;
}

const AVAILABILITY_LABEL: Record<RoomAvailability, string> = {
  [ROOM_AVAILABILITY.FREE]: 'Livre',
  [ROOM_AVAILABILITY.BUSY]: 'Ocupada',
  [ROOM_AVAILABILITY.UNKNOWN]: 'Sem informação',
};

const AVAILABILITY_STYLE: Record<RoomAvailability, string> = {
  [ROOM_AVAILABILITY.FREE]: 'bg-success/15 text-success',
  [ROOM_AVAILABILITY.BUSY]: 'bg-destructive/10 text-destructive',
  [ROOM_AVAILABILITY.UNKNOWN]: 'bg-muted text-muted-foreground',
};

/** Livres primeiro; dentro de cada grupo, a ordem alfabética da lista. */
const AVAILABILITY_ORDER: Record<RoomAvailability, number> = {
  [ROOM_AVAILABILITY.FREE]: 0,
  [ROOM_AVAILABILITY.UNKNOWN]: 1,
  [ROOM_AVAILABILITY.BUSY]: 2,
};

/** Sem consentimento de `Place.Read.All` a falha chega como 403 do Graph ou erro de autorização da MSAL. */
function describeRoomsError(error: unknown): string {
  const missingConsent =
    error instanceof AuthError ||
    (error instanceof GraphError && error.code === GRAPH_ERROR_CODE.FORBIDDEN);
  if (missingConsent) {
    return 'Para listar as salas, o administrador do Microsoft 365 precisa aprovar a permissão de salas (Place.Read.All) para o Pulse. Enquanto isso, digite o local.';
  }
  return describeGraphError(error);
}

function roomDetails(room: MeetingRoom): string {
  return [room.capacity ? `até ${room.capacity} pessoas` : null, room.building, room.floorLabel]
    .filter(Boolean)
    .join(' · ');
}

/** Livre/ocupada só existe com horário válido e consulta bem-sucedida. */
function useAvailabilityOf(rooms: MeetingRoom[], start: string | null, end: string | null, open: boolean) {
  const emails = useMemo(() => rooms.map((room) => room.email), [rooms]);
  const query = useRoomsAvailability(emails, start, end, open);
  const availabilityOf = (room: MeetingRoom): RoomAvailability =>
    query.data?.[room.email] ?? ROOM_AVAILABILITY.UNKNOWN;
  return { availabilityOf, isChecking: query.isLoading && Boolean(start && end) };
}

function AvailabilityTag({ availability, booked }: { availability: RoomAvailability; booked: boolean }) {
  const label = booked ? 'Reservada' : AVAILABILITY_LABEL[availability];
  const style = booked ? 'bg-primary/10 text-primary' : AVAILABILITY_STYLE[availability];
  return (
    <span className={cn('shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium', style)}>
      {label}
    </span>
  );
}

interface RoomsStatusProps {
  rooms: ReturnType<typeof useMeetingRooms>;
  hasTime: boolean;
}

/** Mensagem do grupo de salas: carregando, sem permissão, vazio ou falta horário. */
function RoomsStatus(props: RoomsStatusProps) {
  const { rooms, hasTime } = props;
  const className = 'px-2 py-3 text-sm text-muted-foreground';

  if (rooms.isLoading) return <p className={className}>Carregando salas...</p>;
  if (rooms.isError) {
    return <p className={className} role="status">{describeRoomsError(rooms.error)}</p>;
  }
  if (rooms.data?.length === 0) {
    return <p className={className}>Nenhuma sala de reunião cadastrada no Microsoft 365 da empresa.</p>;
  }
  if (!hasTime) {
    return (
      <p className="px-2 pb-1 text-xs text-muted-foreground">
        Ajuste data e horário para ver quais salas estão livres.
      </p>
    );
  }
  return null;
}

interface FreeTextGroupProps {
  typed: string;
  label: string;
  onPick: (value: LocationValue) => void;
}

/** "Usar o que digitei como local" e "Remover local". */
function FreeTextGroup(props: FreeTextGroupProps) {
  const { typed, label, onPick } = props;
  if (!typed && !label) return null;

  return (
    <CommandGroup heading="Local">
      {typed && (
        <CommandItem value={`usar-local ${typed}`} onSelect={() => onPick({ location: typed, room: null })}>
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          Usar “{typed}” como local
        </CommandItem>
      )}
      {label && (
        <CommandItem value={`remover-local ${label}`} onSelect={() => onPick({ location: '', room: null })}>
          <X className="mr-2 h-4 w-4" aria-hidden="true" />
          Remover local
        </CommandItem>
      )}
    </CommandGroup>
  );
}

interface RoomItemProps {
  room: MeetingRoom;
  selected: boolean;
  booked: boolean;
  availability: RoomAvailability;
  isChecking: boolean;
  onSelect: () => void;
}

function RoomItem(props: RoomItemProps) {
  const { room, selected, booked, availability, isChecking, onSelect } = props;
  const details = roomDetails(room);

  return (
    <CommandItem value={`${room.name} ${room.email} ${room.building ?? ''}`} onSelect={onSelect}>
      <Check
        className={cn('mr-2 h-4 w-4 shrink-0', selected ? 'opacity-100' : 'opacity-0')}
        aria-hidden="true"
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate">{room.name}</span>
        {details && <span className="truncate text-xs text-muted-foreground">{details}</span>}
      </div>
      {isChecking ? (
        <span className="shrink-0 text-[11px] text-muted-foreground">verificando…</span>
      ) : (
        <AvailabilityTag availability={availability} booked={booked} />
      )}
    </CommandItem>
  );
}

/**
 * Local do compromisso: sala de reunião do Microsoft 365, com livre/ocupada no
 * horário escolhido, ou texto livre (endereço, "online").
 */
export function LocationPicker(props: LocationPickerProps) {
  const { value, onChange, start, end, bookedRoomEmail = null } = props;
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const rooms = useMeetingRooms(open);
  const roomList = rooms.data ?? [];
  const { availabilityOf, isChecking } = useAvailabilityOf(roomList, start, end, open);
  const sortedRooms = [...roomList].sort(
    (a, b) => AVAILABILITY_ORDER[availabilityOf(a)] - AVAILABILITY_ORDER[availabilityOf(b)],
  );

  const pick = (next: LocationValue) => {
    onChange(next);
    setOpen(false);
    setSearch('');
  };

  const label = value.room?.name || value.location;
  const Icon = value.room ? DoorOpen : MapPin;

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className="w-full justify-start font-normal">
          <Icon className="mr-2 h-4 w-4 shrink-0" aria-hidden="true" />
          <span className={cn('truncate', !label && 'text-muted-foreground')}>
            {label || 'Escolher sala ou digitar local'}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter>
          <CommandInput
            placeholder="Buscar sala ou digitar local..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList className="max-h-72">
            <CommandEmpty>Nenhuma sala com esse nome.</CommandEmpty>
            <FreeTextGroup typed={search.trim()} label={label} onPick={pick} />
            <CommandGroup heading="Salas de reunião">
              <RoomsStatus rooms={rooms} hasTime={Boolean(start && end)} />
              {sortedRooms.map((room) => (
                <RoomItem
                  key={room.email}
                  room={room}
                  selected={value.room?.email === room.email}
                  booked={room.email === bookedRoomEmail}
                  availability={availabilityOf(room)}
                  isChecking={isChecking}
                  onSelect={() => pick({ location: '', room: { email: room.email, name: room.name } })}
                />
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
