-- Edge Functions gebruiken de service-role key (rate limits, username-login, product-cache).
-- service_role had geen DML-rechten meer op public-tabellen, waardoor alle functions 500 gaven.
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
alter default privileges in schema public grant select, insert, update, delete on tables to service_role;
alter default privileges in schema public grant usage, select on sequences to service_role;
