"use client";

import { useState } from "react";
import { Check, Crosshair, Loader2, MapPin, Minus, Plus, RotateCcw, Scale, Store } from "lucide-react";
import type { FilialInfo } from "@/lib/lookup-types";
import { PRESET_QTY, usePrefs } from "@/lib/prefs-store";

const card = "rounded-[2rem] bg-paper p-5 shadow-card ring-1 ring-line/70 sm:p-6";
const kmText = (km?: number) => (km === undefined ? "" : `${String(km).replace(".", ",")} km`);
const place = (f: FilialInfo) => [f.neighborhood, [f.city, f.uf].filter(Boolean).join("/")].filter(Boolean).join(" · ");

function Segmented<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; title: string; hint: string }[];
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid gap-2 sm:grid-cols-2">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={`rounded-3xl p-4 text-left ring-1 transition-colors ${
              on ? "bg-forest text-white ring-forest" : "bg-canvas ring-line hover:bg-lime-soft"
            }`}
          >
            <span className="flex items-center justify-between text-sm font-extrabold">
              {o.title}
              {on ? <Check size={16} className="text-lime" aria-hidden /> : null}
            </span>
            <span className={`mt-1 block text-xs font-medium ${on ? "text-white/75" : "text-muted"}`}>{o.hint}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Configurações de comparação: valem sem login e ficam neste navegador. */
export function SettingsForm() {
  const { prefs, filial, filialIsDefault, update, setBuy, reset } = usePrefs();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cep, setCep] = useState("");

  const load = async (query: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/filiais/nearest?${query}`);
      const json = (await res.json()) as { filiais?: FilialInfo[]; error?: string };
      if (!res.ok) throw new Error(json.error);
      if (!json.filiais?.length) {
        setError("Não achei nenhuma Distribuidora perto desse local.");
        return;
      }
      // A mais próxima já vira a filial escolhida; as demais ficam para o usuário trocar ou comparar.
      update({ filial: json.filiais[0], nearby: json.filiais });
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Não foi possível buscar as filiais. Tente de novo.");
    } finally {
      setBusy(false);
    }
  };

  const locate = () => {
    if (!navigator.geolocation) {
      setError("Este navegador não oferece localização. Informe o CEP.");
      return;
    }
    setBusy(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => void load(`lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`),
      (err) => {
        setBusy(false);
        setError(
          err.code === err.PERMISSION_DENIED
            ? "Permissão de localização negada. Libere no navegador ou informe o CEP."
            : "Não consegui obter sua localização. Tente de novo ou informe o CEP.",
        );
      },
      { enableHighAccuracy: false, timeout: 12_000, maximumAge: 5 * 60_000 },
    );
  };

  const cepDigits = cep.replace(/\D/g, "");
  const presets = prefs.buy === "atacado" ? [6, 12, 24, 48] : [1, 2, 3, 5];

  return (
    <div className="space-y-4">
      {/* Filial */}
      <section className={card} aria-labelledby="cfg-filial">
        <div className="flex items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-lime-soft text-forest">
            <Store size={20} aria-hidden />
          </span>
          <div>
            <h2 id="cfg-filial" className="text-base font-extrabold">Filial</h2>
            <p className="text-xs font-medium text-muted">Usamos o Distribuidora mais próximo de você.</p>
          </div>
        </div>

        <div className="mt-4 rounded-3xl bg-canvas p-4 ring-1 ring-line">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted">
            <MapPin size={13} aria-hidden /> Filial atual
          </p>
          <p className="mt-1 text-lg font-extrabold">Distribuidora {filial.name}</p>
          <p className="text-xs font-medium text-muted">
            {place(filial)}
            {filial.km !== undefined ? ` · ${kmText(filial.km)} de você` : ""}
          </p>
          {filialIsDefault ? (
            <p className="mt-2 rounded-2xl bg-sand px-3 py-2 text-xs font-bold text-[#5c3a06]">
              Filial padrão. Use sua localização para escolher a mais próxima.
            </p>
          ) : null}
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-[auto_minmax(0,1fr)]">
          <button
            type="button"
            onClick={locate}
            disabled={busy}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-lime px-5 text-sm font-extrabold text-forest-deep transition-transform active:scale-[0.97] disabled:opacity-60"
          >
            {busy ? <Loader2 size={17} className="animate-spin" aria-hidden /> : <Crosshair size={17} aria-hidden />}
            Usar minha localização
          </button>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (cepDigits.length === 8) void load(`cep=${cepDigits}`);
            }}
            className="flex items-center gap-2 rounded-full bg-canvas p-1 ring-1 ring-line focus-within:ring-2 focus-within:ring-forest"
          >
            <input
              value={cep}
              onChange={(e) => setCep(e.target.value.replace(/[^\d-]/g, "").slice(0, 9))}
              inputMode="numeric"
              autoComplete="postal-code"
              placeholder="Ou digite o CEP"
              aria-label="CEP"
              className="min-w-0 flex-1 bg-transparent px-4 text-sm font-bold outline-none placeholder:font-medium placeholder:text-muted"
            />
            <button
              type="submit"
              disabled={busy || cepDigits.length !== 8}
              className="h-10 shrink-0 rounded-full bg-forest px-4 text-sm font-extrabold text-white disabled:opacity-40"
            >
              Buscar
            </button>
          </form>
        </div>

        {error ? (
          <p role="alert" className="mt-3 rounded-2xl bg-blush px-4 py-2.5 text-xs font-bold text-[#a02a4a]">
            {error}
          </p>
        ) : null}

        {prefs.nearby.length > 0 ? (
          <div className="mt-4">
            <p className="mb-2 text-xs font-bold text-muted">Mais próximas (toque para trocar)</p>
            <ul role="radiogroup" aria-label="Filiais próximas" className="space-y-1.5">
              {prefs.nearby.map((f, i) => {
                const on = f.seller === filial.seller;
                return (
                  <li key={f.seller}>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => update({ filial: f })}
                      className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left ring-1 transition-colors ${
                        on ? "bg-lime-soft ring-forest" : "bg-canvas ring-line hover:bg-lime-soft/60"
                      }`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-extrabold">
                          {f.name}
                          {i === 0 ? <span className="ml-2 rounded-full bg-forest px-2 py-0.5 text-[10px] font-extrabold text-white">MAIS PERTO</span> : null}
                        </span>
                        <span className="block truncate text-xs font-medium text-muted">{place(f)}</span>
                      </span>
                      <span className="shrink-0 text-xs font-extrabold tabular-nums">{kmText(f.km)}</span>
                      {on ? <Check size={16} className="shrink-0 text-forest" aria-hidden /> : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        <p className="mt-3 text-[11px] font-medium leading-snug text-muted">
          Sua localização só serve para achar as lojas: ela é enviada à Distribuidora nessa busca e não fica guardada. Guardamos apenas as filiais encontradas.
        </p>
      </section>

      {/* Tipo de comparação */}
      <section className={card} aria-labelledby="cfg-compare">
        <div className="flex items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-mist text-[#24628f]">
            <Scale size={20} aria-hidden />
          </span>
          <div>
            <h2 id="cfg-compare" className="text-base font-extrabold">Tipo de comparação</h2>
            <p className="text-xs font-medium text-muted">Semelhantes de outras marcas aparecem nos dois modos.</p>
          </div>
        </div>
        <div className="mt-4">
          <Segmented
            label="Tipo de comparação"
            value={prefs.compare}
            onChange={(compare) => update({ compare })}
            options={[
              { value: "interno", title: "Na minha filial", hint: "Só a filial escolhida: qual produto da mesma categoria está mais barato." },
              { value: "filiais", title: "Entre filiais", hint: "Também compara o mesmo produto nas filiais mais próximas." },
            ]}
          />
        </div>
        {prefs.compare === "filiais" && prefs.nearby.length < 2 ? (
          <p className="mt-3 rounded-2xl bg-sand px-4 py-2.5 text-xs font-bold text-[#5c3a06]">
            Para comparar filiais, encontre as lojas perto de você na seção acima.
          </p>
        ) : null}
      </section>

      {/* Modelo de compra */}
      <section className={card} aria-labelledby="cfg-buy">
        <h2 id="cfg-buy" className="text-base font-extrabold">Modelo de compra</h2>
        <p className="mt-0.5 text-xs font-medium text-muted">
          As comparações usam o preço para esta quantidade. O degrau de atacado entra sozinho quando a quantidade o atinge.
        </p>
        <div className="mt-4">
          <Segmented
            label="Modelo de compra"
            value={prefs.buy}
            onChange={setBuy}
            options={[
              { value: "atacado", title: "Atacado", hint: `Quantidades maiores (sugestão: ${PRESET_QTY.atacado} un).` },
              { value: "unitario", title: "Unitário", hint: "Poucas unidades, sem contar com desconto por volume." },
            ]}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="flex h-12 items-center rounded-full bg-canvas ring-1 ring-line">
            <button
              type="button"
              onClick={() => update({ qty: prefs.qty - 1 })}
              disabled={prefs.qty <= 1}
              aria-label="Diminuir quantidade"
              className="grid size-12 place-items-center rounded-full transition-transform active:scale-90 disabled:opacity-30"
            >
              <Minus size={16} strokeWidth={2.6} aria-hidden />
            </button>
            <input
              value={prefs.qty}
              onChange={(e) => {
                const n = parseInt(e.target.value.replace(/\D/g, ""), 10);
                if (Number.isInteger(n)) update({ qty: n });
              }}
              inputMode="numeric"
              aria-label="Quantidade"
              className="w-14 bg-transparent text-center text-base font-extrabold tabular-nums outline-none"
            />
            <button
              type="button"
              onClick={() => update({ qty: prefs.qty + 1 })}
              aria-label="Aumentar quantidade"
              className="grid size-12 place-items-center rounded-full transition-transform active:scale-90"
            >
              <Plus size={16} strokeWidth={2.6} aria-hidden />
            </button>
          </div>
          <span className="text-sm font-bold text-muted">unidades</span>
          <div className="flex flex-wrap gap-1.5">
            {presets.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => update({ qty: n })}
                aria-pressed={prefs.qty === n}
                className={`h-9 rounded-full px-3.5 text-xs font-extrabold ring-1 transition-colors ${
                  prefs.qty === n ? "bg-forest text-white ring-forest" : "bg-canvas ring-line hover:bg-lime-soft"
                }`}
              >
                {n} un
              </button>
            ))}
          </div>
        </div>
      </section>

      <button
        type="button"
        onClick={() => {
          reset();
          setError(null);
          setCep("");
        }}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-paper text-sm font-extrabold text-muted ring-1 ring-line transition-transform active:scale-[0.97]"
      >
        <RotateCcw size={15} aria-hidden /> Restaurar padrões
      </button>
    </div>
  );
}
