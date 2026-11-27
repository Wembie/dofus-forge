# Dofus Forge — Membresía de apoyo (retirado)

> **Estado:** retirado. Decisión del usuario (2026-11-26): Dofus Forge se
> mantiene 100% gratis, sin nada a la venta. Nunca hubo UI ni webhook de
> pago construidos para esta propuesta (ver historial de este archivo en
> Git para el diseño completo que se descartó: niveles de suscripción
> Aprendiz/Artesano/Forjador/Maestro, Aportador, racha de apoyo, etc.).

## Qué queda

- **Rangos personalizados** (`custom_rank_definitions`/`custom_rank_benefits`/
  `custom_rank_assignments`, panel `/admin/ranks`): sistema aparte, no
  depende de pago — un admin crea rangos y asigna beneficios (límite de
  builds, insignias) a cuentas específicas. Sigue existiendo tal cual.
- **Límite de builds por cuenta**: base plana de 50 para toda cuenta; un
  rango personalizado puede subirlo o dejarlo ilimitado. `docs/DATABASE.md`
  y `supabase/schema.sql` tienen el detalle actual.

## Qué se retiró

- Los tipos/tablas/funciones de la Fase 1 (`membership_tier`,
  `membership_status`, `memberships`, `membership_periods`,
  `supporter_contributions`, `build_limit_for_tier`,
  `featured_build_limit_for_tier`, `get_public_membership_tier`) —
  eliminados en `supabase/migrations/20261126030000_remove_membership_tiers.sql`.
- El badge de nivel de membresía en el perfil público y el tipo
  `MembershipTier` del cliente.
- Las 4 claves `membership_tier_*` de los locales.

## A futuro

Página de donaciones de aporte único (cualquier monto, cualquier país),
sin suscripción, sin niveles ni vencimiento — reemplaza la idea de la
escalera recurrente. Sin diseño todavía; ver `docs/ROADMAP.md`.
