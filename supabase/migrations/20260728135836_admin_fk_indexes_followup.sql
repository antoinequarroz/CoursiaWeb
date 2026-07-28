create index if not exists commandes_liste_id_idx
  on public.commandes(liste_id);

create index if not exists community_recipe_moderation_decisions_decided_by_idx
  on public.community_recipe_moderation_decisions(decided_by);

create index if not exists community_recipe_submissions_photo_asset_id_idx
  on public.community_recipe_submissions(photo_asset_id);

create index if not exists content_entry_revisions_author_user_id_idx
  on public.content_entry_revisions(author_user_id);

create index if not exists favoris_recette_id_idx
  on public.favoris(recette_id);

create index if not exists ingredients_unite_defaut_idx
  on public.ingredients(unite_defaut);

create index if not exists offres_magasin_unite_idx
  on public.offres_magasin(unite);

create index if not exists produits_canoniques_ingredient_id_idx
  on public.produits_canoniques(ingredient_id);

create index if not exists recette_ingredients_ingredient_id_idx
  on public.recette_ingredients(ingredient_id);

create index if not exists recette_ingredients_unite_idx
  on public.recette_ingredients(unite);

create index if not exists recettes_auteur_id_idx
  on public.recettes(auteur_id);

create index if not exists recipe_import_reports_created_by_idx
  on public.recipe_import_reports(created_by);

create index if not exists recipe_media_assets_created_by_idx
  on public.recipe_media_assets(created_by);

create index if not exists recipe_publication_history_changed_by_idx
  on public.recipe_publication_history(changed_by);

create index if not exists signalements_moderateur_id_idx
  on public.signalements(moderateur_id);

create index if not exists signalements_signale_par_idx
  on public.signalements(signale_par);

create index if not exists support_user_procedures_requested_by_idx
  on public.support_user_procedures(requested_by);

create index if not exists synonymes_allergenes_allergene_id_idx
  on public.synonymes_allergenes(allergene_id);
