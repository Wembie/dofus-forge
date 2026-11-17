import { BuildDetailDialog } from "./BuildDetail";
import { PublishDialog } from "./Publish";
import { NavigationSheet, SettingsDialog } from "./Shell";
import { useShellStudy } from "./shell-model";
import { LibraryDialog } from "./Library";
import { libraryDialogIds, type LibraryDialogId } from "./library-model";
import { PeopleDialog, SignOut } from "./Account";
import { useAccountStudy, publicPerson } from "./account-model";
import { AuthAccess, type AccessMode } from "./AuthAccess";
import { useEffect, useState, type ReactNode } from "react";
import {
  Check,
  ArrowRight,
  Folder,
  Shield,
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
  "restore-content",
  "signout",
]);

function OpenInPlace({
  id,
  onDone,
}: {
  id: "notifications" | "update-banner";
  onDone: () => void;
}) {
  useEffect(() => {
    if (id === "notifications") useShellStudy.getState().setOpen(true);
    else useShellStudy.getState().setUpdateAvailable(true);
    onDone();
  }, []);
  return null;
}

/** Visual interaction specimens; never invoke authentication, publication or moderation services. */
export function SurfaceDialogs({
  id,
  onClose,
  onOpen,
  onNavigate,
  onPublished = (build) =>
    location.assign("/surfaces.html?view=build&build=" + build),
  dark = document.documentElement.dataset.theme !== "mineral",
  onTheme = (next) => {
    document.documentElement.dataset.theme = next ? "tinta" : "mineral";
  },
}: {
  id: DialogId;
  onClose: () => void;
  onOpen: (id: DialogId) => void;
  onNavigate: (id: string) => void;
  /** Production lands on the published build's page. */
  onPublished?: (id: string) => void;
  dark?: boolean;
  onTheme?: (dark: boolean) => void;
}) {
  const [state, setState] = useState("form"),
    [commandQuery, setCommandQuery] = useState(""),
    [selection, setSelection] = useState("");
  if (["signin", "signup", "forgot", "reset-password", "consent"].includes(id))
    return (
      <AuthAccess
        initialMode={id as AccessMode}
        onClose={onClose}
        onSignedIn={() => useAccountStudy.getState().setSignedIn(true)}
      />
    );
  if (id === "followers" || id === "following")
    return (
      <PeopleDialog
        kind={id}
        userId={publicPerson(useAccountStudy.getState().publicUsername)?.id}
        onClose={onClose}
        onProfile={(username) => {
          useAccountStudy.getState().showProfile(username);
          onNavigate("profile");
        }}
      />
    );
  if (id === "signout") return <SignOut onClose={onClose} />;
  if (
    id === "report-build" ||
    id === "report-comment" ||
    id === "restore-version"
  )
    return <BuildDetailDialog id={id} onClose={onClose} />;
  if (id === "settings")
    return <SettingsDialog onClose={onClose} dark={dark} onTheme={onTheme} />;
  if (id === "navigation")
    return (
      <NavigationSheet
        onClose={onClose}
        admin={useAccountStudy.getState().profile.role === "admin"}
        onSettings={() => onOpen("settings")}
        onNavigate={(target) =>
          typeof target === "object"
            ? onNavigate("build" in target ? "build" : "profile")
            : target === "workshop"
              ? location.assign("/")
              : onNavigate(target)
        }
      />
    );
  // Not modal in production: the directory opens them where they really live.
  if (id === "notifications" || id === "update-banner")
    return <OpenInPlace id={id} onDone={onClose} />;
  if (id === "publish" || id === "update-build")
    return (
      <PublishDialog
        update={id === "update-build"}
        onClose={onClose}
        onSignIn={() => onOpen("signin")}
        onNavigate={onNavigate}
        onPublished={(build) => {
          onClose();
          onPublished(build);
        }}
      />
    );
  if (libraryDialogIds.includes(id))
    return (
      <LibraryDialog
        id={id as LibraryDialogId}
        onClose={onClose}
        onNavigate={onNavigate}
      />
    );
  const title = dialogs.find((d) => d[0] === id)![1];
  const submitLabel = confirmations.has(id)
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

          {confirmations.has(id) && (
            <>
              <div className="confirm-object">
                <img src="/data/classes/iop.webp" alt="" />
                <span>
                  <b>{"Yopuka · Tierra"}</b>
                  <small>
                    Revisa el objeto de esta acción antes de continuar.
                  </small>
                </span>
              </div>
              <p>
                {destructive.has(id)
                  ? "Esta acción retira el contenido indicado. El botón principal identifica explícitamente la acción para evitar cambios accidentales."
                  : "Recupera el contenido seleccionado y vuelve a su contexto."}
              </p>
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
