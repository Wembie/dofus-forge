import { AuthAccess, type AccessMode } from "./AuthAccess";
import { useState, type ReactNode } from "react";
import {
  Check,
  ArrowRight,
  User,
  Folder,
  Shield,
  RefreshCw,
  Bell,
} from "lucide-react";
import { Modal } from "./SurfaceModal";
import { dialogs, pages, type DialogId } from "./surface-registry";
import {
  RANK_ICONS,
  RANK_COLORS,
  RANK_BADGE_STYLES,
} from "../../../src/features/ranks/catalog";

function Field({
  label,
  type = "text",
  value = "",
  required = false,
  maxLength,
}: {
  label: string;
  type?: string;
  value?: string;
  required?: boolean;
  maxLength?: number;
}) {
  return (
    <label>
      {label}
      <input
        type={type}
        defaultValue={value}
        required={required}
        maxLength={maxLength}
        autoComplete="off"
      />
    </label>
  );
}
function CheckField({
  children,
  required = false,
}: {
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <label className="check-field">
      <input type="checkbox" required={required} />
      <span>{children}</span>
    </label>
  );
}
function Choice({ label, options }: { label: string; options: string[] }) {
  return (
    <label>
      {label}
      <select>
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}
const destructive = new Set<DialogId>([
  "delete-build",
  "collection-delete",
  "delete-comment",
  "delete-content",
  "rank-revoke",
]);
const confirmations = new Set<DialogId>([
  ...destructive,
  "restore-version",
  "restore-content",
  "signout",
]);

/** Visual interaction specimens; never invoke authentication, publication or moderation services. */
export function SurfaceDialogs({
  id,
  onClose,
  onOpen,
  onNavigate,
}: {
  id: DialogId;
  onClose: () => void;
  onOpen: (id: DialogId) => void;
  onNavigate: (id: string) => void;
}) {
  const [state, setState] = useState("form"),
    [choice, setChoice] = useState("private"),
    [commandQuery, setCommandQuery] = useState(""),
    [pickedTags, setPickedTags] = useState<string[]>([]),
    [selection, setSelection] = useState("");
  if (["signin", "signup", "forgot", "reset-password", "consent"].includes(id))
    return <AuthAccess initialMode={id as AccessMode} onClose={onClose} />;
  const title = dialogs.find((d) => d[0] === id)![1];
  const isPublish = id === "publish" || id === "update-build";
  const submitLabel = isPublish
    ? id === "publish"
      ? "Publicar build"
      : "Guardar nueva versión"
    : id.startsWith("report-")
      ? "Enviar reporte"
      : confirmations.has(id)
        ? title
        : "Guardar cambios";
  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      size={id.startsWith("rank-") ? "xl" : "md"}
    >
      <div className="specimen-state">
        <label>
          Estado de revisión{" "}
          <select value={state} onChange={(e) => setState(e.target.value)}>
            <option value="form">Formulario</option>
            <option value="busy">Enviando</option>
            <option value="success">Confirmación</option>
            <option value="error">Error</option>
            <option value="empty">Vacío</option>
            <option value="duplicate">Ya existe</option>
          </select>
        </label>
        <span>Ejemplo local · sin envío</span>
      </div>
      {state === "success" || state === "duplicate" ? (
        <div className="flow-result" role="status">
          <Check size={30} />
          <h3>
            {state === "duplicate"
              ? "Esta acción ya está registrada"
              : "Cambios guardados"}
          </h3>
          <p>
            {state === "duplicate"
              ? "Conservamos el registro anterior. Puedes volver a la tarea que estabas realizando."
              : "Esta es la vista de confirmación del estudio. No se modificó ninguna cuenta ni contenido publicado."}
          </p>
          <button className="primary" onClick={onClose}>
            Volver a mi tarea
          </button>
        </div>
      ) : state === "empty" ? (
        <div className="flow-result">
          <Folder size={32} />
          <h3>Todavía no hay contenido</h3>
          <p>Las opciones aparecerán aquí cuando estén disponibles.</p>
          <button onClick={() => setState("form")}>Volver</button>
        </div>
      ) : (
        <form
          className="surface-form"
          onSubmit={(e) => {
            e.preventDefault();
            setState("success");
          }}
        >
          {state === "error" && (
            <p className="inline-error" role="alert">
              No se pudieron guardar los cambios. Tu información sigue aquí;
              vuelve a intentarlo.
            </p>
          )}
          {id === "settings" && (
            <>
              <Choice
                label="Idioma"
                options={["Español", "English", "Français", "Português"]}
              />
              <Choice label="Aspecto" options={["Tinta", "Mineral"]} />
              <CheckField>Sonido del taller</CheckField>
              <CheckField>Efecto del cursor</CheckField>
              <CheckField>Partículas ambientales</CheckField>
              <Choice
                label="Personaje"
                options={["Animado · 3D", "Retrato · 2D"]}
              />
              <Choice
                label="Lado preferido de la ficha"
                options={["Derecha", "Izquierda"]}
              />
              <p>
                La ficha completa se abre en todo el ancho. Las preferencias de
                movimiento deben respetar la configuración de accesibilidad del
                dispositivo.
              </p>
            </>
          )}
          {id === "commands" && (
            <>
              <label>
                Buscar una acción
                <input
                  value={commandQuery}
                  onChange={(e) => setCommandQuery(e.target.value)}
                  autoFocus
                  placeholder="Ir a una sección…"
                />
              </label>
              <nav
                className="mobile-directory"
                aria-label="Acciones disponibles"
              >
                {pages
                  .filter((p) =>
                    p[1].toLowerCase().includes(commandQuery.toLowerCase()),
                  )
                  .map((p) => (
                    <button
                      type="button"
                      key={p[0]}
                      onClick={() => {
                        onClose();
                        onNavigate(p[0]);
                      }}
                    >
                      {p[1]}
                      <ArrowRight size={16} />
                    </button>
                  ))}
              </nav>
            </>
          )}

          {(isPublish ||
            id === "rename" ||
            id === "collection-new" ||
            id === "collection-edit") && (
            <Field
              label={
                id.startsWith("collection")
                  ? "Nombre de la colección"
                  : "Nombre del build"
              }
              value={id === "collection-new" ? "" : "Yopuka · Tierra"}
              required
              maxLength={60}
            />
          )}
          {(isPublish || id === "visibility") && (
            <fieldset className="choice-list">
              <legend>Quién puede verlo</legend>
              {[
                ["private", "Privado", "Solo tú puedes acceder."],
                [
                  "unlisted",
                  "Con enlace",
                  "Disponible para quien tenga el enlace.",
                ],
                ["public", "Público", "Aparece en Explorar y en tu perfil."],
              ].map(([v, label, desc]) => (
                <label key={v} className={choice === v ? "selected" : ""}>
                  <input
                    type="radio"
                    name="visibility"
                    value={v}
                    checked={choice === v}
                    onChange={() => setChoice(v)}
                  />
                  <span>
                    <strong>{label}</strong>
                    <small>{desc}</small>
                  </span>
                </label>
              ))}
            </fieldset>
          )}
          {isPublish && (
            <>
              <fieldset className="tag-options">
                <legend>
                  Etiquetas <small>{pickedTags.length} / 5</small>
                </legend>
                {[
                  "PvM",
                  "PvP",
                  "Tierra",
                  "Fuego",
                  "Agua",
                  "Aire",
                  "Multielemento",
                  "Económico",
                ].map((s) => (
                  <label className="check-field" key={s}>
                    <input
                      type="checkbox"
                      checked={pickedTags.includes(s)}
                      disabled={
                        !pickedTags.includes(s) && pickedTags.length >= 5
                      }
                      onChange={() =>
                        setPickedTags(
                          pickedTags.includes(s)
                            ? pickedTags.filter((v) => v !== s)
                            : [...pickedTags, s],
                        )
                      }
                    />
                    {s}
                  </label>
                ))}
              </fieldset>
              {id === "update-build" && (
                <p>
                  La nueva versión conserva el enlace del build y su historial.
                </p>
              )}
            </>
          )}
          {(id === "collection-new" || id === "collection-edit") && (
            <>
              <label>
                Descripción
                <textarea
                  rows={3}
                  defaultValue="Equipos para distintas situaciones."
                />
              </label>
              <CheckField>Colección pública</CheckField>
            </>
          )}
          {id === "collection-picker" && (
            <>
              <p>Organiza este build para encontrarlo después.</p>
              {[
                "Equipos para mazmorras",
                "Ideas para PvP",
                "Pendientes de probar",
              ].map((s) => (
                <CheckField key={s}>{s}</CheckField>
              ))}
              <button type="button" onClick={() => onOpen("collection-new")}>
                Crear otra colección
              </button>
            </>
          )}
          {(id === "followers" || id === "following") && (
            <>
              <Field label="Buscar jugador" />
              {["Brasa", "Caliza", "Nébula"].map((name) => (
                <div className="person-row" key={name}>
                  <span className="person-avatar">
                    <User size={20} />
                  </span>
                  <span>
                    <b>{name}</b>
                    <small>@{name.toLowerCase()}</small>
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.currentTarget.textContent =
                        e.currentTarget.textContent === "Seguir"
                          ? "Siguiendo"
                          : "Seguir";
                    }}
                  >
                    Seguir
                  </button>
                </div>
              ))}
            </>
          )}
          {id.startsWith("report-") && (
            <>
              <p>
                {id === "report-comment"
                  ? "Reportar el comentario de Brasa."
                  : "Reportar Yopuka · Tierra."}{" "}
                Selecciona el motivo para que el equipo pueda revisarlo.
              </p>
              <Choice
                label="Motivo"
                options={[
                  "Spam",
                  "Datos incorrectos",
                  "Contenido inapropiado",
                  "Otro",
                ]}
              />
              <label>
                Detalle (opcional)
                <textarea rows={4} maxLength={500} />
              </label>
              <small>500 caracteres como máximo.</small>
            </>
          )}
          {confirmations.has(id) && (
            <>
              <div className="confirm-object">
                <img src="/data/classes/iop.webp" alt="" />
                <span>
                  <b>
                    {id === "signout" ? "Tu sesión actual" : "Yopuka · Tierra"}
                  </b>
                  <small>
                    {id === "restore-version"
                      ? "Versión anterior del build"
                      : "Revisa el objeto de esta acción antes de continuar."}
                  </small>
                </span>
              </div>
              <p>
                {destructive.has(id)
                  ? "Esta acción retira el contenido indicado. El botón principal identifica explícitamente la acción para evitar cambios accidentales."
                  : id === "signout"
                    ? "Tu borrador local permanece en este dispositivo."
                    : "Recupera el contenido seleccionado y vuelve a su contexto."}
              </p>
            </>
          )}
          {id === "notifications" && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.currentTarget.textContent = "Todas leídas";
                }}
              >
                Marcar todas como leídas
              </button>
              {[
                "Brasa comentó tu build",
                "Caliza comenzó a seguirte",
                "Tu build tiene una nueva valoración",
              ].map((text, i) => (
                <button
                  className="notification-row"
                  type="button"
                  key={text}
                  onClick={() => {
                    onClose();
                    onNavigate(i === 1 ? "profile" : "build");
                  }}
                >
                  <Bell size={18} />
                  <span>
                    {text}
                    <small>Hace {i + 1} horas</small>
                  </span>
                  <ArrowRight size={16} />
                </button>
              ))}
            </>
          )}
          {id === "rank-edit" && (
            <>
              <div className="form-columns">
                <Field label="Nombre" value="Forjador" required />
                <Field
                  label="Identificador"
                  value="forjador"
                  required
                  maxLength={40}
                />
              </div>
              <label>
                Descripción
                <textarea rows={2} />
              </label>
              <div className="form-columns">
                <button type="button" onClick={() => onOpen("rank-icons")}>
                  Elegir icono
                </button>
                <button type="button" onClick={() => onOpen("rank-colors")}>
                  Elegir color
                </button>
                <button type="button" onClick={() => onOpen("rank-styles")}>
                  Estilo de insignia
                </button>
                <Field label="Orden" type="number" value="100" />
              </div>
              <CheckField>Rango público</CheckField>
              <CheckField>Rango activo</CheckField>
              <CheckField>Personalizar límite de builds</CheckField>
              <CheckField>Builds ilimitadas</CheckField>
              <Field label="Límite de builds" type="number" value="100" />
              <div className="rank-preview">
                <Shield size={18} />
                Forjador <small>Vista previa</small>
              </div>
            </>
          )}
          {id === "rank-assign" && (
            <>
              <Field label="Buscar usuario" required />
              <Choice label="Rango" options={["Forjador", "Colaborador"]} />
              <div className="form-columns">
                <Field label="Inicio" type="datetime-local" />
                <Field label="Vencimiento (opcional)" type="datetime-local" />
              </div>
              <label>
                Nota interna
                <textarea rows={3} />
              </label>
            </>
          )}
          {id === "rank-history" && (
            <div className="timeline">
              {[
                "Rango asignado",
                "Beneficios actualizados",
                "Asignación renovada",
              ].map((s, i) => (
                <div key={s}>
                  <span>0{i + 1}</span>
                  <b>{s}</b>
                  <small>Registro de ejemplo</small>
                </div>
              ))}
            </div>
          )}
          {id === "rank-icons" && (
            <>
              <Field label="Buscar icono" />
              <div className="icon-library">
                {Object.entries(RANK_ICONS).map(([name, Icon]) => (
                  <button
                    type="button"
                    key={name}
                    aria-label={name}
                    aria-pressed={selection === name}
                    onClick={() => setSelection(name)}
                  >
                    <Icon size={22} />
                    <small>{name}</small>
                  </button>
                ))}
              </div>
            </>
          )}
          {id === "rank-colors" && (
            <div className="swatch-library">
              {RANK_COLORS.map((color) => (
                <button
                  type="button"
                  key={color}
                  aria-pressed={selection === color}
                  onClick={() => setSelection(color)}
                >
                  <i style={{ background: color }} />
                  {color}
                </button>
              ))}
            </div>
          )}
          {id === "rank-styles" && (
            <div className="icon-library">
              {RANK_BADGE_STYLES.map((s) => (
                <button
                  type="button"
                  key={s}
                  aria-pressed={selection === s}
                  onClick={() => setSelection(s)}
                >
                  <Shield size={20} />
                  {s}
                </button>
              ))}
            </div>
          )}
          {id === "moderate" && (
            <>
              <p>
                Contenido reportado: Yopuka · Tierra. Revisa el motivo y la
                vista pública antes de decidir.
              </p>
              <Choice
                label="Decisión"
                options={[
                  "Marcar como revisado",
                  "Descartar reporte",
                  "Ocultar contenido",
                ]}
              />
              <button type="button" onClick={() => onOpen("delete-content")}>
                Eliminar contenido…
              </button>
            </>
          )}
          {id === "update-banner" && (
            <>
              <RefreshCw size={28} />
              <p>
                Hay una versión nueva del taller. Guarda tu borrador antes de
                recargar para conservar el trabajo.
              </p>
              <button type="button" onClick={onClose}>
                Continuar trabajando
              </button>
            </>
          )}
          {id === "navigation" && (
            <nav className="mobile-directory" aria-label="Todas las secciones">
              {pages
                .filter(
                  (p) =>
                    ![
                      "build",
                      "set",
                      "collection",
                      "class",
                      "profile",
                    ].includes(p[0]),
                )
                .map((p) => (
                  <button
                    type="button"
                    key={p[0]}
                    onClick={() => {
                      onClose();
                      onNavigate(p[0]);
                    }}
                  >
                    {p[1]}
                    <ArrowRight size={16} />
                  </button>
                ))}
            </nav>
          )}
          {![
            "commands",
            "rank-icons",
            "rank-colors",
            "rank-styles",
            "rank-history",
            "navigation",
            "followers",
            "following",
            "notifications",
          ].includes(id) && (
            <div className="form-footer">
              <button type="button" onClick={onClose}>
                Cancelar
              </button>
              <button
                className={destructive.has(id) ? "danger-button" : "primary"}
                disabled={state === "busy"}
                type="submit"
              >
                {state === "busy" ? "Guardando…" : submitLabel}
              </button>
            </div>
          )}
        </form>
      )}
    </Modal>
  );
}
