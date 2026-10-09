-- Bio havolalari endi to'g'ridan-to'g'ri BOTGA olib boradi: odam /start
-- bosgan zahoti kimdan/qayerdan kelgani aniqlanadi (oraliq sahifasiz).
update public.havolalar set maqsad = 'bot' where kod in ('ig', 'tt') and maqsad = 'skan';
alter table public.havolalar alter column maqsad set default 'bot';
