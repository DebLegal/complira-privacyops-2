-- New-install migration. Run only on a reviewed, empty Complira schema.
-- Supabase supplies auth.uid(); the test harness provides an equivalent claims function.
begin;
create schema if not exists complira;
do $$ begin
 if exists(select 1 from pg_tables where schemaname='complira') then raise exception 'Existing Complira tables: write a reviewed incremental migration; refusing replacement'; end if;
 if not exists(select 1 from pg_roles where rolname='complira_server') then create role complira_server nologin nobypassrls; end if;
 if exists(select 1 from pg_roles where rolname='complira_server' and (rolsuper or rolbypassrls or rolcanlogin)) then raise exception 'Unsafe pre-existing complira_server role'; end if;
 if pg_has_role('authenticated','complira_server','MEMBER') then raise exception 'Runtime role must not be granted to authenticated'; end if;
end $$;
revoke all on schema complira from public,anon;
create table complira.organizations(id uuid primary key default gen_random_uuid(),name text not null check(length(trim(name)) between 1 and 160),created_by uuid not null,created_at timestamptz not null default now());
create table complira.memberships(organization_id uuid not null references complira.organizations(id),user_id uuid not null,role text not null check(role in ('owner','admin','editor','reviewer','viewer')),primary key(organization_id,user_id));
create table complira.workspaces(organization_id uuid primary key references complira.organizations(id),version integer not null default 1 check(version>0));
create table complira.records(organization_id uuid not null references complira.organizations(id),kind text not null check(kind in ('processing_activities','vendors','notice_versions','change_requests','findings','remediation_actions','evidence_records')),id text not null,data jsonb not null check(jsonb_typeof(data)='object'),version integer not null check(version>0),primary key(organization_id,kind,id),check(data->>'id'=id));
create unique index finding_fingerprints on complira.records(organization_id,(data->>'fingerprint')) where kind='findings' and data->>'fingerprint' is not null;
create unique index one_current_notice on complira.records(organization_id) where kind='notice_versions' and data->>'status' like 'current%';
create table complira.record_links(organization_id uuid not null,from_kind text not null,from_id text not null,to_kind text not null,to_id text not null,primary key(organization_id,from_kind,from_id,to_kind,to_id),foreign key(organization_id,from_kind,from_id) references complira.records(organization_id,kind,id),foreign key(organization_id,to_kind,to_id) references complira.records(organization_id,kind,id));
create table complira.review_requests(organization_id uuid not null references complira.organizations(id),subject_id text not null,requested_by uuid not null,subject_kind text generated always as (case when subject_id like 'NOTICE-%' then 'notice_versions' else 'findings' end) stored,primary key(organization_id,subject_id),foreign key(organization_id,requested_by) references complira.memberships(organization_id,user_id),foreign key(organization_id,subject_kind,subject_id) references complira.records(organization_id,kind,id));
create table complira.decisions(organization_id uuid not null references complira.organizations(id),id text not null,subject_id text not null,actor_id uuid not null default auth.uid(),data jsonb not null,created_at timestamptz not null default now(),primary key(organization_id,id));
create table complira.audit_events(organization_id uuid not null references complira.organizations(id),id text not null,actor_id uuid not null default auth.uid(),data jsonb not null,created_at timestamptz not null default now(),primary key(organization_id,id));
create table complira.invitations(id uuid primary key default gen_random_uuid(),organization_id uuid not null references complira.organizations(id),email text not null check(length(email)<255),role text not null check(role in ('admin','editor','reviewer','viewer')),token_hash text not null unique,expires_at timestamptz not null default now()+interval '48 hours',accepted_by uuid,invited_by uuid not null);
create table complira.request_results(organization_id uuid not null references complira.organizations(id),actor_id uuid not null,request_id uuid not null,request_hash text not null,response jsonb not null,primary key(organization_id,actor_id,request_id));
create function complira.member_role(org uuid) returns text language sql stable security definer set search_path=pg_catalog,complira as $$ select role from complira.memberships where organization_id=org and user_id=auth.uid() $$;
revoke all on function complira.member_role(uuid) from public;
grant usage on schema complira to authenticated,complira_server;
grant execute on function complira.member_role(uuid) to authenticated,complira_server;
do $$ declare t text; begin
 foreach t in array array['organizations','memberships','workspaces','records','record_links','review_requests','decisions','audit_events','invitations','request_results'] loop
  execute format('alter table complira.%I enable row level security',t);
  execute format('alter table complira.%I force row level security',t);
 end loop;
end $$;
create policy org_read on complira.organizations for select to authenticated,complira_server using (complira.member_role(id) is not null);
create policy members_read on complira.memberships for select to authenticated,complira_server using (complira.member_role(organization_id) is not null);
do $$ declare t text; begin
 foreach t in array array['workspaces','records','record_links','review_requests','decisions','audit_events','request_results'] loop
  execute format('create policy tenant_read on complira.%I for select to authenticated,complira_server using (complira.member_role(organization_id) is not null)',t);
  execute format('create policy trusted_write on complira.%I for all to complira_server using (complira.member_role(organization_id) in (''owner'',''admin'',''editor'',''reviewer'')) with check (complira.member_role(organization_id) in (''owner'',''admin'',''editor'',''reviewer''))',t);
 end loop;
end $$;
create policy invitation_read on complira.invitations for select to authenticated,complira_server using (complira.member_role(organization_id) in ('owner','admin'));
revoke all on all tables in schema complira from public,anon,authenticated;
grant select on complira.organizations,complira.memberships,complira.workspaces,complira.records,complira.record_links,complira.review_requests,complira.decisions,complira.audit_events to authenticated;
grant select on all tables in schema complira to complira_server;
grant insert,update on complira.records,complira.review_requests,complira.workspaces to complira_server;
grant insert,delete on complira.record_links to complira_server;
grant insert on complira.decisions,complira.audit_events,complira.request_results to complira_server;
create function complira.append_only() returns trigger language plpgsql as $$ begin raise exception 'Append-only history'; end $$;
create trigger protect_decisions before update or delete on complira.decisions for each row execute function complira.append_only();
create trigger protect_audit before update or delete on complira.audit_events for each row execute function complira.append_only();
create function complira.guard_decision() returns trigger language plpgsql set search_path=pg_catalog,complira as $$ declare requester uuid; begin
 if auth.uid() is null or complira.member_role(new.organization_id) is distinct from 'reviewer' then raise exception 'Reviewer required'; end if;
 select requested_by into requester from complira.review_requests where organization_id=new.organization_id and subject_id=new.subject_id;
 if requester is null or requester=auth.uid() then raise exception 'Independent request required; self-approval prohibited'; end if;
 if new.actor_id<>auth.uid() then raise exception 'Forged actor'; end if;
 return new;
end $$;
create trigger validate_decision before insert on complira.decisions for each row execute function complira.guard_decision();
create function complira.guard_record_review() returns trigger language plpgsql set search_path=pg_catalog,complira as $$ declare requester uuid; begin
 if (new.kind='findings' and ((new.data->>'state'='closed' and (tg_op='INSERT' or old.data->>'state' is distinct from 'closed')) or (tg_op='UPDATE' and old.data->>'state' in ('pending_closure','closed') and new.data->>'state'='open_action'))) or (new.kind='notice_versions' and ((new.data->>'status' like 'current%' and (tg_op='INSERT' or old.data->>'status' not like 'current%')) or (tg_op='UPDATE' and old.data->>'status'='pending_review' and new.data->>'status'='rejected'))) then
  if complira.member_role(new.organization_id) is distinct from 'reviewer' then raise exception 'Reviewer required'; end if;
  select requested_by into requester from complira.review_requests where organization_id=new.organization_id and subject_id=new.id;
  if requester is null or requester=auth.uid() then raise exception 'Independent request required; self-approval prohibited'; end if;
 end if;
 return new;
end $$;
create trigger validate_record_review before insert or update on complira.records for each row execute function complira.guard_record_review();
create function complira.guard_actor() returns trigger language plpgsql as $$ begin
 if auth.uid() is null or new.actor_id<>auth.uid() then raise exception 'Forged actor'; end if;
 return new;
end $$;
create trigger validate_audit_actor before insert on complira.audit_events for each row execute function complira.guard_actor();
create trigger validate_retry_actor before insert on complira.request_results for each row execute function complira.guard_actor();
create function complira.create_organization(org_name text) returns uuid language plpgsql security definer set search_path=pg_catalog,complira as $$ declare org uuid; begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 insert into complira.organizations(name,created_by) values(trim(org_name),auth.uid()) returning id into org;
 insert into complira.memberships values(org,auth.uid(),'owner');
 insert into complira.workspaces(organization_id) values(org);
 return org;
end $$;
create function complira.invite_member(org uuid,invite_email text,invite_role text,hash text) returns uuid language plpgsql security definer set search_path=pg_catalog,complira as $$ declare caller text; result uuid; begin
 caller=complira.member_role(org);
 if caller is null or caller not in ('owner','admin') or (invite_role='admin' and caller<>'owner') then raise exception 'Invitation permission denied'; end if;
 if length(hash)<>64 or invite_email !~ '^[^ @]+@[^ @]+[.][^ @]+$' then raise exception 'Invalid invitation'; end if;
 insert into complira.invitations(organization_id,email,role,token_hash,invited_by) values(org,lower(trim(invite_email)),invite_role,hash,auth.uid()) returning id into result;
 return result;
end $$;
create function complira.accept_invitation(hash text,verified_email text) returns uuid language plpgsql security definer set search_path=pg_catalog,complira as $$ declare invite complira.invitations; begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 select * into invite from complira.invitations where token_hash=hash and accepted_by is null and expires_at>now() for update;
 if invite.id is null or invite.email<>lower(verified_email) then raise exception 'Invalid or expired invitation'; end if;
 insert into complira.memberships values(invite.organization_id,auth.uid(),invite.role) on conflict do nothing;
 update complira.invitations set accepted_by=auth.uid() where id=invite.id;
 return invite.organization_id;
end $$;
revoke all on function complira.create_organization(text),complira.invite_member(uuid,text,text,text),complira.accept_invitation(text,text) from public,authenticated;
grant execute on function complira.create_organization(text),complira.invite_member(uuid,text,text,text),complira.accept_invitation(text,text) to complira_server;
-- No Storage bucket or object policy is created. Upload/download endpoints stay disabled.
-- Export reads are audited even for viewers; this function exposes no record mutation.
create function complira.record_export(org uuid,format text) returns void language plpgsql security definer set search_path=pg_catalog,complira as $$ declare event_id text; member text; begin
 member=complira.member_role(org);
 if member is null or format not in ('csv','json') then raise exception 'Export permission denied'; end if;
 event_id='EXPORT-'||gen_random_uuid()::text||'X';
 insert into complira.audit_events(organization_id,id,actor_id,data) values(org,event_id,auth.uid(),jsonb_build_object('id',event_id,'action','report_export','subject_id',org,'timestamp',now(),'persona',member,'actor_id',auth.uid(),'actor_role',member,'format',format));
end $$;
revoke all on function complira.record_export(uuid,text) from public,authenticated;
grant execute on function complira.record_export(uuid,text) to complira_server;
commit;
