with admin_user as (
  select id, email
  from auth.users
  where email = 'info@antoinequarroz.ch'
  limit 1
),
seeded_support_profile as (
  insert into public.support_user_profiles (user_id, email, account_status, app_version, subscription_tier)
  select id, email, 'active', 'web-admin-local', 'premium'
  from admin_user
  on conflict (user_id) do update set
    email = excluded.email,
    account_status = excluded.account_status,
    app_version = excluded.app_version,
    subscription_tier = excluded.subscription_tier,
    updated_at = now()
  returning user_id
),
seeded_revenuecat_event as (
  insert into public.revenuecat_events (
    id,
    user_id,
    type,
    entitlement,
    product_id,
    purchased_at,
    expires_at,
    received_at,
    payload_redacted
  )
  select
    'seed-admin-premium-2026-07-27',
    user_id,
    'INITIAL_PURCHASE',
    'premium',
    'coursia_premium_monthly',
    now() - interval '7 days',
    now() + interval '23 days',
    now(),
    '{"source":"seed","pii":"redacted"}'::jsonb
  from seeded_support_profile
  on conflict (id) do update set
    user_id = excluded.user_id,
    received_at = excluded.received_at,
    payload_redacted = excluded.payload_redacted
),
seeded_content as (
  insert into public.content_entries (
    key,
    kind,
    title,
    body,
    url,
    locale,
    status,
    publish_at,
    archive_at,
    metadata
  )
  values
    (
      'faq-allergies',
      'faq',
      'Comment Coursia gere les allergies ?',
      'Coursia conserve les allergies declarees pour filtrer les recettes et signaler les risques. Les donnees sensibles sont limitees au strict necessaire.',
      null,
      'fr-CH',
      'published',
      now(),
      null,
      '{"section":"faq","audience":"families"}'::jsonb
    ),
    (
      'home-main-cta',
      'marketing_text',
      'Planifiez vos repas sans perdre votre dimanche',
      'Une experience familiale, suisse et pratique pour relier recettes, courses et budget.',
      null,
      'fr-CH',
      'published',
      now(),
      null,
      '{"surface":"landing","slot":"hero"}'::jsonb
    ),
    (
      'support-contact-email',
      'link',
      'Contacter le support Coursia',
      null,
      'mailto:info@antoinequarroz.ch',
      'fr-CH',
      'published',
      now(),
      null,
      '{"surface":"footer"}'::jsonb
    ),
    (
      'launch-private-beta',
      'announcement',
      'Beta privee Coursia',
      'Les fonctions admin et catalogue sont en cours de validation avant ouverture publique.',
      null,
      'fr-CH',
      'draft',
      null,
      null,
      '{"severity":"info"}'::jsonb
    )
  on conflict (key) do update set
    kind = excluded.kind,
    title = excluded.title,
    body = excluded.body,
    url = excluded.url,
    locale = excluded.locale,
    status = excluded.status,
    publish_at = excluded.publish_at,
    archive_at = excluded.archive_at,
    metadata = excluded.metadata,
    updated_at = now(),
    archived_at = case when excluded.status = 'archived' then now() else null end
),
seeded_flags as (
  insert into public.feature_flags (key, name, description, enabled, critical, rollout_percentage)
  values
    (
      'admin-real-data-dashboard',
      'Dashboard admin donnees reelles',
      'Active les blocs relies aux tables Supabase mobiles et admin.',
      true,
      false,
      100
    ),
    (
      'community-moderation-queue',
      'File moderation communautaire',
      'Expose la file des futures recettes communautaires aux roles autorises.',
      true,
      false,
      100
    ),
    (
      'support-controlled-procedures',
      'Procedures support controlees',
      'Exige ticket, raison et audit pour export, suppression et blocage.',
      true,
      true,
      100
    )
  on conflict (key) do update set
    name = excluded.name,
    description = excluded.description,
    enabled = excluded.enabled,
    critical = excluded.critical,
    rollout_percentage = excluded.rollout_percentage,
    updated_at = now()
)
insert into public.community_recipe_submissions (
  title,
  status,
  priority,
  recipe_payload,
  source,
  rights,
  allergens,
  checklist
)
select *
from (
  values
    (
      'Gratin familial de courgettes',
      'pending',
      'high',
      '{"portions":4,"durationMinutes":35,"difficulty":"facile"}'::jsonb,
      'Soumission beta famille',
      'Photo et recette fournies par auteur, droits a confirmer',
      array['lait'],
      '{"recipeChecked":true,"photoChecked":false,"sourceChecked":true,"rightsChecked":false,"allergensChecked":true}'::jsonb
    ),
    (
      'Salade rapide quinoa avocat',
      'correction_requested',
      'normal',
      '{"portions":2,"durationMinutes":15,"difficulty":"facile"}'::jsonb,
      'Soumission communaute',
      'Texte original declare',
      array[]::text[],
      '{"recipeChecked":true,"photoChecked":true,"sourceChecked":true,"rightsChecked":true,"allergensChecked":false}'::jsonb
    )
) as seed(title, status, priority, recipe_payload, source, rights, allergens, checklist)
where not exists (
  select 1
  from public.community_recipe_submissions existing
  where existing.title = seed.title
    and existing.source = seed.source
);
