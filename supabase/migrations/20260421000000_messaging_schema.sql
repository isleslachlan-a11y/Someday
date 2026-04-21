-- ============================================================
-- Migration: messaging schema
-- Date: 2026-04-21
--
-- Creates the conversations + messages system supporting:
--   - DMs between accepted friends
--   - Group chats (free-form)
--   - Trip-linked chats (conversation.trip_id)
--
-- No existing messages table exists — creating from scratch.
-- The 'messages' table was listed as Planned in CLAUDE.md.
--
-- Tables created:
--   1. conversations
--   2. conversation_members
--   3. messages
--
-- Includes:
--   - updated_at trigger on conversations (bumped by new messages)
--   - Realtime enabled on messages
--   - Full RLS policies
-- ============================================================


-- ─── 1. conversations ────────────────────────────────────────────────────────

create table public.conversations (
  id           uuid        primary key default gen_random_uuid(),
  type         text        not null check (type in ('dm', 'group', 'trip')),
  title        text,       -- null for DMs, set for group/trip chats
  trip_id      uuid        references public.trips(id) on delete cascade,
  created_by   uuid        references public.profiles(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table  public.conversations          is 'Chat rooms: DMs between friends, group chats, or trip-linked chats.';
comment on column public.conversations.type     is 'dm = direct message, group = free-form group, trip = linked to a trip';
comment on column public.conversations.title    is 'Null for DMs; required for group and trip chats.';
comment on column public.conversations.trip_id  is 'FK to trips — only set when type = trip.';


-- ─── 2. conversation_members ─────────────────────────────────────────────────

create table public.conversation_members (
  conversation_id uuid        not null references public.conversations(id) on delete cascade,
  user_id         uuid        not null references public.profiles(id) on delete cascade,
  joined_at       timestamptz not null default now(),
  last_read_at    timestamptz,
  primary key (conversation_id, user_id)
);

comment on table  public.conversation_members              is 'Membership table for conversations. Tracks last_read_at for unread counts.';
comment on column public.conversation_members.last_read_at is 'Timestamp of last message the user has read — used for unread badge.';

create index idx_conv_members_user on public.conversation_members (user_id);


-- ─── 3. messages ─────────────────────────────────────────────────────────────

create table public.messages (
  id              uuid        primary key default gen_random_uuid(),
  conversation_id uuid        not null references public.conversations(id) on delete cascade,
  sender_id       uuid        not null references public.profiles(id),
  content         text        not null,
  message_type    text        not null default 'text'
                              check (message_type in ('text', 'place', 'trip_invite')),
  metadata        jsonb,      -- place shares: { place_id, place_name, place_type, place_country }
  created_at      timestamptz not null default now(),
  edited_at       timestamptz
);

comment on table  public.messages               is 'Individual messages within a conversation.';
comment on column public.messages.message_type  is 'text = plain, place = place card share, trip_invite = trip invitation';
comment on column public.messages.metadata      is 'Payload for non-text messages, e.g. { place_id, place_name } for place shares.';

create index idx_messages_conversation on public.messages (conversation_id, created_at desc);
create index idx_messages_sender       on public.messages (sender_id);


-- ─── 4. updated_at trigger on conversations ───────────────────────────────────
-- Reuse set_updated_at() defined in the friendships migration.
-- Also define a new trigger to bump conversation.updated_at when a message
-- is inserted (so conversation list is ordered by latest activity).

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger conversations_updated_at
  before update on public.conversations
  for each row execute function public.set_updated_at();

-- Bump conversation.updated_at after every message insert
create or replace function public.bump_conversation_updated_at()
returns trigger language plpgsql security definer as $$
begin
  update public.conversations
  set updated_at = now()
  where id = new.conversation_id;
  return new;
end;
$$;

create trigger messages_bump_conversation
  after insert on public.messages
  for each row execute function public.bump_conversation_updated_at();


-- ─── 5. Row Level Security ───────────────────────────────────────────────────

-- Helper: is auth.uid() a member of the given conversation?
-- Defined as an inline subquery in each policy (avoids function ownership issues).

-- conversations: members can read; no direct user insert/update (via admin in server actions)
alter table public.conversations enable row level security;

create policy "conversations_member_select"
  on public.conversations for select
  to authenticated
  using (
    exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = id
        and cm.user_id = auth.uid()
    )
  );

-- conversation_members: users can read their own rows; update last_read_at
alter table public.conversation_members enable row level security;

create policy "conv_members_own_select"
  on public.conversation_members for select
  to authenticated
  using (user_id = auth.uid());

create policy "conv_members_own_update"
  on public.conversation_members for update
  to authenticated
  using (user_id = auth.uid());

-- messages: members can read; members can insert their own
alter table public.messages enable row level security;

create policy "messages_member_select"
  on public.messages for select
  to authenticated
  using (
    exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = conversation_id
        and cm.user_id = auth.uid()
    )
  );

create policy "messages_member_insert"
  on public.messages for insert
  to authenticated
  with check (
    sender_id = auth.uid() and
    exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = conversation_id
        and cm.user_id = auth.uid()
    )
  );

create policy "messages_sender_update"
  on public.messages for update
  to authenticated
  using (sender_id = auth.uid());


-- ─── 6. Realtime ─────────────────────────────────────────────────────────────
-- Enable Supabase Realtime for live message delivery.

alter publication supabase_realtime add table public.messages;
