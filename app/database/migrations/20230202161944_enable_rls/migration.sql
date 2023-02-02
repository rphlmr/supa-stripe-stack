-- Enable RLS
alter table "_prisma_migrations" ENABLE row level security;

alter table "notes" ENABLE row level security;

alter table "prices" ENABLE row level security;

alter table "prices_currencies" ENABLE row level security;

alter table "subscriptions" ENABLE row level security;

alter table "users" ENABLE row level security;

alter table "tiers" ENABLE row level security;

alter table "tiers_limit" ENABLE row level security;