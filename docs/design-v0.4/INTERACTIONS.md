# Inventario de controles del producto actual

Generado desde el AST de TypeScript. Cada fila conserva el control, evento y manejador del producto actual; es trazabilidad de código, no evidencia de haber probado cada estado. Los componentes reutilizables aparecen una vez en su archivo. Las etiquetas dinámicas conservan su clave.

## src/components/CharacterStage.tsx

| Línea | Control / etiquetas | Evento → manejador / destino |
|---|---|---|
| 262 | button · Girar a la izquierda | onClick → {() => setFacing(f => (f + 7) % 8)} |
| 266 | button ·  | onClick → {() => setMotion(m => NEXT_MOTION[m])} |
| 271 | button · Girar a la derecha | onClick → {() => setFacing(f => (f + 1) % 8)} |

## src/components/CommandPalette.tsx

| Línea | Control / etiquetas | Evento → manejador / destino |
|---|---|---|
| 70 | div · Paleta de comandos / Buscar una acción... / Sin resultados | onClick → {e => { if (e.target === e.currentTarget) setOpen(false) }} |
| 75 | div · Paleta de comandos / Buscar una acción... / Sin resultados | onKeyDown → {onKeyDown} |
| 86 | input · Buscar una acción... | onChange → {e => setQuery(e.target.value)} |
| 103 | button ·  | onClick → {() => run(cmd)}; onMouseEnter → {() => setActive(i)} |

## src/components/HeaderMenuButton.tsx

| Línea | Control / etiquetas | Evento → manejador / destino |
|---|---|---|
| 41 | IconButton · Menú | onClick → {() => setOpen(o => !o)} |
| 51 | button ·  | onClick → {() => { item.onClick(); setOpen(false) }}; onMouseEnter → {e => { if (!item.active) e.currentTarget.style.background = 'var(--surface-panel)' }}; onMouseLeave → {e => { if (!item.active) e.currentTarget.style.background = 'transparent' }} |

## src/components/SettingsModal.tsx

| Línea | Control / etiquetas | Evento → manejador / destino |
|---|---|---|
| 18 | button ·  | onClick → {onToggle} |
| 51 | button ·  | onClick → {() => onChange(id)} |
| 76 | button ·  | onClick → {() => onChange(id)} |
| 140 | Modal · Ajustes / Idioma / Tema / Tema oscuro / Tema claro | onClose → {onClose} |
| 151 | Switch · Tema | onToggle → {toggleTheme} |
| 159 | Switch · Sonido | onToggle → {toggleSound} |
| 163 | Switch · Cursor mágico | onToggle → {() => setCursorEnabled(!cursor)} |
| 167 | Switch · Partículas | onToggle → {() => setParticlesEnabled(!particles)} |
| 171 | ModeToggle ·  | onChange → {setCharacterMode} |
| 179 | SideToggle ·  | onChange → {setSidebarSide} |

## src/components/SiteFooter.tsx

| Línea | Control / etiquetas | Evento → manejador / destino |
|---|---|---|
| 31 | Link · Dofus Forge |  → {homePath} |
| 32 | Link · Acerca de |  → {`/${prefix}about`} |
| 33 | Link · Cómo usar |  → {`/${prefix}how-to-use`} |
| 34 | Link · Guía de La Forjadora |  → {`/${prefix}forge-guide`} |
| 35 | Link · Atajos |  → {`/${prefix}shortcuts`} |
| 36 | Link · Sets |  → {`/${prefix}sets`} |
| 37 | Link · Explorar |  → {`/${prefix}explore`} |
| 38 | Link · Mis Builds |  → {`/${prefix}my-builds`} |
| 68 | a ·  |  → "https://discord.gg/Rv8q4C8C5j" |
| 70 | a · Dofus Forge en X |  → "https://x.com/DofusForgeApp" |
| 73 | Link · Política de Privacidad |  → {`/${prefix}privacy`} |
| 74 | Link · Términos de Servicio |  → {`/${prefix}terms`} |
| 75 | a · Contacto |  → "mailto:contact@dofusforge.com" |

## src/components/SiteHeader.tsx

| Línea | Control / etiquetas | Evento → manejador / destino |
|---|---|---|
| 46 | a · Saltar al contenido principal |  → "#main-content" |
| 47 | Link · Dofus Forge |  → {homePath} |
| 62 | Link · Explorar |  → {`/${prefix}explore`} |
| 72 | Link · Mis Builds |  → {`/${prefix}my-builds`} |
| 82 | Link · Sets |  → {`/${prefix}sets`} |
| 93 | Link · Admin |  → {`/${prefix}admin`} |
| 107 | IconButton · Ajustes | onClick → {() => setShowSettings(true)} |
| 142 | SettingsModal ·  | onClose → {() => setShowSettings(false)} |

## src/components/Toaster.tsx

| Línea | Control / etiquetas | Evento → manejador / destino |
|---|---|---|
| 84 | div ·  | onClick → {() => removeToast(toast.id)} |

## src/components/UpdateBanner.tsx

| Línea | Control / etiquetas | Evento → manejador / destino |
|---|---|---|
| 76 | button · Recargar | onClick → {() => window.location.reload()} |
| 83 | button · Cerrar | onClick → {() => setDismissed(true)} |

## src/features/auth/AuthButton.tsx

| Línea | Control / etiquetas | Evento → manejador / destino |
|---|---|---|
| 36 | button · Iniciar sesión / Iniciar sesión | onClick → {() => setShowAuth(true)} |
| 45 | AuthModal ·  | onClose → {() => setShowAuth(false)} |
| 59 | button ·  | onClick → {() => setShowMenu(v => !v)} |
| 77 | button · Mi perfil | onClick → {() => { setShowMenu(false); navigate(`/${langPathPrefix(i18n.language)}account`) }} |
| 85 | button · Cerrar sesión | onClick → {() => { setShowMenu(false); signOut() }} |

## src/features/auth/AuthModal.tsx

| Línea | Control / etiquetas | Evento → manejador / destino |
|---|---|---|
| 93 | Modal · Cerrar / ¿No lo ves? Revisa la carpeta de spam o no deseado. / Correo / Nombre de usuario / Este es el nombre que verán los demás — nunca tu correo. Letras minúsculas, números, guiones. 3-30 caracteres. | onClose → {close} |
| 100 | button · Cerrar | onClick → {close}; onMouseEnter → {e => (e.currentTarget.style.color = 'var(--ink)')}; onMouseLeave → {e => (e.currentTarget.style.color = 'var(--ink-faint)')} |
| 144 | Button · Cerrar | onClick → {close} |
| 150 | form · Correo / Nombre de usuario / Este es el nombre que verán los demás — nunca tu correo. Letras minúsculas, números, guiones. 3-30 caracteres. / Contraseña / ¿Olvidaste tu contraseña? | onSubmit → {submit} |
| 157 | input ·  | onChange → {e => setEmail(e.target.value)}; onFocus → {e => (e.currentTarget.style.borderColor = 'var(--gold)')}; onBlur → {e => (e.currentTarget.style.borderColor = 'var(--metal-edge)')} |
| 181 | input ·  | onChange → {e => setUsername(e.target.value)}; onFocus → {e => (e.currentTarget.style.borderColor = 'var(--gold)')}; onBlur → {e => (e.currentTarget.style.borderColor = 'var(--metal-edge)')} |
| 208 | button · ¿Olvidaste tu contraseña? | onClick → {() => switchMode('forgot')} |
| 218 | PasswordInput ·  | onChange → {e => setPassword(e.target.value)} |
| 243 | LegalConsentChecks ·  | onChange → {(doc, value) => setAccepted(a => ({ ...a, [doc]: value }))} |
| 247 | Turnstile ·  | onVerify → {setCaptchaToken}; onExpire → {() => setCaptchaToken(null)} |
| 261 | button · Volver a iniciar sesión | onClick → {() => switchMode('signin')} |
| 273 | button ·  | onClick → {() => switchMode(mode === 'signin' ? 'signup' : 'signin')} |

## src/features/auth/ConsentGate.tsx

| Línea | Control / etiquetas | Evento → manejador / destino |
|---|---|---|
| 43 | Modal · Revisá nuestras condiciones / Para seguir usando tu cuenta tenés que leer y aceptar los documentos de abajo. / Cargando... / Aceptar y continuar / Cerrar sesión | onClose → {noop} |
| 44 | form · Revisá nuestras condiciones / Para seguir usando tu cuenta tenés que leer y aceptar los documentos de abajo. / Cargando... / Aceptar y continuar / Cerrar sesión | onSubmit → {accept} |
| 53 | LegalConsentChecks ·  | onChange → {(doc, value) => setChecked(c => ({ ...c, [doc]: value }))} |
| 63 | button · Cerrar sesión | onClick → {() => signOut()} |

## src/features/auth/LegalConsentChecks.tsx

| Línea | Control / etiquetas | Evento → manejador / destino |
|---|---|---|
| 24 | input ·  | onChange → {e => onChange(doc, e.target.checked)} |
| 38 | a ·  |  → {`/${prefix}${PAGE[doc]}`} |

## src/features/auth/ResetPasswordModal.tsx

| Línea | Control / etiquetas | Evento → manejador / destino |
|---|---|---|
| 45 | Modal · Elige una nueva contraseña para tu cuenta / Ya puedes seguir usando tu cuenta. / Cerrar / Nueva contraseña / Confirmar contraseña | onClose → {close} |
| 78 | Button · Cerrar | onClick → {close} |
| 83 | form · Nueva contraseña / Confirmar contraseña / Cargando... / Guardar nueva contraseña | onSubmit → {submit} |
| 88 | PasswordInput ·  | onChange → {e => setPassword(e.target.value)} |
| 105 | PasswordInput ·  | onChange → {e => setConfirm(e.target.value)} |

## src/features/builds/BuildCard.tsx

| Línea | Control / etiquetas | Evento → manejador / destino |
|---|---|---|
| 52 | Link ·  | onMouseEnter → {e => { e.currentTarget.style.color = 'var(--gold)'; e.currentTarget.style.background = 'var(--surface-stone)' }}; onMouseLeave → {e => { e.currentTarget.style.color = 'var(--ink-faint)'; e.currentTarget.style.background = 'transparent' }} → {`/${prefix}u/${owner.username}`} |
| 72 | Link · Destacado / Nvl {{level}} | onMouseEnter → {() => setBuildHover(true)}; onMouseLeave → {() => setBuildHover(false)} → {`/${prefix}build/${build.id}`} |

## src/features/builds/BuildCharacterView.tsx

| Línea | Control / etiquetas | Evento → manejador / destino |
|---|---|---|
| 41 | div ·  | onMouseEnter → {onHover}; onMouseLeave → {onLeave} |
| 131 | SlotCell ·  | onHover → {e => item && setHovered({ item, slot, rect: e.currentTarget.getBoundingClientRect() })}; onLeave → {() => setHovered(null)} |
| 150 | CharacterStage ·  | onError → {characterStage.fail} |

## src/features/builds/FollowListModal.tsx

| Línea | Control / etiquetas | Evento → manejador / destino |
|---|---|---|
| 38 | Modal · Cargando... | onClose → {onClose} |
| 50 | Link ·  | onClick → {onClose} → {`/${prefix}u/${p.username}`} |

## src/features/builds/TagChips.tsx

| Línea | Control / etiquetas | Evento → manejador / destino |
|---|---|---|
| 46 | button ·  | onClick → {onClick} |
| 73 | TagChip ·  | onClick → {() => toggle(tag.id)} |

## src/features/changelog/ChangelogModal.tsx

| Línea | Control / etiquetas | Evento → manejador / destino |
|---|---|---|
| 9 | Modal · Novedades / Datos: Dofus {{version}} | onClose → {onClose} |

## src/features/characteristics/CharacteristicsPanel.tsx

| Línea | Control / etiquetas | Evento → manejador / destino |
|---|---|---|
| 178 | input ·  | onChange → {e => setInputVal(e.target.value)}; onFocus → {e => { focused.current = true; e.target.select() }}; onBlur → {e => { focused.current = false; commitInput(e.target.value) }}; onKeyDown → {e => { if (e.key === 'Enter') { commitInput(inputVal); (e.target as HTMLInputElement).blur() } if (e.key === 'Escape') { focused.current = false; setInputVal(String(allocated)) } }} |
| 217 | AllocatorControl ·  | onAdd → {n => startTransition(() => addPoints(char, n))}; onRemove → {n => startTransition(() => removePoints(char, n))} |
| 247 | button · Todos | onClick → {() => startTransition(() => setAllScrolls(!allActive))} |
| 270 | button ·  | onClick → {() => startTransition(() => toggleScroll(char))} |

## src/features/class-picker/ClassPicker.tsx

| Línea | Control / etiquetas | Evento → manejador / destino |
|---|---|---|
| 119 | input · Nombre del build… / Nombre del build | onChange → {e => setBuildName(e.target.value)}; onFocus → {e => (e.currentTarget.style.borderColor = 'var(--gold-deep)')}; onBlur → {e => (e.currentTarget.style.borderColor = 'transparent')} |
| 134 | button · Cambiar | onClick → {() => setPicking(true)}; onMouseEnter → {e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--gold)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--gold)' }}; onMouseLeave → {e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--gold-deep)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--gold-deep)' }} |
| 154 | button ·  | onClick → {() => setGender(g)} |
| 176 | button · Bajar nivel | onClick → {() => setLevel(level - 1)} |
| 189 | button · Subir nivel | onClick → {() => setLevel(level + 1)} |
| 213 | button · Cancelar | onClick → {() => setPicking(false)} |
| 236 | button ·  | onClick → {() => { setClass(cls.id as DofusClass); setPicking(false); playSelect() }}; onMouseEnter → {e => { if (!isSelected) { const el = e.currentTarget as HTMLButtonElement el.style.borderColor = `${color}99` el.style.boxShadow = `0 0 14px ${color}28, inset 0 0 12px ${color}0a` } }}; onMouseLeave → {e => { if (!isSelected) { const el = e.currentTarget as HTMLButtonElement el.style.borderColor = 'var(--metal-edge)' el.style.boxShadow = '' } }} |
| 305 | button · Masculino / Femenino | onClick → {() => setGender(g)} |
| 331 | button · Bajar nivel | onClick → {() => setLevel(level - 1)} |
| 338 | button · Subir nivel | onClick → {() => setLevel(level + 1)} |

## src/features/collections/Collections.tsx

| Línea | Control / etiquetas | Evento → manejador / destino |
|---|---|---|
| 35 | form · Nombre de la nueva colección / Crear / Pública (aparece en tu perfil) / No se pudo guardar. Inténtalo de nuevo. | onSubmit → {submit} |
| 37 | input · Nombre de la nueva colección | onChange → {e => setName(e.target.value)} |
| 52 | input ·  | onChange → {e => setIsPublic(e.target.checked)} |
| 94 | Modal · Guardar en colección / Cargando... / Todavía no tienes colecciones. Crea una para agrupar builds tuyos o de otros. / No se pudo guardar. Inténtalo de nuevo. | onClose → {onClose} |
| 106 | button ·  | onClick → {() => toggle(c.id)} |
| 132 | NewCollectionForm ·  | onCreated → {onCreated} |
| 145 | Link · collections_builds_count |  → {`/${prefix}c/${c.id}`} |

## src/features/compare/ComparePanel.tsx

| Línea | Control / etiquetas | Evento → manejador / destino |
|---|---|---|
| 224 | button · Compartir comparación / ¡Copiado! | onClick → {handleShare} |
| 241 | button · Cerrar | onClick → {toggle} |
| 343 | button · Cambiar | onClick → {() => setShowSelector(true)} |
| 354 | button · Limpiar | onClick → {clearB} |
| 390 | input · Pegar URL del build… | onChange → {e => { setUrlInput(e.target.value); setUrlError(false) }}; onKeyDown → {e => e.key === 'Enter' && handleLoadUrl()} |
| 406 | button · Cargar | onClick → {handleLoadUrl} |
| 434 | button ·  | onClick → {() => { loadBuild(b.snapshot, b.name, equipment, sets); setShowSelector(false) }}; onMouseEnter → {e => (e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--gold) 35%, transparent)')}; onMouseLeave → {e => (e.currentTarget.style.borderColor = 'var(--metal-edge)')} |
| 460 | button ·  | onClick → {() => handleLoadB(b.encoded, b.name)}; onMouseEnter → {e => (e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--gold) 35%, transparent)')}; onMouseLeave → {e => (e.currentTarget.style.borderColor = 'var(--metal-edge)')} |
| 615 | div · Cargar Build B / Cerrar / Pegar URL del build… / Cargar / URL inválida o build corrupto | onClick → {() => setShowSelector(false)} |
| 620 | div · Cargar Build B / Cerrar / Pegar URL del build… / Cargar / URL inválida o build corrupto | onClick → {e => e.stopPropagation()} |
| 641 | button · Cerrar | onClick → {() => setShowSelector(false)} |
| 653 | input · Pegar URL del build… | onChange → {e => { setUrlInput(e.target.value); setUrlError(false) }}; onKeyDown → {e => e.key === 'Enter' && handleLoadUrl()} |
| 670 | button · Cargar | onClick → {handleLoadUrl} |
| 700 | button · Nvl {{level}} | onClick → {() => { loadBuild(b.snapshot, b.name, equipment, sets); setShowSelector(false) }}; onMouseEnter → {e => (e.currentTarget.style.background = 'var(--surface-void)')}; onMouseLeave → {e => (e.currentTarget.style.background = '')} |
| 716 | button ·  | onClick → {() => handleLoadB(b.encoded, b.name)}; onMouseEnter → {e => (e.currentTarget.style.background = 'var(--surface-void)')}; onMouseLeave → {e => (e.currentTarget.style.background = '')} |

## src/features/compare/CompareRadar.tsx

| Línea | Control / etiquetas | Evento → manejador / destino |
|---|---|---|
| 82 | image ·  |  → {statIconUrl(def.icon)} |

## src/features/equipment/EquipmentGrid.tsx

| Línea | Control / etiquetas | Evento → manejador / destino |
|---|---|---|
| 106 | div · vacío / Desequipar {{name}} / Forjamagia / Forjamagia (agregar runas) / Ver set | onMouseEnter → {enter}; onMouseLeave → {leave}; onDragStart → {onDragStart}; onDragEnd → {onDragEnd}; onDragOver → {onDragOver}; onDragLeave → {onDragLeave}; onDrop → {onDrop} |
| 124 | button · vacío | onClick → {onOpen}; onContextMenu → {e => { if (!item) return e.preventDefault() useForgePicks.getState().toggleRequired(item.ankama_id) }}; onMouseEnter → {e => { const el = e.currentTarget as HTMLButtonElement if (!item) { el.style.borderColor = 'var(--gold-deep)' el.style.borderStyle = 'solid' } else { el.style.boxShadow = setName ? 'inset 0 0 22px color-mix(in srgb, var(--water) 20%, transparent), 0 0 14px color-mix(in srgb, var(--water) 30%, transparent), 0 4px 12px rgba(0,0,0,0.6)' : 'inset 0 0 22px color-mix(in srgb, var(--gold) 18%, transparent), 0 4px 12px rgba(0,0,0,0.6)' } }}; onMouseLeave → {e => { const el = e.currentTarget as HTMLButtonElement if (!item) { el.style.borderColor = 'rgba(60,80,130,0.55)' el.style.borderStyle = 'dashed' } else { el.style.boxShadow = setName ? 'inset 0 0 18px color-mix(in srgb, var(--water) 14%, transparent), 0 0 10px color-mix(in srgb, var(--water) 22%, transparent), 0 2px 8px rgba(0,0,0,0.5)' : 'inset 0 0 18px color-mix(in srgb, var(--gold) 10%, transparent), 0 2px 8px rgba(0,0,0,0.5)' } }} |
| 206 | button · Desequipar {{name}} | onClick → {e => { e.stopPropagation(); onUnequip() }} |
| 216 | button ·  | onClick → {e => { e.stopPropagation(); useForgePicks.getState().toggleRequired(item.ankama_id) }} |
| 235 | button · Forjamagia / Forjamagia (agregar runas) | onClick → {e => { e.stopPropagation(); onRune() }}; onMouseEnter → {e => { ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--ap)' }}; onMouseLeave → {e => { const active = (runeCount ?? 0) > 0 ;(e.currentTarget as HTMLButtonElement).style.borderColor = active ? 'color-mix(in srgb, var(--ap) 60%, transparent)' : 'var(--metal-edge)' }} |
| 285 | img ·  | onError → {runeIconFallback(stat)} |
| 295 | button · Ver set | onClick → {e => { e.stopPropagation(); onViewSet() }} |
| 331 | button ·  | onClick → {e => { e.stopPropagation(); onViewSet() }} |
| 496 | img ·  | onError → {runeIconFallback(stat)} |
| 624 | CharacterStage ·  | onError → {stage.fail} |
| 674 | CharacterStage ·  | onError → {stage.fail} |
| 886 | SlotButton ·  | onOpen → {() => openCatalog(id)}; onUnequip → {() => { unequipItem(id); playUnequip() }}; onRune → {NO_RUNE_SLOTS.has(id) ? undefined : () => setRuneSlot(id)}; onDragStart → {hasItem ? (e) => { e.dataTransfer.effectAllowed = 'move'; setDragSlot(id) } : undefined}; onDragEnd → {hasItem ? () => { setDragSlot(null); setDragOverSlot(null) } : undefined}; onDragOver → {isValidTarget ? (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverSlot(id) } : undefined}; onDragLeave → {isValidTarget ? () => setDragOverSlot(s => s === id ? null : s) : undefined}; onDrop → {isValidTarget ? (e) => { e.preventDefault(); if (dragSlot) { swapSlots(dragSlot, id); playEquip() } setDragSlot(null); setDragOverSlot(null) } : undefined} |
| 983 | ItemCatalog ·  | onClose → {() => setOpenSlot(null)}; onAfterEquip → {(slotId) => { const next = DOFUS_ADVANCE[slotId] if (next) setOpenSlot({ config: SLOT_MAP[next], id: next }) else setOpenSlot(null) }} |
| 999 | RuneModal ·  | onClose → {() => setRuneSlot(null)} |
| 1009 | SetDetailModal ·  | onClose → {() => setOpenSetId(null)} |
| 1036 | PassivesPanel ·  | onChange → {setPassive}; onReset → {reset} |

## src/features/equipment/ItemCatalog.tsx

| Línea | Control / etiquetas | Evento → manejador / destino |
|---|---|---|
| 96 | button · Quitar filtro: {{name}} | onClick → {() => pick(null)} |
| 107 | input · Set… | onChange → {e => { setQ(e.target.value); setOpen(true) }}; onFocus → {() => setOpen(true)}; onBlur → {() => setTimeout(() => setOpen(false), 150)} |
| 126 | button · {{n}}pc | onMouseDown → {() => pick(s)} |
| 178 | div · Favorito: {{name}} / Ataque de Arma / a / Efectos | onMouseEnter → {e => { const el = e.currentTarget if (highlighted) el.style.borderColor = 'color-mix(in srgb, var(--gold) 70%, transparent)' else el.style.background = 'var(--surface-panel)' }}; onMouseLeave → {e => { const el = e.currentTarget if (highlighted) el.style.borderColor = 'color-mix(in srgb, var(--gold) 45%, transparent)' else el.style.background = 'var(--surface-void)' }} |
| 227 | button ·  | onClick → {() => { if (!isAlreadyEquipped) onPick(item) }} |
| 263 | button ·  | onClick → {e => { e.stopPropagation(); onOpenSet(itemSet) }} |
| 275 | button · Favorito: {{name}} | onMouseEnter → {e => { if (!isFavItem) (e.currentTarget as HTMLElement).style.color = 'var(--gold-deep)' }}; onMouseLeave → {e => { (e.currentTarget as HTMLElement).style.color = isFavItem ? 'var(--gold)' : 'var(--ink-faint)' }}; onClick → {e => { e.stopPropagation(); onToggleFav(item.ankama_id) }} |
| 565 | div · {{count}} objetos / Cerrar / Buscar objetos… / Solo favoritos / Legendarios | onClick → {e => { if (e.target === e.currentTarget) onClose() }} |
| 591 | button · Cerrar | onClick → {onClose} |
| 602 | input · Buscar objetos… | onChange → {e => setSearch(e.target.value)}; onFocus → {e => (e.currentTarget.style.borderColor = 'var(--gold)')}; onBlur → {e => (e.currentTarget.style.borderColor = 'var(--metal-edge)')} |
| 617 | SetSearch ·  | onSelect → {setSetFilter} |
| 621 | button · Solo favoritos | onClick → {() => setFavsOnly(v => !v)} |
| 635 | button · Legendarios | onClick → {() => setLegendaryOnly(v => !v)} |
| 649 | button ·  | onClick → {() => setSort(sk)} |
| 666 | button · Todos | onClick → {() => setTypeFilter(null)} |
| 678 | button ·  | onClick → {() => setTypeFilter(typeFilter === type ? null : type)} |
| 699 | StatFilter ·  | onSelect → {setStatFilter} |
| 702 | select · Nivel mínimo | onChange → {e => setLevelRange('min', Number(e.target.value))} |
| 712 | select · Nivel máximo | onChange → {e => setLevelRange('max', Number(e.target.value))} |
| 734 | ItemCard ·  | onPick → {handlePick}; onToggleFav → {toggleFav}; onOpenSet → {setSetModal} |
| 774 | SetDetailModal ·  | onClose → {() => setSetModal(null)}; onEquipAll → {onClose} |

## src/features/equipment/ItemHoverTooltip.tsx

| Línea | Control / etiquetas | Evento → manejador / destino |
|---|---|---|
| 149 | img ·  | onError → {runeIconFallback(stat)} |

## src/features/equipment/RuneModal.tsx

| Línea | Control / etiquetas | Evento → manejador / destino |
|---|---|---|
| 72 | img ·  | onError → {runeIconFallback(stat)} |
| 164 | div · Forjamagia / Nv / Cerrar / Runa de transcendencia / Rango {{rank}} | onClick → {e => { if (e.target === e.currentTarget) onClose() }} |
| 220 | button · Cerrar | onClick → {onClose} |
| 237 | button ·  | onClick → {() => setMode(m)} |
| 299 | button · Quitar | onClick → {() => startTransition(() => clearExotic(slotId))} |
| 361 | button ·  | onClick → {() => setAddValue(v)} |
| 379 | button · Disminuir | onClick → {() => setAddValue(v => Math.max(0, (v === '' ? 0 : v) - 1))} |
| 385 | input · Valor de la runa | onChange → {e => { const raw = e.target.value if (raw === '') { setAddValue(''); return } const n = parseInt(raw) setAddValue(Number.isNaN(n) ? '' : Math.max(0, n)) }} |
| 400 | button · Aumentar | onClick → {() => setAddValue(v => (v === '' ? 0 : v) + 1)} |
| 409 | button · Agregar | onClick → {addRune}; onMouseEnter → {e => { if (addValueNum <= 0) return const el = e.currentTarget as HTMLButtonElement el.style.background = `linear-gradient(135deg, color-mix(in srgb, ${selColor} 22%, transparent), color-mix(in srgb, ${selColor} 14%, transparent))` el.style.boxShadow = `0 0 16px color-mix(in srgb, ${selColor} 27%, transparent)` }}; onMouseLeave → {e => { if (addValueNum <= 0) return const el = e.currentTarget as HTMLButtonElement el.style.background = `linear-gradient(135deg, color-mix(in srgb, ${selColor} 15%, transparent), color-mix(in srgb, ${selColor} 8%, transparent))` el.style.boxShadow = `0 0 10px color-mix(in srgb, ${selColor} 13%, transparent)` }} |
| 451 | button · Quitar | onClick → {() => startTransition(() => setWeaponTransform(slotId, null))} |
| 479 | button ·  | onClick → {() => startTransition(() => setWeaponTransform(slotId, { element: elem, ratio: weaponTransform?.ratio ?? 85 } as WeaponTransform))} |
| 511 | button ·  | onClick → {() => startTransition(() => setWeaponTransform(slotId, { element: weaponTransform.element, ratio: r }))} |
| 551 | button · Borrar todas | onClick → {() => startTransition(() => clearAllRunes(slotId))} |
| 593 | img ·  | onError → {runeIconFallback(key)} |
| 612 | button · Quitar runa {{stat}} | onClick → {() => startTransition(() => clearRune(slotId, key))}; onMouseEnter → {e => { ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--negative)' ;(e.currentTarget as HTMLButtonElement).style.background = 'color-mix(in srgb, var(--negative) 15%, var(--surface-void))' }}; onMouseLeave → {e => { ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--ink-faint)' ;(e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-void)' }} |
| 648 | button · el objeto ya tiene demasiado para cualquier rango | onClick → {() => pickTranscendence(stat)} |
| 685 | button · La línea del objeto pesa {{weight}}; este rango solo entra hasta {{limit}} / Rango {{rank}} | onClick → {() => startTransition(() => setExotic(slotId, trFocus, o.value))} |
| 726 | input · Buscar runas… | onChange → {e => setRuneSearch(e.target.value)}; onFocus → {e => (e.currentTarget.style.borderColor = 'var(--gold)')}; onBlur → {e => (e.currentTarget.style.borderColor = 'var(--metal-edge)')} |
| 772 | button ·  | onClick → {() => selectRune(stat)}; onMouseEnter → {e => { if (!active) { const el = e.currentTarget as HTMLButtonElement el.style.background = `color-mix(in srgb, ${clr} 9%, transparent)` el.style.borderColor = `color-mix(in srgb, ${clr} 53%, transparent)` } }}; onMouseLeave → {e => { if (!active) { const el = e.currentTarget as HTMLButtonElement el.style.background = hasRune ? `color-mix(in srgb, ${clr} 6%, transparent)` : 'var(--surface-void)' el.style.borderColor = hasRune ? `color-mix(in srgb, ${clr} 33%, transparent)` : 'var(--metal-edge)' } }} |
| 846 | input · Tu nombre de forjamago… | onChange → {e => setForjamagoName(slotId, e.target.value)} |

## src/features/equipment/SetBonusesPanel.tsx

| Línea | Control / etiquetas | Evento → manejador / destino |
|---|---|---|
| 85 | button ·  | onClick → {onOpen} |
| 111 | IconButton · Ver set | onClick → {onOpen} |
| 195 | SetCard ·  | onOpen → {onOpenSet ? () => onOpenSet(set) : undefined} |
| 227 | ActiveSetsGrid ·  | onOpenSet → {setOpenSet} |
| 232 | SetDetailModal ·  | onClose → {() => setOpenSet(null)} |

## src/features/equipment/SetDetailModal.tsx

| Línea | Control / etiquetas | Evento → manejador / destino |
|---|---|---|
| 142 | Modal · {{n}} / {{total}} equipados / Página del set / Bonificaciones del Set / {{n}}pc / activo | onClose → {onClose} |
| 185 | Link · Página del set |  → {setPath(i18n.language, slug)} |
| 281 | Button · Equipar todo | onClick → {handleEquipAll} |
| 300 | div · Nv / a / Equipar / Quitar | onMouseEnter → {e => setHoveredItem({ item, rect: e.currentTarget.getBoundingClientRect() })}; onMouseLeave → {() => setHoveredItem(null)} |
| 398 | Button · Equipar | onClick → {() => handleEquip(item)} |
| 402 | Button · Quitar | onClick → {() => handleUnequip(item)} |

## src/features/equipment/SetsCatalog.tsx

| Línea | Control / etiquetas | Evento → manejador / destino |
|---|---|---|
| 43 | div · Ver set / {{n}}pc | onClick → {() => onEquipAll(entry)}; onKeyDown → {e => { if (e.key === 'Enter' \|\| e.key === ' ') { e.preventDefault(); onEquipAll(entry) } }}; onMouseEnter → {e => { const el = e.currentTarget if (complete) el.style.borderColor = 'color-mix(in srgb, var(--gold) 70%, transparent)' else el.style.background = 'var(--surface-panel)' }}; onMouseLeave → {e => { const el = e.currentTarget if (complete) el.style.borderColor = 'color-mix(in srgb, var(--gold) 45%, transparent)' else el.style.background = 'var(--surface-void)' }} |
| 94 | button · Ver set | onClick → {e => { e.stopPropagation(); onViewDetail(set) }} |
| 109 | div ·  | onMouseEnter → {e => { e.stopPropagation(); setHovered({ item: it, rect: e.currentTarget.getBoundingClientRect() }) }}; onMouseLeave → {e => { e.stopPropagation(); setHovered(null) }} |
| 317 | div · Catálogo de Sets / Cerrar / Buscar set… / Todos / {{count}} piezas | onClick → {e => { if (e.target === e.currentTarget) onClose() }} |
| 339 | button · Cerrar | onClick → {onClose} |
| 349 | input · Buscar set… | onChange → {e => setSearch(e.target.value)}; onFocus → {e => (e.currentTarget.style.borderColor = 'var(--gold)')}; onBlur → {e => (e.currentTarget.style.borderColor = 'var(--metal-edge)')} |
| 365 | button · Todos | onClick → {() => setPieces(null)} |
| 374 | button · {{count}} piezas | onClick → {() => setPieces(pieces === n ? null : n)} |
| 389 | button ·  | onClick → {() => setSort(sk)} |
| 404 | select · Nivel mínimo | onChange → {e => setLevelRange('min', Number(e.target.value))} |
| 414 | select · Nivel máximo | onChange → {e => setLevelRange('max', Number(e.target.value))} |
| 438 | SetCard ·  | onEquipAll → {handleEquipAll}; onViewDetail → {setOpenSet} |
| 474 | SetDetailModal ·  | onClose → {() => setOpenSet(null)}; onEquipAll → {onClose} |

## src/features/moderation/ReportModal.tsx

| Línea | Control / etiquetas | Evento → manejador / destino |
|---|---|---|
| 31 | Modal · Cerrar / Motivo / Detalles (opcional) / No se pudo enviar el reporte. Inténtalo de nuevo. / Cargando... | onClose → {onClose} |
| 35 | Button · Cerrar | onClick → {onClose} |
| 38 | form · Motivo / Detalles (opcional) / No se pudo enviar el reporte. Inténtalo de nuevo. / Cargando... / Enviar reporte | onSubmit → {submit} |
| 43 | input ·  | onChange → {() => setReason(r)} |
| 48 | textarea · Detalles (opcional) | onChange → {e => setDetail(e.target.value)} |

## src/features/notifications/NotificationBell.tsx

| Línea | Control / etiquetas | Evento → manejador / destino |
|---|---|---|
| 129 | button · Notificaciones / {{count}} sin leer | onClick → {toggle} |
| 159 | button · Marcar todo como leído | onClick → {markAll} |
| 173 | button · Alguien | onClick → {() => openItem(n)} |

## src/features/optimizer/BuildResultCard.tsx

| Línea | Control / etiquetas | Evento → manejador / destino |
|---|---|---|
| 181 | button · Fijar este objeto en la próxima forja | onClick → {() => onPin(item.ankama_id)} |
| 193 | button · Excluir este ítem de la próxima forja | onClick → {() => onBan(item.ankama_id)} |
| 258 | button · Cargar este build | onClick → {() => onLoad(result)}; onMouseEnter → {e => { (e.currentTarget as HTMLButtonElement).style.background = 'color-mix(in srgb, var(--ap) 25%, transparent)' }}; onMouseLeave → {e => { (e.currentTarget as HTMLButtonElement).style.background = 'color-mix(in srgb, var(--ap) 15%, transparent)' }} |

## src/features/optimizer/ForgeItemsPanel.tsx

| Línea | Control / etiquetas | Evento → manejador / destino |
|---|---|---|
| 76 | input · Buscar objeto o set… | onChange → {e => { setQuery(e.target.value); setActive(0) }}; onKeyDown → {onKey} |
| 100 | li · Nivel / Quitar de fijados / Toda build llevará {{name}} / Fijar / Quitar de prohibidos | onMouseEnter → {() => setActive(i)} |
| 114 | button · Quitar de fijados / Toda build llevará {{name}} / Fijar | onClick → {() => (isPinned ? release(item.ankama_id) : pin(item))} |
| 129 | button · Quitar de prohibidos / Excluir este ítem de la próxima forja / Excluir | onClick → {() => (isBanned ? release(item.ankama_id) : ban(item.ankama_id))} |
| 159 | button · Quitar de fijados / Toda build llevará {{name}} | onClick → {() => toggleRequired(item.ankama_id)} |
| 187 | button · Limpiar | onClick → {clearRequired} |
| 218 | button · Quitar de fijados | onClick → {() => release(p.id)} |
| 240 | button · Limpiar | onClick → {clearBanned} |
| 247 | button · Quitar de prohibidos | onClick → {() => release(id)} |

## src/features/optimizer/ForgeParts.tsx

| Línea | Control / etiquetas | Evento → manejador / destino |
|---|---|---|
| 282 | input ·  | onChange → {e => setRaw(e.target.value.replace(/[^0-9]/g, ''))}; onBlur → {() => { const n = parseInt(raw, 10) const next = clampLevel(isNaN(n) ? null : n) setRaw(String(next)) onCommit(next) }}; onKeyDown → {e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }} |

## src/features/optimizer/ForgePassivesBlock.tsx

| Línea | Control / etiquetas | Evento → manejador / destino |
|---|---|---|
| 53 | input ·  | onChange → {e => onMode(e.target.checked ? 'max' : 'off')} |
| 59 | button ·  | onClick → {() => onMode(m)} |
| 82 | SectionRow ·  | onToggle → {setIncluded} |
| 119 | input ·  | onChange → {() => onToggle(ids, !all)} |
| 128 | button · Elegir cuáles cuentan: {{section}} | onClick → {() => setOpen(o => !o)} |
| 149 | input ·  | onChange → {() => onToggle([item.ankama_id], !counted)} |

## src/features/optimizer/OptimizerModal.tsx

| Línea | Control / etiquetas | Evento → manejador / destino |
|---|---|---|
| 128 | input ·  | onClick → {e => e.stopPropagation()}; onChange → {e => setRaw(e.target.value.replace(/[^0-9]/g, ''))}; onBlur → {() => { const n = parseInt(raw, 10) onCommit(isNaN(n) ? null : Math.min(max, n)) }}; onKeyDown → {e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }} |
| 164 | div · Clic para agregar esta stat al encargo con una Ley sugerida / Con Ley 0 este mínimo no cuenta: la Forjadora no lo va a perseguir. / Quitar condición / Mínimo que la pieza debe alcanzar / Tope estricto: se descarta toda pieza que lo supere. Clic en el candado para hacerlo suave. | onClick → {activate} |
| 194 | button · Quitar condición | onClick → {e => { e.stopPropagation(); onChange(emptyReq(meta.key)) }} |
| 209 | NumberField · Mínimo que la pieza debe alcanzar | onCommit → {v => onChange({ ...req, minimum: v ?? 0 })} |
| 211 | NumberField · Tope estricto: se descarta toda pieza que lo supere. Clic en el candado para hacerlo suave. / Tope suave: lo que pase de aquí no suma, pero no descarta la pieza. Clic en el candado para hacerlo estricto. Vacío = sin tope. | onCommit → {v => onChange({ ...req, cap: normalizeCap(v) })} |
| 219 | button · Tope estricto: se descarta toda pieza que lo supere. Clic en el candado para hacerlo suave. / Tope suave: lo que pase de aquí no suma, pero no descarta la pieza. Clic en el candado para hacerlo estricto. Vacío = sin tope. | onClick → {e => { e.stopPropagation(); onChange({ ...req, strictCap: !req.strictCap }) }} |
| 230 | div · Ley: valor exacto de cada punto de esta stat. Lo que falta para el mínimo resta Ley por punto; lo que sobra suma Ley por punto, hasta el tope. / Ley / Atajos de Ley / Ley rápida {{n}} de 5 ({{value}}) | onClick → {e => e.stopPropagation()} |
| 233 | NumberField · Ley: valor exacto de cada punto de esta stat. Lo que falta para el mínimo resta Ley por punto; lo que sobra suma Ley por punto, hasta el tope. | onCommit → {v => onChange({ ...req, weight: v ?? 0 })} |
| 239 | button · Ley rápida {{n}} de 5 ({{value}}) | onClick → {() => onChange({ ...req, weight: leyPreset(meta.key, level) })} |
| 649 | Modal · La Forjadora / Selecciona tu clase para desbloquear la Forjadora / La Forjadora necesita tu clase y nivel para calcular combinaciones válidas. Elegí (o confirmá) tu clase abajo para continuar. | onClose → {handleClose} |
| 682 | Modal · La Forjadora / {{s}} s en la fragua / Golpes de martillo: piezas probadas en el yunque / {{n}} golpes / Negativa: lo que falta para los mínimos. Positiva: todo cumplido, más alta cuanto más sobra de lo importante. | onClose → {handleClose} |
| 719 | BuildResultCard ·  | onLoad → {loadBuild} |
| 734 | button · El fuelle funde metal nuevo en la fragua para salir de una forma estancada, sin perder la mejor pieza. / Avivar el fuego | onClick → {stoke} |
| 743 | button · Templar ahora | onClick → {finishForging} |
| 751 | button · Apagar la fragua | onClick → {extinguish} |
| 768 | Modal · La Forjadora / Piezas forjadas / Vuelve a encender la fragua partiendo de estas piezas: el resultado nunca empeora. / Reforjar / Desde cero | onClose → {handleClose} |
| 775 | button · Vuelve a encender la fragua partiendo de estas piezas: el resultado nunca empeora. / Reforjar | onClick → {() => lightForge(results.map(r => r.equipped))} |
| 783 | button · Desde cero | onClick → {() => lightForge()} |
| 790 | button · Ajustar encargo | onClick → {() => setPhase('order')} |
| 811 | BuildResultCard · Obra maestra / Mejor pieza | onLoad → {loadBuild}; onBan → {banItem}; onPin → {pinItem} |
| 835 | BuildResultCard ·  | onLoad → {loadBuild}; onBan → {banItem}; onPin → {pinItem} |
| 860 | Modal · La Forjadora / Hacé tu encargo. Mínimo (≥): lo que la pieza debe tener sí o sí. Ley ⚖: cuánto vale cada punto de esa stat (lo que falta resta, lo que sobra suma). Tope (≤): hasta dónde cuenta; con candado, se descarta lo que lo pase. La Forjadora primero cumple todos los mínimos y después llena lo de mayor Ley. El Poder cuenta para Fuerza, Inteligencia, Suerte y Agilidad. / Guía completa / Nv. {{level}} / Pergaminado | onClose → {handleClose} |
| 871 | Link · Guía completa |  → {`/${langPathPrefix(i18n.language)}forge-guide`} |
| 902 | button ·  | onClick → {() => setConfig(c => ({ ...c, intensity: k }))} |
| 926 | LevelField · Nivel del personaje / máx ítems | onCommit → {v => setConfig(c => ({ ...c, maxLevel: v }))} |
| 928 | button · SLOTS A OPTIMIZAR | onClick → {() => setShowSlots(s => !s)} |
| 934 | input ·  | onChange → {e => setConfig(c => ({ ...c, assumeFullyScrolled: e.target.checked }))} |
| 937 | button · Limpiar todo | onClick → {() => setConfig(c => ({ ...c, stats: OPTIMIZER_STATS.map(s => emptyReq(s.key)) }))} |
| 950 | input ·  | onChange → {e => setConfig(c => ({ ...c, transcendence: e.target.checked }))} |
| 956 | input ·  | onChange → {e => setConfig(c => ({ ...c, exo: { ...c.exo, [k]: e.target.checked } }))} |
| 962 | input ·  | onChange → {e => setConfig(c => ({ ...c, exo: { ...c.exo, onlyOnRing: e.target.checked } }))} |
| 967 | select ·  | onChange → {e => setConfig(c => ({ ...c, exo: { ...c.exo, maxCount: Number(e.target.value) } }))} |
| 979 | ForgePassivesBlock ·  | onMode → {passives => setConfig(c => ({ ...c, passives }))}; onExcluded → {passiveExcluded => setConfig(c => ({ ...c, passiveExcluded }))} |
| 996 | button · Marcar todos | onClick → {() => setConfig(c => ({ ...c, lockedSlots: new Set<SlotId>() }))} |
| 999 | button · Desmarcar todos | onClick → {() => setConfig(c => ({ ...c, lockedSlots: new Set(ALL_SLOTS) }))} |
| 1008 | input ·  | onChange → {() => toggleSlot(slot)} |
| 1026 | button ·  | onClick → {() => toggleGroup(group.key)} |
| 1048 | RequirementCard ·  | onChange → {updateReq} |
| 1062 | button · Cancelar | onClick → {handleClose} |
| 1065 | button · Encender la fragua | onClick → {() => lightForge()} |

## src/features/passives/CombatViewBar.tsx

| Línea | Control / etiquetas | Evento → manejador / destino |
|---|---|---|
| 35 | button ·  | onClick → {onClick} |
| 68 | button · Ajustar pasivas | onClick → {goToPassives} |

## src/features/passives/PassivesPanel.tsx

| Línea | Control / etiquetas | Evento → manejador / destino |
|---|---|---|
| 60 | button · Apagar todas | onClick → {onReset} |
| 75 | PassiveCard ·  | onChange → {onChange} |
| 163 | ControlRow ·  | onChange → {onChange} |
| 171 | button ·  | onClick → {() => setOpen(o => !o)} |
| 208 | StepButton · Quitar una acumulación | onClick → {() => set(value - 1)} |
| 215 | button · {{n}} acumulaciones | onClick → {() => set(value === i + 1 ? i : i + 1)} |
| 235 | StepButton · Añadir una acumulación | onClick → {() => set(value + 1)} |
| 250 | button · Turno {{n}} | onClick → {() => set(on ? 0 : 1)} |
| 276 | SegButton · No | onClick → {() => set(0)} |
| 280 | SegButton · Turno {{n}} | onClick → {() => set(i + 1)} |
| 291 | button ·  | onClick → {onClick} |
| 306 | button ·  | onClick → {onClick} |

## src/features/publish/PublishModal.tsx

| Línea | Control / etiquetas | Evento → manejador / destino |
|---|---|---|
| 120 | Modal · Publicar build / Inicia sesión para publicar tu build. / Cerrar | onClose → {close} |
| 123 | Button · Cerrar | onClick → {close} |
| 130 | Modal · Este build ya está publicado — esto actualiza esa misma publicación, no crea una nueva. / Se publicará como remix de «{{name}}» de {{author}}. / Nombre del build / Build sin nombre / Visibilidad | onClose → {close} |
| 131 | form · Este build ya está publicado — esto actualiza esa misma publicación, no crea una nueva. / Se publicará como remix de «{{name}}» de {{author}}. / Nombre del build / Build sin nombre / Visibilidad | onSubmit → {submit} |
| 156 | input · Build sin nombre | onChange → {e => setName(e.target.value)}; onFocus → {e => (e.currentTarget.style.borderColor = 'var(--gold-deep)')}; onBlur → {e => (e.currentTarget.style.borderColor = 'var(--metal-edge)')} |
| 178 | button ·  | onClick → {() => setVisibility(id)} |
| 206 | TagPicker ·  | onChange → {setTagIds} |

## src/features/pvp/PvpArena.tsx

| Línea | Control / etiquetas | Evento → manejador / destino |
|---|---|---|
| 64 | button ·  | onClick → {onClick} |
| 177 | button · Simulador PvP (dummy) / Reiniciar | onClick → {() => setExpanded(v => !v)} |
| 191 | button · Reiniciar | onClick → {resetResist} |
| 216 | input · Fijo | onChange → {e => setResist(el.key, 'fixed', Math.max(0, parseInt(e.target.value, 10) \|\| 0))} |
| 225 | input ·  | onChange → {e => setResist(el.key, 'percent', Math.min(100, Math.max(0, parseInt(e.target.value, 10) \|\| 0)))} |
| 276 | AttackIcon ·  | onClick → {() => fire({ kind: 'weapon' })} |
| 288 | AttackIcon ·  | onClick → {() => fire({ kind: 'spell', spell: sp })} |
| 302 | AttackIcon ·  | onClick → {() => fire({ kind: 'spell', spell: sp })} |
| 316 | AttackIcon ·  | onClick → {() => fire({ kind: 'spell', spell: sp })} |

## src/features/set-guide/SetGuideUI.tsx

| Línea | Control / etiquetas | Evento → manejador / destino |
|---|---|---|
| 53 | Link · Nv. {{level}} / sets_card_pieces |  → {setPath(i18n.language, set.slug)} |
| 81 | Link · Nv. {{level}} |  → {`/${prefix}build/${build.id}`} |

## src/features/share/ShareBar.tsx

| Línea | Control / etiquetas | Evento → manejador / destino |
|---|---|---|
| 69 | button · Exportar build como imagen / Exportando… / Exportar | onClick → {handleExport} |
| 80 | button · Copiar URL para compartir / ¡Copiado! / Compartir | onClick → {handleCopy} |

## src/features/spells/DamageHover.tsx

| Línea | Control / etiquetas | Evento → manejador / destino |
|---|---|---|
| 32 | span ·  | onMouseEnter → {e => setAnchor(e.currentTarget.getBoundingClientRect())}; onMouseLeave → {() => setAnchor(null)} |

## src/features/spells/SpellsPanel.tsx

| Línea | Control / etiquetas | Evento → manejador / destino |
|---|---|---|
| 588 | div · Variante / Máx {{count}}× / turno / Soporte / Utilidad / Efectos de hechizos | onMouseEnter → {e => { const el = e.currentTarget as HTMLDivElement el.style.transform = 'translateY(-1px)' el.style.boxShadow = `0 4px 16px rgba(0,0,0,.5), 0 0 0 1px color-mix(in srgb, ${color} 25%, transparent)` }}; onMouseLeave → {e => { const el = e.currentTarget as HTMLDivElement el.style.transform = '' el.style.boxShadow = '' }} |
| 922 | input ·  | onChange → {e => setDominioActive(e.target.checked)} |
| 941 | input · Dom. del Arma | onChange → {e => setDominioNorm(Math.max(0, parseInt(e.target.value, 10) \|\| 0))} |
| 952 | input · Dom. del Arma / Crítico | onChange → {e => setDominioCrit(Math.max(0, parseInt(e.target.value, 10) \|\| 0))} |
| 1136 | button · Grado {{grade}} / (auto) | onClick → {() => setManual(g === autoGrade && manualGrade === g ? null : g)} |
| 1152 | button · Reiniciar al grado auto | onClick → {() => setManual(null)} |
| 1166 | button · Todos | onClick → {() => setElemFilter(f)} |

## src/pages/AboutPage.tsx

| Línea | Control / etiquetas | Evento → manejador / destino |
|---|---|---|
| 133 | Link ·  |  → {`/${prefix}classes/${c.id}`} |
| 160 | Link · Mirá cómo usarlo |  → {`/${prefix}how-to-use`} |
| 167 | Link · Explorá builds de la comunidad |  → {`/${prefix}explore`} |

## src/pages/AccountPage.tsx

| Línea | Control / etiquetas | Evento → manejador / destino |
|---|---|---|
| 139 | button · Cambiar avatar | onClick → {() => AVATAR_UPLOAD_ENABLED && fileInputRef.current?.click()} |
| 168 | input ·  | onChange → {onAvatarChange} |
| 176 | Link ·  |  → {`/${prefix}u/${profile?.username}`} |
| 191 | button · builds | onClick → {() => navigate(`/${prefix}my-builds`)} |
| 194 | button · seguidores | onClick → {() => setFollowModal('followers')} |
| 197 | button · siguiendo | onClick → {() => setFollowModal('following')} |
| 209 | form · Nombre de usuario / Este es el nombre que verán los demás — nunca tu correo. Letras minúsculas, números, guiones. 3-30 caracteres. / Nombre (opcional) / Solo se muestra en tu perfil junto a tu usuario. En tus builds y comentarios siempre aparece tu usuario, nunca este nombre. / Biografía | onSubmit → {submitProfile} |
| 216 | input ·  | onChange → {e => setUsername(e.target.value)}; onFocus → {e => (e.currentTarget.style.borderColor = 'var(--gold-deep)')}; onBlur → {e => (e.currentTarget.style.borderColor = 'var(--metal-edge)')} |
| 238 | input ·  | onChange → {e => setDisplayName(e.target.value)}; onFocus → {e => (e.currentTarget.style.borderColor = 'var(--gold-deep)')}; onBlur → {e => (e.currentTarget.style.borderColor = 'var(--metal-edge)')} |
| 258 | textarea ·  | onChange → {e => setBio(e.target.value)}; onFocus → {e => (e.currentTarget.style.borderColor = 'var(--gold-deep)')}; onBlur → {e => (e.currentTarget.style.borderColor = 'var(--metal-edge)')} |
| 301 | form · Nueva contraseña / Confirmar contraseña / Cargando... / Guardar nueva contraseña | onSubmit → {submitPassword} |
| 306 | PasswordInput ·  | onChange → {e => setNewPassword(e.target.value)} |
| 319 | PasswordInput ·  | onChange → {e => setConfirmPassword(e.target.value)} |
| 348 | Button · Cerrar sesión | onClick → {() => signOut()} |
| 360 | FollowListModal ·  | onClose → {() => setFollowModal(null)} |

## src/pages/AdminDashboardPage.tsx

| Línea | Control / etiquetas | Evento → manejador / destino |
|---|---|---|
| 27 | Navigate ·  |  → {homePath} |
| 40 | Link · Dofus Forge |  → {appHomePath} |
| 86 | Link · Comunidad y reconocimiento / Disponible / Rangos personalizados / Crea insignias públicas, asígnalas a usuarios y consulta el historial de cada asignación. / Abrir panel | onMouseEnter → {e => { e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--gold) 52%, transparent)' }}; onMouseLeave → {e => { e.currentTarget.style.borderColor = 'var(--metal-edge)' }} → {`/${prefix}admin/ranks`} |
| 151 | Link · Reportes y moderación / Revisa los builds y comentarios reportados: ocúltalos, bórralos o descarta el reporte. | onMouseEnter → {e => { e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--gold) 52%, transparent)' }}; onMouseLeave → {e => { e.currentTarget.style.borderColor = 'var(--metal-edge)' }} → {`/${prefix}admin/reports`} |

## src/pages/AdminRanksPage.tsx

| Línea | Control / etiquetas | Evento → manejador / destino |
|---|---|---|
| 369 | Link · Admin |  → {adminPath} |
| 389 | Button · Nuevo rango | onClick → {() => openRankModal()} |
| 413 | AccessRedirect · Inicia sesión para continuar |  → {homePath} |
| 415 | AccessRedirect · Tu cuenta no tiene permiso para gestionar rangos personalizados. |  → {homePath} |
| 441 | button ·  | onClick → {() => setActiveTab(tab)} |
| 460 | SearchField · Buscar rangos… / Limpiar búsqueda | onChange → {setRankSearch} |
| 467 | Button · Nuevo rango | onClick → {() => openRankModal()} |
| 473 | RankCard ·  | onEdit → {() => openRankModal(rank)}; onAssign → {() => openAssignModal(rank)} |
| 496 | button ·  | onClick → {() => setAssignmentFilter(filter)} |
| 498 | SearchField · Buscar personas o notas… / Limpiar búsqueda | onChange → {setAssignmentSearch} |
| 525 | Link ·  |  → {profilePath} |
| 534 | Link ·  |  → {profilePath} |
| 555 | Button · Revocar | onClick → {() => void revokeAssignment(row)} |
| 569 | Modal · Identidad del rango / Define el nombre visible y la clave interna estable. / Nombre visible / Identificador estable / Descripción pública | onClose → {() => !savingRank && setRankModal(false)} |
| 570 | form · Identidad del rango / Define el nombre visible y la clave interna estable. / Nombre visible / Identificador estable / Descripción pública | onSubmit → {saveRank} |
| 578 | input ·  | onChange → {event => setDraft(current => ({ ...current, name: event.target.value, ...(!slugTouched ? { slug: slugFromName(event.target.value) } : {}) }))} |
| 581 | input ·  | onChange → {event => { setSlugTouched(true); setDraft(current => ({ ...current, slug: slugFromName(event.target.value) })) }} |
| 585 | textarea ·  | onChange → {event => setDraft(current => ({ ...current, description: event.target.value }))} |
| 600 | input · Elige cualquier color | onChange → {event => setDraft(current => ({ ...current, color: event.target.value.toUpperCase() }))} |
| 604 | button ·  | onClick → {() => setDraft(current => ({ ...current, color }))} |
| 616 | input · Buscar icono… | onChange → {event => setIconSearch(event.target.value)} |
| 623 | button · Icono de insignia: {{icon}} | onClick → {() => setDraft(current => ({ ...current, icon: key }))} |
| 639 | input · Buscar acabado… | onChange → {event => setStyleSearch(event.target.value)} |
| 643 | button · Vista previa | onClick → {() => setDraft(current => ({ ...current, badge_style: style }))} |
| 672 | input ·  | onChange → {event => setDraft(current => ({ ...current, sort_order: Number(event.target.value) }))} |
| 678 | ToggleRow · Límite personalizado de builds guardadas / Define el cupo total de builds guardadas para quienes tengan este rango. | onChange → {value => setDraft(current => ({ ...current, build_limit_enabled: value, build_limit: value ? current.build_limit \|\| '100' : current.build_limit }))} |
| 680 | ToggleRow · Builds guardadas ilimitadas / Quita el límite de builds guardadas mientras el rango esté vigente. | onChange → {value => setDraft(current => ({ ...current, build_limit_unlimited: value }))} |
| 682 | input ·  | onChange → {event => setDraft(current => ({ ...current, build_limit: event.target.value }))} |
| 689 | ToggleRow · Público / Muestra este rango en el perfil público de la persona. | onChange → {value => setDraft(current => ({ ...current, is_public: value }))} |
| 690 | ToggleRow · Disponible para asignar / Los rangos archivados siguen en el historial, pero no se pueden asignar. | onChange → {value => setDraft(current => ({ ...current, is_active: value }))} |
| 697 | Button · Cancelar | onClick → {() => setRankModal(false)} |
| 703 | Modal · Asignar un rango personalizado / Elige una cuenta, configura las fechas y agrega una nota interna si hace falta. / Cuenta de Dofus Forge / Busca por nombre de usuario; los nombres visibles no se usan para identificar cuentas. / Quitar la cuenta seleccionada | onClose → {() => !savingAssignment && setAssignRank(null)} |
| 704 | form · Elige una cuenta, configura las fechas y agrega una nota interna si hace falta. / Cuenta de Dofus Forge / Busca por nombre de usuario; los nombres visibles no se usan para identificar cuentas. / Quitar la cuenta seleccionada / Escribe al menos 2 caracteres… | onSubmit → {saveAssignment} |
| 714 | button · Quitar la cuenta seleccionada | onClick → {() => { setSelectedUser(null); setUserQuery('') }} |
| 718 | input · Escribe al menos 2 caracteres… | onChange → {event => setUserQuery(event.target.value)} |
| 720 | button ·  | onClick → {() => setSelectedUser(user)} |
| 727 | input ·  | onChange → {event => setStartsAt(event.target.value)} |
| 728 | input ·  | onChange → {event => setExpiresAt(event.target.value)} |
| 730 | textarea ·  | onChange → {event => setInternalNote(event.target.value)} |
| 733 | Button · Cancelar | onClick → {() => setAssignRank(null)} |
| 749 | Navigate ·  |  → {to} |
| 788 | Button · Editar | onClick → {onEdit} |
| 789 | Button · Asignar | onClick → {onAssign} |
| 803 | input ·  | onChange → {event => onChange(event.target.value)} |
| 804 | button ·  | onClick → {() => onChange('')} |
| 830 | input ·  | onChange → {event => onChange(event.target.checked)} |

## src/pages/AdminReportsPage.tsx

| Línea | Control / etiquetas | Evento → manejador / destino |
|---|---|---|
| 55 | Navigate ·  |  → {['es', 'fr', 'pt'].includes(seg) ? `/${seg}` : '/'} |
| 100 | Tabs ·  | onChange → {id => setStatus(id as ReportStatus)} |
| 145 | Link · Abrir build |  → {`/${prefix}build/${buildId}`} |
| 151 | Button ·  | onClick → {() => act(r, 'hide')} |
| 155 | Button · Borrar build | onClick → {() => act(r, 'delete')} |
| 159 | Button · Revisado, sin acción | onClick → {() => act(r, 'reviewed')} |
| 162 | Button · Descartar | onClick → {() => act(r, 'dismiss')} |
| 168 | Button · El build sigue privado: su dueño decide si lo vuelve a publicar. | onClick → {() => restore(r)} |

## src/pages/BuildDetailPage.tsx

| Línea | Control / etiquetas | Evento → manejador / destino |
|---|---|---|
| 81 | button · Valorar con {{count}} de 5 | onClick → {() => onRate(n)} |
| 362 | Link · Explorar builds |  → {`/${langPathPrefix(i18n.language)}explore`} |
| 394 | Button · Cargar en el planner | onClick → {handleLoadIntoPlanner} |
| 399 | Button · Abre este build en el planificador como tu propia copia. Al publicarla queda vinculada a este build y su autor aparece como base. / Remixar | onClick → {handleLoadIntoPlanner} |
| 409 | Link ·  |  → {`/${langPathPrefix(i18n.language)}explore?tag=${tag.name}`} |
| 422 | Link ·  |  → {`/${langPathPrefix(i18n.language)}build/${forkParent.id}`} |
| 433 | Link ·  |  → {`/${langPathPrefix(i18n.language)}u/${owner.username}`} |
| 450 | button · Me gusta ({{count}}) / Inicia sesión para interactuar. | onClick → {handleToggleLike} |
| 462 | button · Guardar / Inicia sesión para interactuar. | onClick → {handleToggleBookmark} |
| 474 | button · Guardar en colección / Inicia sesión para interactuar. | onClick → {() => setCollectOpen(true)} |
| 485 | button · Reportar build / Inicia sesión para interactuar. | onClick → {() => setReportTarget({ kind: 'build', id: build.id })} |
| 496 | button ·  | onClick → {handleToggleFeatured} |
| 510 | a · Remixes ({{count}}) |  → "#remixes" |
| 519 | StarRating ·  | onRate → {handleRate} |
| 618 | Link · Nvl {{level}} |  → {`/${langPathPrefix(i18n.language)}build/${f.id}`} |
| 643 | CollectionPicker ·  | onClose → {() => setCollectOpen(false)} |
| 644 | ReportModal ·  | onClose → {() => setReportTarget(null)} |
| 656 | li · Nvl {{level}} / Abrir / Cargando... / Restaurar | onPointerEnter → {() => void fetchVersionSnapshot(build.id, v.id)}; onFocusCapture → {() => void fetchVersionSnapshot(build.id, v.id)} |
| 664 | Button · Abrir | onClick → {() => openVersion(v)} |
| 668 | Button · Cargando... / Restaurar | onClick → {() => restoreVersion(v)} |
| 684 | form · Escribe un comentario... / Enviando... / Comentar | onSubmit → {handlePostComment} |
| 685 | input · Escribe un comentario... | onChange → {e => setCommentText(e.target.value)} |
| 716 | Link ·  |  → {`/${langPathPrefix(i18n.language)}u/${c.profiles.username}`} |
| 736 | button · Me gusta / Inicia sesión para interactuar. | onClick → {() => handleToggleCommentLike(c.id)} |
| 750 | button · Inicia sesión para interactuar. / Reportar | onClick → {() => setReportTarget({ kind: 'comment', id: c.id })} |

## src/pages/BuilderPage.tsx

| Línea | Control / etiquetas | Evento → manejador / destino |
|---|---|---|
| 68 | a · Reiniciar build / Dofus Forge | onClick → {e => { if (e.button !== 0 \|\| e.ctrlKey \|\| e.metaKey \|\| e.shiftKey \|\| e.altKey) return e.preventDefault() onReset() }} → {brandHref} |
| 248 | a · Saltar al contenido principal |  → "#main-content" |
| 251 | BrandLink ·  | onReset → {resetBuild} |
| 252 | button · Ver novedades | onClick → {() => setShowChangelog(true)} |
| 270 | button · Explorar | onClick → {() => navToLangPath('explore')} |
| 281 | button · Mis Builds | onClick → {() => navToLangPath('my-builds')} |
| 291 | button · Admin | onClick → {() => navToLangPath('admin')} |
| 314 | IconButton · Ajustes | onClick → {() => setShowSettings(true)} |
| 320 | IconButton · Deshacer / Deshacer (Ctrl+Z) | onClick → {undo} |
| 331 | IconButton · Rehacer / Rehacer (Ctrl+Shift+Z) | onClick → {redo} |
| 343 | button · La Forjadora / Nuevo | onClick → {() => setShowOptimizer(true)} |
| 364 | button · Sets | onClick → {() => setShowSetsCatalog(true)} |
| 378 | button ·  | onClick → {() => setShowPublish(true)} |
| 389 | button · Modo Comparar / Comparar | onClick → {toggleCompare} |
| 456 | SettingsModal ·  | onClose → {() => setShowSettings(false)} |
| 461 | ChangelogModal ·  | onClose → {() => setShowChangelog(false)} |
| 468 | OptimizerModal ·  | onClose → {() => setShowOptimizer(false)} |
| 475 | SetsCatalog ·  | onClose → {() => setShowSetsCatalog(false)} |
| 482 | PublishModal ·  | onClose → {() => setShowPublish(false)} |
| 552 | Tabs ·  | onChange → {id => setActiveTab(id as MobileTab)} |

## src/pages/ClassGuidePage.tsx

| Línea | Control / etiquetas | Evento → manejador / destino |
|---|---|---|
| 64 | Link · Dofus Forge |  → {homePath} |
| 130 | a ·  |  → {`#${s.id}`} |
| 172 | Link · Armar un {{class}} |  → {`${homePath}?class=${classInfo.id}`} |
| 175 | Link · Ver todas las builds de la comunidad → |  → {`/${prefix}explore`} |
| 192 | Link · Armar un {{class}} |  → {`${homePath}?class=${classInfo.id}`} |
| 249 | Link ·  |  → {setPath(i18n.language, s.slug)} |
| 264 | Link · Armar un {{class}} de {{element}} |  → {plannerPath} |

## src/pages/CollectionPage.tsx

| Línea | Control / etiquetas | Evento → manejador / destino |
|---|---|---|
| 97 | form · Nombre de la nueva colección / Descripción (opcional) / Guardar / Cancelar | onSubmit → {saveEdit} |
| 98 | input · Nombre de la nueva colección | onChange → {e => setName(e.target.value)} |
| 108 | textarea · Descripción (opcional) | onChange → {e => setDescription(e.target.value)} |
| 120 | Button · Cancelar | onClick → {() => setEditing(false)} |
| 137 | Link · de {{author}} |  → {`/${prefix}u/${collection.profiles.username}`} |
| 146 | Button ·  | onClick → {() => patch({ is_public: !collection.is_public })} |
| 150 | Button · Editar | onClick → {() => { setName(collection.name); setDescription(collection.description ?? ''); setEditing(true) }} |
| 153 | Button · Borrar | onClick → {remove} |
| 183 | button · Quitar de la colección | onClick → {() => removeBuild(b.id)} |

## src/pages/ExplorePage.tsx

| Línea | Control / etiquetas | Evento → manejador / destino |
|---|---|---|
| 183 | Tabs ·  | onChange → {id => setSort(id as ExploreSort)} |
| 187 | input · Buscar builds... | onChange → {e => setSearch(e.target.value)} |
| 198 | select · Clase | onChange → {e => setClassSlug(e.target.value \|\| null)} |
| 214 | button · Todas | onClick → {() => selectTag(null)} |
| 226 | TagChip ·  | onClick → {() => selectTag(tag.id === tagId ? null : tag.name)} |
| 249 | Button · Cargar más | onClick → {() => { const next = page + 1; setPage(next); load(next, false) }} |

## src/pages/ForgeGuidePage.tsx

| Línea | Control / etiquetas | Evento → manejador / destino |
|---|---|---|
| 153 | Link · Abrir La Forjadora |  → {`${homePath}?forge=1`} |
| 160 | Link · Guía general del planificador |  → {`/${prefix}how-to-use`} |
| 180 | a ·  |  → {`#${s.id}`} |
| 225 | Link · Abrir La Forjadora |  → {`${homePath}?forge=1`} |

## src/pages/HowToUsePage.tsx

| Línea | Control / etiquetas | Evento → manejador / destino |
|---|---|---|
| 62 | Link · Empezar a planificar |  → {homePath} |
| 69 | Link · Acerca de Dofus Forge |  → {`/${prefix}about`} |
| 76 | Link · Guía de La Forjadora |  → {`/${prefix}forge-guide`} |

## src/pages/MyBuildsPage.tsx

| Línea | Control / etiquetas | Evento → manejador / destino |
|---|---|---|
| 101 | div · Nvl {{level}} / Click para cambiar visibilidad / Editar / Copiar link / Eliminar | onMouseEnter → {e => { e.currentTarget.style.boxShadow = 'var(--inset-bevel), var(--glow-gold)'; e.currentTarget.style.borderTopColor = 'var(--gold)' }}; onMouseLeave → {e => { e.currentTarget.style.boxShadow = 'var(--inset-bevel)'; e.currentTarget.style.borderTopColor = 'var(--gold-deep)' }} |
| 115 | button · Nvl {{level}} | onClick → {handleViewDetail} |
| 136 | button · Click para cambiar visibilidad | onClick → {() => setShowVisMenu(v => !v)} |
| 157 | button ·  | onClick → {() => handleSetVisibility(v)} |
| 174 | button · Editar | onClick → {handleEdit} |
| 184 | button · Copiar link | onClick → {handleCopyLink} |
| 187 | button · Eliminar | onClick → {handleDelete}; onMouseEnter → {e => (e.currentTarget.style.background = 'color-mix(in srgb, var(--negative) 15%, transparent)')}; onMouseLeave → {e => (e.currentTarget.style.background = 'transparent')} |
| 282 | Tabs ·  | onChange → {id => setTab(id as MyBuildsTab)} |
| 293 | NewCollectionForm ·  | onCreated → {c => setCollections(prev => [c, ...(prev ?? [])])} |
| 316 | MyBuildCard ·  | onChanged → {updated => setBuilds(prev => prev.map(x => x.id === updated.id ? updated : x))}; onDeleted → {id => setBuilds(prev => prev.filter(x => x.id !== id))} |

## src/pages/SetPage.tsx

| Línea | Control / etiquetas | Evento → manejador / destino |
|---|---|---|
| 51 | Link · Sets de Dofus 3 |  → {`/${prefix}sets`} |
| 117 | Link · Set de {{class}} |  → {`/${prefix}classes/${classInfo.id}`} |
| 127 | Link · Probar en el planificador |  → {`${homePath}?set=${set.id}`} |
| 134 | Link · Todos los sets |  → {`/${prefix}sets`} |
| 221 | Link · Probar en el planificador |  → {`${homePath}?set=${set.id}`} |

## src/pages/SetsPage.tsx

| Línea | Control / etiquetas | Evento → manejador / destino |
|---|---|---|
| 82 | input · Buscar un set… | onChange → {e => setQuery(e.target.value)} |
| 96 | button ·  | onClick → {() => setElement(active ? null : el)} |
| 113 | select · Filtrar por nivel / Todos los niveles | onChange → {e => setBracket(e.target.value)} |

## src/pages/ShortcutsPage.tsx

| Línea | Control / etiquetas | Evento → manejador / destino |
|---|---|---|
| 104 | Link · Empezar a planificar |  → {homePath} |
| 111 | Link · Cómo usar Dofus Forge |  → {`/${prefix}how-to-use`} |

## src/pages/UserProfilePage.tsx

| Línea | Control / etiquetas | Evento → manejador / destino |
|---|---|---|
| 177 | Link · Dofus Forge |  → {homePath} |
| 254 | Button · Iniciá sesión para seguir / Siguiendo / Seguir | onClick → {handleToggleFollow} |
| 298 | Button · Cargar más | onClick → {() => { const next = page + 1; setPage(next); loadBuilds(profile.id, next, false) }} |

## src/ui/LanguageSwitcher.tsx

| Línea | Control / etiquetas | Evento → manejador / destino |
|---|---|---|
| 41 | button · Cambiar a {{lang}} | onClick → {() => handleChange(code)} |

## src/ui/Modal.tsx

| Línea | Control / etiquetas | Evento → manejador / destino |
|---|---|---|
| 88 | div ·  | onClick → {onClose} |
| 131 | button · Cerrar | onClick → {onClose} |

## src/ui/PasswordInput.tsx

| Línea | Control / etiquetas | Evento → manejador / destino |
|---|---|---|
| 30 | input ·  | onChange → {onChange}; onFocus → {e => (e.currentTarget.style.borderColor = 'var(--gold)')}; onBlur → {e => (e.currentTarget.style.borderColor = 'var(--metal-edge)')} |
| 46 | button ·  | onClick → {() => setVisible(v => !v)} |

## src/ui/StatFilter.tsx

| Línea | Control / etiquetas | Evento → manejador / destino |
|---|---|---|
| 73 | button ·  | onMouseDown → {() => toggle(stat)} |
| 123 | button · Quitar filtro: {{name}} | onClick → {() => toggle(stat)} |
| 145 | button · Filtrar efecto | onClick → {() => { setOpen(o => !o); if (open) setQ('') }} |
| 178 | input · Buscar stat… | onChange → {e => setQ(e.target.value)} |
| 192 | button · Quite los filtros | onMouseDown → {clearAll} |

## src/ui/Tabs.tsx

| Línea | Control / etiquetas | Evento → manejador / destino |
|---|---|---|
| 82 | button ·  | onClick → {() => onChange(id)} |
| 129 | button ·  | onClick → {() => onChange(id)} |
