create table public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  text text not null,
  is_completed boolean default false,
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.shopping_items enable row level security;

-- Policies
create policy "Users can view their own shopping items"
  on public.shopping_items for select
  using (auth.uid() = user_id);

create policy "Users can insert their own shopping items"
  on public.shopping_items for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own shopping items"
  on public.shopping_items for update
  using (auth.uid() = user_id);

create policy "Users can delete their own shopping items"
  on public.shopping_items for delete
  using (auth.uid() = user_id);
