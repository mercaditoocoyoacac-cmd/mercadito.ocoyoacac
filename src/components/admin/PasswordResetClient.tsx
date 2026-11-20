"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, toast } from "@/components/ui/design-system";
import { PASSWORD_MIN_LENGTH } from "@/lib/adminPassword";

interface ResetUser {
  id: string;
  name: string;
  email: string;
  role: string;
  label: string;
}

const LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const DIGITS = "23456789";
const ALPHABET = `${LETTERS}${DIGITS}`;

function generatePassword(): string {
  const bytes = new Uint32Array(16);
  crypto.getRandomValues(bytes);
  const chars = [
    LETTERS[bytes[0] % LETTERS.length],
    DIGITS[bytes[1] % DIGITS.length],
    ...Array.from({ length: 14 }, (_, index) => ALPHABET[bytes[index + 2] % ALPHABET.length]),
  ];
  for (let index = chars.length - 1; index > 0; index--) {
    const swap = bytes[index] % (index + 1);
    [chars[index], chars[swap]] = [chars[swap], chars[index]];
  }
  return chars.join("");
}

export default function PasswordResetClient() {
  const [users, setUsers] = useState<ResetUser[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<ResetUser | null>(null);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [visible, setVisible] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setLoadingUsers(true);
    const timeout = window.setTimeout(() => {
      fetch(`/api/admin/password-users?q=${encodeURIComponent(query.trim())}`, { signal: controller.signal })
        .then(async (response) => {
          const data = await response.json();
          if (!response.ok || !data.ok) throw new Error(data.error || "No se pudo cargar la lista");
          setUsers(data.users as ResetUser[]);
        })
        .catch((cause: unknown) => {
          if (cause instanceof DOMException && cause.name === "AbortError") return;
          setError("No se pudo cargar la lista de usuarios.");
        })
        .finally(() => setLoadingUsers(false));
    }, 250);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [query]);

  const handleGenerate = () => {
    const next = generatePassword();
    setPassword(next);
    setConfirmation(next);
    setVisible(true);
    setError("");
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(password);
      toast.success("Contraseña copiada");
    } catch {
      toast.error("No se pudo copiar. Selecciona el texto manualmente.");
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!selected) {
      setError("Selecciona un vendedor o repartidor.");
      return;
    }
    if (password.length < PASSWORD_MIN_LENGTH) {
      setError(`La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`);
      return;
    }
    if (password !== confirmation) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/admin/password-reset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: selected.id, password }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        const message = data.error || "No se pudo cambiar la contraseña.";
        setError(message);
        toast.error(message);
        return;
      }
      toast.success(`Contraseña actualizada para ${selected.name} (${selected.email}).`);
      setPassword("");
      setConfirmation("");
      setVisible(false);
      setSelected(null);
    } catch {
      const message = "No se pudo conectar con el servidor.";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card variant="outlined">
      <CardHeader>
        <CardTitle className="text-base">Restablecer contraseña</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 pt-0">
        <p className="text-sm text-[color:var(--muted)]">
          Solo puedes cambiar la contraseña de vendedores y repartidores. Entrega la nueva contraseña al
          usuario por un medio seguro: no se envía por correo.
        </p>

        <div>
          <Input
            label="Buscar vendedor o repartidor"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nombre o correo electrónico"
            autoComplete="off"
          />
          {loadingUsers ? (
            <p className="mt-3 text-sm text-[color:var(--muted)]" role="status">Cargando usuarios…</p>
          ) : users.length === 0 ? (
            <p className="mt-3 text-sm text-[color:var(--muted)]">No hay usuarios con ese nombre o correo.</p>
          ) : (
            <ul className="mt-3 max-h-72 space-y-2 overflow-y-auto" aria-label="Usuarios disponibles">
              {users.map((user) => (
                <li key={user.id}>
                  <button
                    type="button"
                    aria-pressed={selected?.id === user.id}
                    onClick={() => {
                      setSelected(user);
                      setError("");
                    }}
                    className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                      selected?.id === user.id
                        ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                        : "border-[var(--border)] hover:bg-[var(--surface)]"
                    }`}
                  >
                    <span className="block text-sm font-medium text-[color:var(--text)]">{user.name}</span>
                    <span className="block text-xs text-[color:var(--muted)]">{user.email}</span>
                    <span className="mt-1 inline-block rounded-md bg-[var(--surface)] px-2 py-0.5 text-xs text-[color:var(--muted)]">
                      {user.label}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div aria-live="polite" className="text-sm text-[color:var(--muted)]">
            {selected ? `Contraseña nueva para ${selected.name}` : "Selecciona un usuario de la lista"}
          </div>

          <p className="text-xs text-[color:var(--muted)]">
            Generar otra contraseña reemplaza la anterior. Cópiala y entrégala antes de cerrar esta ventana.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={handleGenerate}>
              Generar contraseña
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={handleCopy} disabled={!password}>
              Copiar contraseña
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setVisible((current) => !current)}
              aria-pressed={visible}
            >
              {visible ? "Ocultar contraseña" : "Mostrar contraseña"}
            </Button>
          </div>

          <Input
            label={`Nueva contraseña (mínimo ${PASSWORD_MIN_LENGTH} caracteres, letras y números)`}
            type={visible ? "text" : "password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
          />
          <Input
            label="Confirmar contraseña"
            type={visible ? "text" : "password"}
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            autoComplete="new-password"
          />

          {error && (
            <p className="text-sm text-red-700" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" loading={saving} disabled={!selected || !password || !confirmation}>
            Cambiar contraseña
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
