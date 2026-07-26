import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('Supabase security hardening migration', () => {
  const migration = read('supabase/migrations/20260726213359_harden_public_views_functions_storage.sql')
  const deleteMigration = read('supabase/migrations/20260726213448_restrict_images_delete_policy.sql')

  it('enables security invoker on public views that expose table data', () => {
    for (const view of [
      'prix_anomalies',
      'prix_courant',
      'prix_doublons_suspects',
      'profils_actifs',
      'rapport_fraicheur_prix_par_enseigne',
      'recette_allergenes_effectifs',
      'recettes_a_moderer',
    ]) {
      expect(migration).toContain(`alter view if exists public.${view} set (security_invoker = true)`)
    }
  })

  it('removes public execution from the SECURITY DEFINER event trigger helper', () => {
    expect(migration).toContain('revoke execute on function public.rls_auto_enable() from public')
    expect(migration).toContain('revoke execute on function public.rls_auto_enable() from anon')
    expect(migration).toContain('revoke execute on function public.rls_auto_enable() from authenticated')
  })

  it('limits the public images bucket and supports authenticated upsert safely', () => {
    expect(migration).toContain('file_size_limit = 5242880')
    expect(migration).toContain("'image/jpeg'")
    expect(migration).toContain("'image/png'")
    expect(migration).toContain("'image/webp'")
    expect(migration).toContain("'image/avif'")
    expect(migration).toContain('create policy images_write')
    expect(migration).toContain('for insert')
    expect(migration).toContain('create policy images_update')
    expect(migration).toContain('for update')
    expect(migration).toContain('to authenticated')
    expect(deleteMigration).toContain('create policy images_delete')
    expect(deleteMigration).toContain('for delete')
    expect(deleteMigration).toContain('to authenticated')
  })
})
