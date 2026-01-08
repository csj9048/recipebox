-- Create meal_plans table
create table if not exists public.meal_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner')),
  recipe_id uuid references public.recipes(id) on delete set null,
  custom_text text,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.meal_plans enable row level security;

-- Policies
create policy "Users can view their own meal plans"
  on public.meal_plans for select
  using (auth.uid() = user_id);

create policy "Users can create their own meal plans"
  on public.meal_plans for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own meal plans"
  on public.meal_plans for delete
  using (auth.uid() = user_id);
