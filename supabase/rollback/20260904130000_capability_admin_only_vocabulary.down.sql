-- Rollback do vocabulário do grupo 5 (PUL-201 / TD-0019).
-- Só é aplicável depois de reverter as viradas 5a, 5b e 5c: a foreign key de
-- role_capabilities é ON DELETE RESTRICT, e policy que cite a capacidade continua citando.

DELETE FROM public.role_capabilities
 WHERE capability IN ('configuracao:editar', 'pessoa:administrar', 'ponto:travar-periodo');
DELETE FROM public.user_capability_overrides
 WHERE capability IN ('configuracao:editar', 'pessoa:administrar', 'ponto:travar-periodo');
DELETE FROM public.capabilities
 WHERE key IN ('configuracao:editar', 'pessoa:administrar', 'ponto:travar-periodo');
