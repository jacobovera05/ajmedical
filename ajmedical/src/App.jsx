import { useState, useEffect, useRef, useCallback } from "react";

// ============================================================
// STORAGE HELPERS
// ============================================================
const KEYS = {
  ventas: "ajm:ventas",
  compras: "ajm:compras",
  gastos: "ajm:gastos",
  clientes: "ajm:clientes",
  inventario: "ajm:inventario",
  cobros: "ajm:cobros",
  proveedores: "ajm:proveedores",
};

async function loadData(key) {
  try {
    const r = await window.storage.get(key);
    return r ? JSON.parse(r.value) : [];
  } catch {
    return [];
  }
}

async function saveData(key, data) {
  try {
    await window.storage.set(key, JSON.stringify(data));
  } catch (e) {
    console.error("Storage error", e);
  }
}

// ============================================================
// CLAUDE API
// ============================================================
async function askClaude(messages, systemPrompt) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": import.meta.env.VITE_ANTHROPIC_KEY || "", "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: systemPrompt,
      messages,
    }),
  });
  const data = await res.json();
  return data.content?.find((b) => b.type === "text")?.text || "Sin respuesta.";
}

// ============================================================
// ICONS
// ============================================================
const Icon = ({ name, size = 18 }) => {
  const icons = {
    home: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10",
    sales: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
    purchase: "M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z M3 6h18 M16 10a4 4 0 01-8 0",
    expense: "M12 1v22 M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6",
    clients: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2 M9 11a4 4 0 100-8 4 4 0 000 8z M23 21v-2a4 4 0 00-3-3.87 M16 3.13a4 4 0 010 7.75",
    inventory: "M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z",
    cobros: "M9 14l6-6 M10 7H4v6 M20 17v-6h-6",
    supplier: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
    chat: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z",
    plus: "M12 5v14 M5 12h14",
    trash: "M3 6h18 M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2",
    send: "M22 2L11 13 M22 2L15 22l-4-9-9-4 22-7z",
    alert: "M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z M12 9v4 M12 17h.01",
    trend: "M23 6l-9.5 9.5-5-5L1 18 M17 6h6v6",
    check: "M20 6L9 17l-5-5",
    supplier: "M3 3h18v4H3z M3 10h4v11H3z M17 10h4v11h-4z M8 10h8v11H8z",
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {icons[name]?.split(" M").map((d, i) => (
        <path key={i} d={i === 0 ? d : "M" + d} />
      ))}
    </svg>
  );
};

// ============================================================
// COLORS & THEME
// ============================================================
const C = {
  bg: "#0a0e1a",
  surface: "#111827",
  card: "#1a2235",
  border: "#1f2d45",
  accent: "#00c2a8",
  accentDim: "#00c2a820",
  accentHover: "#00e5c8",
  red: "#ff4d6d",
  orange: "#ff9a3c",
  yellow: "#ffd166",
  green: "#06d6a0",
  blue: "#4361ee",
  text: "#e2e8f0",
  textDim: "#64748b",
  textMid: "#94a3b8",
};

// ============================================================
// FORMATTERS
// ============================================================
const fMXN = (n) => `$${Number(n || 0).toLocaleString("es-MX", { minimumFractionDigits: 0 })}`;
const fDate = (d) => d ? new Date(d + "T12:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "short" }) : "";
const today = () => new Date().toISOString().split("T")[0];
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

// ============================================================
// SHARED COMPONENTS
// ============================================================
const Btn = ({ children, onClick, variant = "primary", small, style }) => {
  const base = {
    display: "inline-flex", alignItems: "center", gap: 6, border: "none",
    borderRadius: 8, cursor: "pointer", fontWeight: 600, transition: "all .15s",
    fontSize: small ? 12 : 14, padding: small ? "6px 12px" : "10px 18px",
    fontFamily: "inherit",
  };
  const variants = {
    primary: { background: C.accent, color: "#000" },
    ghost: { background: "transparent", color: C.textMid, border: `1px solid ${C.border}` },
    danger: { background: C.red + "22", color: C.red, border: `1px solid ${C.red}44` },
  };
  return <button onClick={onClick} style={{ ...base, ...variants[variant], ...style }}>{children}</button>;
};

const Input = ({ label, value, onChange, type = "text", placeholder, required }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
    {label && <label style={{ fontSize: 11, color: C.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>{label}{required && " *"}</label>}
    <input
      type={type} value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8,
        padding: "10px 12px", color: C.text, fontSize: 14, fontFamily: "inherit",
        outline: "none", transition: "border .15s",
      }}
      onFocus={e => e.target.style.borderColor = C.accent}
      onBlur={e => e.target.style.borderColor = C.border}
    />
  </div>
);

const Select = ({ label, value, onChange, options }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
    {label && <label style={{ fontSize: 11, color: C.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>{label}</label>}
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontSize: 14, fontFamily: "inherit", outline: "none" }}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);

const Card = ({ children, style }) => (
  <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, ...style }}>{children}</div>
);

const StatCard = ({ label, value, sub, color = C.accent, icon }) => (
  <Card style={{ flex: 1, minWidth: 140 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
      <div>
        <div style={{ fontSize: 11, color: C.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>{label}</div>
        <div style={{ fontSize: 22, fontWeight: 800, color, letterSpacing: -1 }}>{value}</div>
        {sub && <div style={{ fontSize: 11, color: C.textDim, marginTop: 4 }}>{sub}</div>}
      </div>
      {icon && <div style={{ color, opacity: 0.5 }}><Icon name={icon} size={22} /></div>}
    </div>
  </Card>
);

const Tag = ({ children, color = C.accent }) => (
  <span style={{ background: color + "22", color, borderRadius: 6, fontSize: 11, padding: "2px 8px", fontWeight: 700 }}>{children}</span>
);

// ============================================================
// MODAL
// ============================================================
const Modal = ({ title, onClose, children }) => (
  <div style={{
    position: "fixed", inset: 0, background: "#000000bb", zIndex: 100,
    display: "flex", alignItems: "flex-end", justifyContent: "center",
  }} onClick={e => e.target === e.currentTarget && onClose()}>
    <div style={{
      background: C.surface, borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 520,
      maxHeight: "90vh", overflow: "auto", padding: 24,
      border: `1px solid ${C.border}`, borderBottom: "none",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h3 style={{ margin: 0, color: C.text, fontSize: 16, fontWeight: 700 }}>{title}</h3>
        <button onClick={onClose} style={{ background: "none", border: "none", color: C.textDim, cursor: "pointer", fontSize: 20 }}>×</button>
      </div>
      {children}
    </div>
  </div>
);

// ============================================================
// DASHBOARD
// ============================================================
function Dashboard({ ventas, compras, gastos, cobros, inventario }) {
  const mesActual = new Date().toISOString().slice(0, 7);
  const ventasMes = ventas.filter(v => v.fecha?.startsWith(mesActual));
  const comprasMes = compras.filter(c => c.fecha?.startsWith(mesActual));
  const gastosMes = gastos.filter(g => g.fecha?.startsWith(mesActual));

  const totalVentas = ventasMes.reduce((a, v) => a + Number(v.total || 0), 0);
  const totalCompras = comprasMes.reduce((a, c) => a + Number(c.total || 0), 0);
  const totalGastos = gastosMes.reduce((a, g) => a + Number(g.monto || 0), 0);
  const utilidad = totalVentas - totalCompras - totalGastos;

  // ── Flujo de efectivo real (histórico total) ──────────────────
  // Ingresos: ventas de contado + cobros marcados como pagados
  const ingresosCobrados = ventas
    .filter(v => v.pagado === true || v.formaPago === "contado")
    .reduce((a, v) => a + Number(v.total || 0), 0);
  const cobrosRecibidos = cobros
    .filter(c => c.pagado)
    .reduce((a, c) => a + Number(c.monto || 0), 0);
  const totalIngresos = ingresosCobrados + cobrosRecibidos;
  const totalEgresos = compras.reduce((a, c) => a + Number(c.total || 0), 0)
    + gastos.reduce((a, g) => a + Number(g.monto || 0), 0);
  const saldoCaja = totalIngresos - totalEgresos;

  // Pendiente por cobrar
  const porCobrar = cobros.filter(c => !c.pagado).reduce((a, c) => a + Number(c.monto || 0), 0)
    + ventas.filter(v => v.formaPago === "credito" && !v.cobrado).reduce((a, v) => a + Number(v.total || 0), 0);

  const cobrosVencidos = cobros.filter(c => !c.pagado && c.fechaVence && c.fechaVence < today());
  const stockBajo = inventario.filter(i => Number(i.stock) <= Number(i.puntoReorden) && i.puntoReorden);

  const topClientes = Object.entries(
    ventasMes.reduce((acc, v) => { acc[v.cliente] = (acc[v.cliente] || 0) + Number(v.total || 0); return acc; }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 4);

  const topProductos = Object.entries(
    ventasMes.reduce((acc, v) => { acc[v.producto] = (acc[v.producto] || 0) + Number(v.total || 0); return acc; }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 4);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ── Saldo en Caja ── */}
      <Card style={{ background: saldoCaja >= 0 ? "#0d2b22" : "#2b0d0d", border: `1px solid ${saldoCaja >= 0 ? C.green + "55" : C.red + "55"}` }}>
        <div style={{ fontSize: 11, color: C.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>💰 Saldo en caja</div>
        <div style={{ fontSize: 32, fontWeight: 900, color: saldoCaja >= 0 ? C.green : C.red, letterSpacing: -1 }}>{fMXN(saldoCaja)}</div>
        <div style={{ display: "flex", gap: 16, marginTop: 10, flexWrap: "wrap" }}>
          <div style={{ fontSize: 12, color: C.textDim }}>↑ Cobrado: <strong style={{ color: C.green }}>{fMXN(totalIngresos)}</strong></div>
          <div style={{ fontSize: 12, color: C.textDim }}>↓ Pagado: <strong style={{ color: C.red }}>{fMXN(totalEgresos)}</strong></div>
        </div>
        {porCobrar > 0 && (
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.border}`, fontSize: 12, color: C.yellow }}>
            📋 Por cobrar aún: <strong>{fMXN(porCobrar)}</strong>
          </div>
        )}
      </Card>

      {/* Alerts */}
      {(cobrosVencidos.length > 0 || stockBajo.length > 0) && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {cobrosVencidos.length > 0 && (
            <div style={{ background: C.red + "18", border: `1px solid ${C.red}44`, borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
              <Icon name="alert" size={16} /><span style={{ color: C.red, fontSize: 13, fontWeight: 600 }}>{cobrosVencidos.length} cobro(s) vencido(s) — {fMXN(cobrosVencidos.reduce((a, c) => a + Number(c.monto), 0))}</span>
            </div>
          )}
          {stockBajo.length > 0 && (
            <div style={{ background: C.orange + "18", border: `1px solid ${C.orange}44`, borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
              <Icon name="alert" size={16} /><span style={{ color: C.orange, fontSize: 13, fontWeight: 600 }}>{stockBajo.length} producto(s) en stock bajo: {stockBajo.map(s => s.nombre).join(", ")}</span>
            </div>
          )}
        </div>
      )}

      {/* KPIs del mes */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <StatCard label="Ventas mes" value={fMXN(totalVentas)} icon="sales" color={C.accent} />
        <StatCard label="Utilidad mes" value={fMXN(utilidad)} icon="trend" color={utilidad >= 0 ? C.green : C.red} />
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <StatCard label="Compras mes" value={fMXN(totalCompras)} icon="purchase" color={C.blue} />
        <StatCard label="Gastos mes" value={fMXN(totalGastos)} icon="expense" color={C.orange} />
      </div>

      {/* Margen */}
      {totalVentas > 0 && (
        <Card>
          <div style={{ fontSize: 11, color: C.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Margen bruto del mes</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: C.green }}>{((utilidad / totalVentas) * 100).toFixed(1)}%</div>
            <div style={{ flex: 1, height: 8, background: C.bg, borderRadius: 4, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${Math.min(100, Math.max(0, (utilidad / totalVentas) * 100))}%`, background: C.green, borderRadius: 4, transition: "width .5s" }} />
            </div>
          </div>
        </Card>
      )}

      {/* Top clientes */}
      {topClientes.length > 0 && (
        <Card>
          <div style={{ fontSize: 11, color: C.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Top clientes (mes)</div>
          {topClientes.map(([nombre, total], i) => (
            <div key={nombre} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: i < topClientes.length - 1 ? `1px solid ${C.border}` : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 24, height: 24, borderRadius: "50%", background: C.accentDim, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: C.accent }}>{i + 1}</div>
                <span style={{ fontSize: 13, color: C.text }}>{nombre || "—"}</span>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.accent }}>{fMXN(total)}</span>
            </div>
          ))}
        </Card>
      )}

      {/* Top productos */}
      {topProductos.length > 0 && (
        <Card>
          <div style={{ fontSize: 11, color: C.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Top productos (mes)</div>
          {topProductos.map(([nombre, total], i) => (
            <div key={nombre} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: i < topProductos.length - 1 ? `1px solid ${C.border}` : "none" }}>
              <span style={{ fontSize: 13, color: C.text }}>{nombre || "—"}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.blue }}>{fMXN(total)}</span>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

// ============================================================
// HELPERS — buscar producto en inventario
// ============================================================
function findInvMatch(inventario, nombre) {
  const q = nombre.toLowerCase().trim();
  return inventario.findIndex(i =>
    i.nombre?.toLowerCase() === q ||
    i.sku?.toLowerCase() === q ||
    i.nombre?.toLowerCase().includes(q) ||
    q.includes(i.nombre?.toLowerCase())
  );
}

const newLineVenta = () => ({ id: uid(), producto: "", cantidad: "1", precioUnitario: "", costo: "" });
const newLineCompra = () => ({ id: uid(), producto: "", cantidad: "1", costoUnitarioUSD: "" });

// ============================================================
// VENTAS
// ============================================================
function Ventas({ data, setData, clientes, inventario, setInventario, cobros, setCobros }) {
  const [modal, setModal] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [fecha, setFecha] = useState(today());
  const [cliente, setCliente] = useState("");
  const [clienteNuevo, setClienteNuevo] = useState("");
  const [notas, setNotas] = useState("");
  const [formaPago, setFormaPago] = useState("contado");
  const [fechaVenceCobro, setFechaVenceCobro] = useState("");
  const [lineas, setLineas] = useState([newLineVenta()]);

  const updateLinea = (idx, field, value) => {
    setLineas(prev => {
      const next = prev.map((l, i) => i === idx ? { ...l, [field]: value } : l);
      // Si cambia producto, auto-llenar costo desde inventario
      if (field === "producto") {
        const match = findInvMatch(inventario, value);
        if (match >= 0 && inventario[match].costoUnitario) {
          next[idx] = { ...next[idx], costo: inventario[match].costoUnitario };
        }
      }
      return next;
    });
  };

  const addLinea = () => setLineas(p => [...p, newLineVenta()]);
  const removeLinea = (idx) => setLineas(p => p.filter((_, i) => i !== idx));

  const totalGeneral = lineas.reduce((a, l) => a + Number(l.cantidad || 0) * Number(l.precioUnitario || 0), 0);

  const save = async () => {
    const nombreCliente = cliente === "__nuevo__" ? clienteNuevo : cliente;
    // Resolver nombre real de cada línea
    const validasRaw = lineas.filter(l => {
      const nombre = l.producto === "__otro__" ? (l.productoManual || "").trim() : l.producto;
      return nombre && l.cantidad && l.precioUnitario;
    });
    const validas = validasRaw.map(l => ({
      ...l,
      productoFinal: l.producto === "__otro__" ? l.productoManual.trim() : l.producto,
    }));
    if (!nombreCliente || validas.length === 0) return;

    const nuevasVentas = validas.map(l => {
      const total = Number(l.cantidad) * Number(l.precioUnitario);
      const utilidad = total - Number(l.cantidad) * Number(l.costo || 0);
      return { id: uid(), fecha, cliente: nombreCliente, producto: l.productoFinal, cantidad: l.cantidad, precioUnitario: l.precioUnitario, costo: l.costo, total, utilidad, notas, formaPago, cobrado: formaPago === "contado" };
    });

    const updatedVentas = [...data, ...nuevasVentas];
    setData(updatedVentas); await saveData(KEYS.ventas, updatedVentas);

    // Si es crédito, crear cobro pendiente automáticamente
    if (formaPago === "credito") {
      const totalVenta = nuevasVentas.reduce((a, v) => a + v.total, 0);
      const nuevoCobro = { id: uid(), fechaVenta: fecha, fechaVence: fechaVenceCobro, cliente: nombreCliente, concepto: validas.map(l => l.productoFinal).join(", "), monto: totalVenta, pagado: false, notas };
      const updatedCobros = [...cobros, nuevoCobro];
      setCobros(updatedCobros); await saveData(KEYS.cobros, updatedCobros);
    }

    // Actualizar inventario por cada línea usando nombre real
    let updatedInv = [...inventario];
    const newAlerts = [];
    for (const l of validas) {
      const qty = Number(l.cantidad);
      const match = findInvMatch(updatedInv, l.productoFinal);
      if (match >= 0) {
        const newStock = Math.max(0, Number(updatedInv[match].stock) - qty);
        updatedInv[match] = { ...updatedInv[match], stock: newStock };
        if (updatedInv[match].puntoReorden && newStock <= Number(updatedInv[match].puntoReorden)) {
          newAlerts.push(`⚠️ ${updatedInv[match].nombre}: stock en ${newStock} uds (reorden: ${updatedInv[match].puntoReorden})`);
        }
      }
    }
    setInventario(updatedInv); await saveData(KEYS.inventario, updatedInv);
    if (newAlerts.length) { setAlerts(newAlerts); setTimeout(() => setAlerts([]), 8000); }

    setModal(false); setFecha(today()); setCliente(""); setClienteNuevo(""); setNotas(""); setFormaPago("contado"); setFechaVenceCobro(""); setLineas([newLineVenta()]);
  };

  const del = async (id) => { const n = data.filter(x => x.id !== id); setData(n); await saveData(KEYS.ventas, n); };
  const sorted = [...data].sort((a, b) => b.fecha?.localeCompare(a.fecha));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {alerts.map((a, i) => (
        <div key={i} style={{ background: C.orange + "22", border: `1px solid ${C.orange}55`, borderRadius: 10, padding: "10px 14px", fontSize: 13, color: C.orange, fontWeight: 600 }}>{a}</div>
      ))}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: C.text }}>Ventas</h2>
          <div style={{ fontSize: 12, color: C.textDim }}>{data.length} registros · {fMXN(data.reduce((a, v) => a + Number(v.total || 0), 0))} total</div>
        </div>
        <Btn onClick={() => setModal(true)}><Icon name="plus" size={14} /> Registrar</Btn>
      </div>

      {sorted.map(v => (
        <Card key={v.id} style={{ padding: "12px 14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 4 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{v.producto}</span>
                <Tag>{v.cliente}</Tag>
              </div>
              <div style={{ fontSize: 12, color: C.textDim }}>{fDate(v.fecha)} · {v.cantidad} uds · {fMXN(v.precioUnitario)}/ud</div>
              {v.costo > 0 && <div style={{ fontSize: 11, color: C.green, marginTop: 2 }}>Margen: {(((v.total - v.cantidad * v.costo) / v.total) * 100).toFixed(1)}% · Utilidad: {fMXN(v.utilidad)}</div>}
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: C.accent }}>{fMXN(v.total)}</span>
              <button onClick={() => del(v.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.textDim, padding: 2 }}><Icon name="trash" size={14} /></button>
            </div>
          </div>
        </Card>
      ))}

      {modal && (
        <Modal title="Registrar venta" onClose={() => { setModal(false); setLineas([newLineVenta()]); }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Cabecera */}
            <div style={{ display: "flex", gap: 10 }}>
              <Input label="Fecha" type="date" value={fecha} onChange={setFecha} />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 11, color: C.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Cliente *</label>
                <select value={cliente} onChange={e => setCliente(e.target.value)}
                  style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: cliente ? C.text : C.textDim, fontSize: 14, fontFamily: "inherit", outline: "none" }}>
                  <option value="">Seleccionar cliente...</option>
                  {clientes.map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
                  <option value="__nuevo__">+ Nuevo cliente</option>
                </select>
                {cliente === "__nuevo__" && (
                  <input value={clienteNuevo} onChange={e => setClienteNuevo(e.target.value)} placeholder="Nombre del cliente nuevo"
                    style={{ background: C.bg, border: `1px solid ${C.accent}44`, borderRadius: 8, padding: "10px 12px", color: C.text, fontSize: 14, fontFamily: "inherit", outline: "none" }} />
                )}
              </div>
            </div>

            {/* Forma de pago */}
            <div>
              <div style={{ fontSize: 11, color: C.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Forma de pago</div>
              <div style={{ display: "flex", gap: 8 }}>
                {["contado", "credito"].map(op => (
                  <button key={op} onClick={() => setFormaPago(op)} style={{
                    flex: 1, padding: "10px", borderRadius: 10, border: `2px solid ${formaPago === op ? (op === "contado" ? C.green : C.yellow) : C.border}`,
                    background: formaPago === op ? (op === "contado" ? C.green + "22" : C.yellow + "22") : "transparent",
                    color: formaPago === op ? (op === "contado" ? C.green : C.yellow) : C.textDim,
                    fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", textTransform: "capitalize",
                  }}>
                    {op === "contado" ? "✓ Contado" : "⏳ Crédito"}
                  </button>
                ))}
              </div>
              {formaPago === "credito" && (
                <div style={{ marginTop: 8 }}>
                  <Input label="Fecha límite de pago" type="date" value={fechaVenceCobro} onChange={setFechaVenceCobro} />
                  <div style={{ fontSize: 11, color: C.yellow, marginTop: 4 }}>Se creará automáticamente en Cobros pendientes</div>
                </div>
              )}
            </div>

            {/* Líneas de productos */}
            <div style={{ fontSize: 11, color: C.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Productos</div>
            {lineas.map((l, idx) => {
              const subtotal = Number(l.cantidad || 0) * Number(l.precioUnitario || 0);
              const margen = l.costo && subtotal > 0 ? (((subtotal - Number(l.cantidad) * Number(l.costo)) / subtotal) * 100).toFixed(1) : null;
              return (
                <div key={l.id} style={{ background: C.bg, borderRadius: 10, padding: 10, border: `1px solid ${C.border}` }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 8 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 10, color: C.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Producto *</label>
                      <select
                        value={l.producto}
                        onChange={e => updateLinea(idx, "producto", e.target.value)}
                        style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 10px", color: l.producto ? C.text : C.textDim, fontSize: 13, fontFamily: "inherit", outline: "none", marginTop: 4 }}
                      >
                        <option value="">Seleccionar...</option>
                        {inventario.map(i => <option key={i.id} value={i.nombre}>{i.nombre}{i.sku ? ` (${i.sku})` : ""} — Stock: {i.stock}</option>)}
                        <option value="__otro__">Otro (escribir manualmente)</option>
                      </select>
                      {l.producto === "__otro__" && (
                        <input value={l.productoManual || ""} onChange={e => updateLinea(idx, "productoManual", e.target.value)}
                          placeholder="Nombre del producto"
                          style={{ width: "100%", marginTop: 6, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 10px", color: C.text, fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
                      )}
                    </div>
                    {lineas.length > 1 && (
                      <button onClick={() => removeLinea(idx)} style={{ background: "none", border: "none", cursor: "pointer", color: C.red, padding: "4px", marginTop: 18 }}><Icon name="trash" size={14} /></button>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <div style={{ flex: "0 0 70px" }}>
                      <label style={{ fontSize: 10, color: C.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Cant.</label>
                      <input type="number" value={l.cantidad} onChange={e => updateLinea(idx, "cantidad", e.target.value)}
                        style={{ width: "100%", marginTop: 4, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px", color: C.text, fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 10, color: C.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Precio venta *</label>
                      <input type="number" value={l.precioUnitario} onChange={e => updateLinea(idx, "precioUnitario", e.target.value)} placeholder="MXN"
                        style={{ width: "100%", marginTop: 4, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px", color: C.text, fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 10, color: C.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Costo unit.</label>
                      <input type="number" value={l.costo} onChange={e => updateLinea(idx, "costo", e.target.value)} placeholder="Auto"
                        style={{ width: "100%", marginTop: 4, background: C.surface, border: `1px solid ${C.accent}44`, borderRadius: 8, padding: "8px", color: C.text, fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
                    </div>
                  </div>
                  {subtotal > 0 && (
                    <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                      <span style={{ color: C.textDim }}>Subtotal: <strong style={{ color: C.accent }}>{fMXN(subtotal)}</strong></span>
                      {margen && <span style={{ color: C.green }}>Margen: <strong>{margen}%</strong></span>}
                    </div>
                  )}
                </div>
              );
            })}

            <Btn variant="ghost" onClick={addLinea} small><Icon name="plus" size={13} /> Agregar producto</Btn>

            {totalGeneral > 0 && (
              <div style={{ background: C.accentDim, borderRadius: 10, padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: C.textMid, fontSize: 13 }}>{lineas.filter(l => l.producto && l.precioUnitario).length} producto(s)</span>
                <span style={{ fontSize: 17, fontWeight: 800, color: C.accent }}>Total: {fMXN(totalGeneral)}</span>
              </div>
            )}

            <Input label="Notas" value={notas} onChange={setNotas} placeholder="Observaciones de la venta..." />
            <Btn onClick={save}>Guardar venta completa</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ============================================================
// COMPRAS
// ============================================================
function Compras({ data, setData, inventario, setInventario, proveedores }) {
  const [modal, setModal] = useState(false);
  const [invMsg, setInvMsg] = useState(null);
  const [fecha, setFecha] = useState(today());
  const [proveedor, setProveedor] = useState("");
  const [proveedorNuevo, setProveedorNuevo] = useState("");
  const [tipoCambio, setTipoCambio] = useState("17.5");
  const [notas, setNotas] = useState("");
  const [lineas, setLineas] = useState([newLineCompra()]);

  const updateLinea = (idx, field, value) => {
    setLineas(prev => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  };

  const addLinea = () => setLineas(p => [...p, newLineCompra()]);
  const removeLinea = (idx) => setLineas(p => p.filter((_, i) => i !== idx));

  const tc = Number(tipoCambio || 17.5);
  const totalUSD = lineas.reduce((a, l) => a + Number(l.cantidad || 0) * Number(l.costoUnitarioUSD || 0), 0);
  const totalMXN = totalUSD * tc;

  const save = async () => {
    const nombreProv = proveedor === "__nuevo__" ? proveedorNuevo : proveedor;
    // Resolver nombre real de cada línea (si eligió "Producto nuevo", usar productoNuevo)
    const validasRaw = lineas.filter(l => {
      const nombre = l.producto === "__nuevo__" ? (l.productoNuevo || "").trim() : l.producto;
      return nombre && l.cantidad && l.costoUnitarioUSD;
    });
    const validas = validasRaw.map(l => ({
      ...l,
      productoFinal: l.producto === "__nuevo__" ? l.productoNuevo.trim() : l.producto,
    }));
    if (!nombreProv || validas.length === 0) return;

    const nuevasCompras = validas.map(l => {
      const tUSD = Number(l.cantidad) * Number(l.costoUnitarioUSD);
      const tMXN = tUSD * tc;
      return { id: uid(), fecha, proveedor: nombreProv, producto: l.productoFinal, cantidad: l.cantidad, costoUnitarioUSD: l.costoUnitarioUSD, tipoCambio, totalUSD: tUSD, total: tMXN, lote: l.lote, caducidad: l.caducidad, notas };
    });

    const updatedCompras = [...data, ...nuevasCompras];
    setData(updatedCompras); await saveData(KEYS.compras, updatedCompras);

    // Actualizar inventario por cada línea usando el nombre real
    let updatedInv = [...inventario];
    const msgs = [];
    for (const l of validas) {
      const qty = Number(l.cantidad);
      const costoUnitMXN = (Number(l.costoUnitarioUSD) * tc).toFixed(0);
      const match = findInvMatch(updatedInv, l.productoFinal);
      if (match >= 0) {
        const newStock = Number(updatedInv[match].stock) + qty;
        updatedInv[match] = { ...updatedInv[match], stock: newStock, costoUnitario: costoUnitMXN };
        msgs.push(`✓ ${updatedInv[match].nombre}: +${qty} uds → stock ${newStock}`);
      } else {
        // Producto nuevo — crearlo en inventario con todos los datos
        updatedInv.push({
          id: uid(),
          nombre: l.productoFinal,
          sku: "",
          stock: qty,
          puntoReorden: "",
          costoUnitario: costoUnitMXN,
          proveedor: nombreProv,
        });
        msgs.push(`✓ Nuevo: "${l.productoFinal}" agregado con ${qty} uds`);
      }
    }
    setInventario(updatedInv); await saveData(KEYS.inventario, updatedInv);
    setInvMsg(msgs.join(" · ")); setTimeout(() => setInvMsg(null), 6000);

    setModal(false); setFecha(today()); setProveedor(""); setProveedorNuevo(""); setTipoCambio("17.5"); setNotas(""); setLineas([newLineCompra()]);
  };

  const del = async (id) => { const n = data.filter(x => x.id !== id); setData(n); await saveData(KEYS.compras, n); };
  const sorted = [...data].sort((a, b) => b.fecha?.localeCompare(a.fecha));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {invMsg && (
        <div style={{ background: C.green + "22", border: `1px solid ${C.green}55`, borderRadius: 10, padding: "10px 14px", fontSize: 12, color: C.green, fontWeight: 600 }}>{invMsg}</div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: C.text }}>Compras</h2>
          <div style={{ fontSize: 12, color: C.textDim }}>{data.length} registros</div>
        </div>
        <Btn onClick={() => setModal(true)}><Icon name="plus" size={14} /> Registrar</Btn>
      </div>

      {sorted.map(c => (
        <Card key={c.id} style={{ padding: "12px 14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4 }}>{c.producto}</div>
              <div style={{ fontSize: 12, color: C.textDim }}>{fDate(c.fecha)} · {c.cantidad} uds · {c.proveedor}</div>
              <div style={{ fontSize: 11, color: C.blue, marginTop: 2 }}>${Number(c.totalUSD || 0).toFixed(0)} USD · TC {c.tipoCambio}</div>
              {(c.lote || c.caducidad) && (
                <div style={{ display: "flex", gap: 10, marginTop: 3 }}>
                  {c.lote && <span style={{ fontSize: 11, color: C.textDim, fontFamily: "monospace" }}>Lote: {c.lote}</span>}
                  {c.caducidad && <span style={{ fontSize: 11, color: new Date(c.caducidad) < new Date() ? C.red : C.textDim }}>Cad: {fDate(c.caducidad)}</span>}
                </div>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: C.blue }}>{fMXN(c.total)}</span>
              <button onClick={() => del(c.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.textDim, padding: 2 }}><Icon name="trash" size={14} /></button>
            </div>
          </div>
        </Card>
      ))}

      {modal && (
        <Modal title="Registrar compra / factura" onClose={() => { setModal(false); setLineas([newLineCompra()]); }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Cabecera factura */}
            <div style={{ display: "flex", gap: 10 }}>
              <Input label="Fecha" type="date" value={fecha} onChange={setFecha} />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 11, color: C.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Proveedor *</label>
                <select value={proveedor} onChange={e => setProveedor(e.target.value)}
                  style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: proveedor ? C.text : C.textDim, fontSize: 14, fontFamily: "inherit", outline: "none" }}>
                  <option value="">Seleccionar proveedor...</option>
                  {proveedores.map(p => <option key={p.id} value={p.nombre}>{p.nombre}</option>)}
                  <option value="__nuevo__">+ Nuevo proveedor</option>
                </select>
                {proveedor === "__nuevo__" && (
                  <input value={proveedorNuevo} onChange={e => setProveedorNuevo(e.target.value)} placeholder="Nombre del proveedor nuevo"
                    style={{ background: C.bg, border: `1px solid ${C.accent}44`, borderRadius: 8, padding: "10px 12px", color: C.text, fontSize: 14, fontFamily: "inherit", outline: "none" }} />
                )}
              </div>
            </div>
            <Input label="Tipo de cambio (MXN/USD)" type="number" value={tipoCambio} onChange={setTipoCambio} />

            {/* Líneas de productos */}
            <div style={{ fontSize: 11, color: C.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Productos de la factura</div>
            {lineas.map((l, idx) => {
              const subUSD = Number(l.cantidad || 0) * Number(l.costoUnitarioUSD || 0);
              return (
                <div key={l.id} style={{ background: C.bg, borderRadius: 10, padding: 10, border: `1px solid ${C.border}` }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "flex-end", marginBottom: 6 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 10, color: C.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Producto *</label>
                      <select
                        value={l.producto}
                        onChange={e => updateLinea(idx, "producto", e.target.value)}
                        style={{ width: "100%", marginTop: 4, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 10px", color: l.producto ? C.text : C.textDim, fontSize: 13, fontFamily: "inherit", outline: "none" }}
                      >
                        <option value="">Seleccionar...</option>
                        {inventario.map(i => <option key={i.id} value={i.nombre}>{i.nombre}{i.sku ? ` (${i.sku})` : ""}</option>)}
                        <option value="__nuevo__">Producto nuevo</option>
                      </select>
                      {l.producto === "__nuevo__" && (
                        <input value={l.productoNuevo || ""} onChange={e => updateLinea(idx, "productoNuevo", e.target.value)}
                          placeholder="Nombre del producto nuevo"
                          style={{ width: "100%", marginTop: 6, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 10px", color: C.text, fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
                      )}
                    </div>
                    {lineas.length > 1 && (
                      <button onClick={() => removeLinea(idx)} style={{ background: "none", border: "none", cursor: "pointer", color: C.red, padding: "4px 0 8px" }}><Icon name="trash" size={14} /></button>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <div style={{ flex: "0 0 70px" }}>
                      <label style={{ fontSize: 10, color: C.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Cant.</label>
                      <input type="number" value={l.cantidad} onChange={e => updateLinea(idx, "cantidad", e.target.value)}
                        style={{ width: "100%", marginTop: 4, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px", color: C.text, fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 10, color: C.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Costo unit. USD *</label>
                      <input type="number" value={l.costoUnitarioUSD} onChange={e => updateLinea(idx, "costoUnitarioUSD", e.target.value)} placeholder="0.00"
                        style={{ width: "100%", marginTop: 4, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px", color: C.text, fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
                    </div>
                  </div>
                  {subUSD > 0 && (
                    <div style={{ marginTop: 8, fontSize: 12, color: C.textDim }}>
                      Subtotal: <strong style={{ color: C.blue }}>${subUSD.toFixed(0)} USD = {fMXN(subUSD * tc)}</strong>
                    </div>
                  )}
                  {/* Lote y caducidad */}
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 10, color: C.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>No. Lote</label>
                      <input value={l.lote || ""} onChange={e => updateLinea(idx, "lote", e.target.value)} placeholder="Ej: AB1234"
                        style={{ width: "100%", marginTop: 4, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px", color: C.text, fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box", fontFamily: "monospace" }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 10, color: C.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Caducidad</label>
                      <input type="date" value={l.caducidad || ""} onChange={e => updateLinea(idx, "caducidad", e.target.value)}
                        style={{ width: "100%", marginTop: 4, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px", color: C.text, fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
                    </div>
                  </div>
                </div>
              );
            })}

            <Btn variant="ghost" onClick={addLinea} small><Icon name="plus" size={13} /> Agregar producto</Btn>

            {totalUSD > 0 && (
              <div style={{ background: C.blue + "18", borderRadius: 10, padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: C.textDim, fontSize: 12 }}>{lineas.filter(l => l.producto && l.costoUnitarioUSD).length} producto(s)</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: C.blue }}>${totalUSD.toFixed(0)} USD = {fMXN(totalMXN)}</span>
              </div>
            )}

            <Input label="Notas / # Factura" value={notas} onChange={setNotas} placeholder="Ej: Factura #1234" />
            <Btn onClick={save}>Guardar factura completa</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ============================================================
// GASTOS
// ============================================================
const CATEGORIAS_GASTO = ["Logística/envíos", "Renta/oficina", "Sueldos", "Marketing", "Servicios digitales", "Viáticos", "Impuestos/contable", "Bancario", "Otro"];

function Gastos({ data, setData }) {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ fecha: today(), categoria: "Logística/envíos", descripcion: "", monto: "", notas: "" });
  const f = (k) => (v) => setForm(p => ({ ...p, [k]: v }));

  const save = async () => {
    if (!form.descripcion || !form.monto) return;
    const nuevo = [...data, { id: uid(), ...form }];
    setData(nuevo); await saveData(KEYS.gastos, nuevo); setModal(false);
    setForm({ fecha: today(), categoria: "Logística/envíos", descripcion: "", monto: "", notas: "" });
  };

  const del = async (id) => { const n = data.filter(x => x.id !== id); setData(n); await saveData(KEYS.gastos, n); };
  const sorted = [...data].sort((a, b) => b.fecha?.localeCompare(a.fecha));

  const porCategoria = CATEGORIAS_GASTO.map(cat => ({
    cat, total: data.filter(g => g.categoria === cat).reduce((a, g) => a + Number(g.monto || 0), 0)
  })).filter(x => x.total > 0).sort((a, b) => b.total - a.total);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: C.text }}>Gastos</h2>
          <div style={{ fontSize: 12, color: C.textDim }}>{fMXN(data.reduce((a, g) => a + Number(g.monto || 0), 0))} total</div>
        </div>
        <Btn onClick={() => setModal(true)}><Icon name="plus" size={14} /> Registrar</Btn>
      </div>

      {porCategoria.length > 0 && (
        <Card>
          <div style={{ fontSize: 11, color: C.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Por categoría</div>
          {porCategoria.map(({ cat, total }) => (
            <div key={cat} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 13, color: C.textMid }}>{cat}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.orange }}>{fMXN(total)}</span>
            </div>
          ))}
        </Card>
      )}

      {sorted.map(g => (
        <Card key={g.id} style={{ padding: "12px 14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{g.descripcion}</div>
              <div style={{ fontSize: 11, color: C.textDim, marginTop: 2 }}>{fDate(g.fecha)} · <Tag color={C.orange}>{g.categoria}</Tag></div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: C.orange }}>{fMXN(g.monto)}</span>
              <button onClick={() => del(g.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.textDim, padding: 2 }}><Icon name="trash" size={14} /></button>
            </div>
          </div>
        </Card>
      ))}

      {modal && (
        <Modal title="Registrar gasto" onClose={() => setModal(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", gap: 10 }}>
              <Input label="Fecha" type="date" value={form.fecha} onChange={f("fecha")} />
              <Select label="Categoría" value={form.categoria} onChange={f("categoria")} options={CATEGORIAS_GASTO.map(c => ({ value: c, label: c }))} />
            </div>
            <Input label="Descripción" value={form.descripcion} onChange={f("descripcion")} placeholder="¿En qué se gastó?" required />
            <Input label="Monto MXN" type="number" value={form.monto} onChange={f("monto")} placeholder="0" required />
            <Input label="Notas" value={form.notas} onChange={f("notas")} placeholder="Observaciones..." />
            <Btn onClick={save}>Guardar gasto</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ============================================================
// CLIENTES
// ============================================================
function Clientes({ data, setData, ventas }) {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ nombre: "", tipo: "Revendedor", contacto: "", ciudad: "", notas: "", activo: true });
  const f = (k) => (v) => setForm(p => ({ ...p, [k]: v }));

  const save = async () => {
    if (!form.nombre) return;
    const nuevo = [...data, { id: uid(), ...form, fechaAlta: today() }];
    setData(nuevo); await saveData(KEYS.clientes, nuevo); setModal(false);
    setForm({ nombre: "", tipo: "Revendedor", contacto: "", ciudad: "", notas: "", activo: true });
  };

  const del = async (id) => { const n = data.filter(x => x.id !== id); setData(n); await saveData(KEYS.clientes, n); };

  const ventasPorCliente = ventas.reduce((acc, v) => { acc[v.cliente] = (acc[v.cliente] || 0) + Number(v.total || 0); return acc; }, {});

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: C.text }}>Clientes</h2>
          <div style={{ fontSize: 12, color: C.textDim }}>{data.filter(c => c.activo).length} activos</div>
        </div>
        <Btn onClick={() => setModal(true)}><Icon name="plus" size={14} /> Agregar</Btn>
      </div>

      {data.map(c => (
        <Card key={c.id} style={{ padding: "12px 14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{c.nombre}</span>
                <Tag color={c.tipo === "Hospital" ? C.blue : C.accent}>{c.tipo}</Tag>
                {!c.activo && <Tag color={C.red}>Inactivo</Tag>}
              </div>
              {c.ciudad && <div style={{ fontSize: 12, color: C.textDim }}>{c.ciudad}</div>}
              {ventasPorCliente[c.nombre] > 0 && <div style={{ fontSize: 11, color: C.accent, marginTop: 2 }}>Ventas totales: {fMXN(ventasPorCliente[c.nombre])}</div>}
            </div>
            <button onClick={() => del(c.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.textDim, padding: 2 }}><Icon name="trash" size={14} /></button>
          </div>
        </Card>
      ))}

      {modal && (
        <Modal title="Agregar cliente" onClose={() => setModal(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Input label="Nombre" value={form.nombre} onChange={f("nombre")} placeholder="Nombre del cliente" required />
            <div style={{ display: "flex", gap: 10 }}>
              <Select label="Tipo" value={form.tipo} onChange={f("tipo")} options={["Revendedor", "Clínica", "Hospital", "Distribuidor"].map(t => ({ value: t, label: t }))} />
              <Input label="Ciudad" value={form.ciudad} onChange={f("ciudad")} placeholder="Ciudad" />
            </div>
            <Input label="Contacto / WhatsApp" value={form.contacto} onChange={f("contacto")} placeholder="Teléfono o nombre" />
            <Input label="Notas" value={form.notas} onChange={f("notas")} placeholder="Observaciones..." />
            <Btn onClick={save}>Guardar cliente</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ============================================================
// INVENTARIO
// ============================================================
function Inventario({ data, setData }) {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ sku: "", nombre: "", stock: "", puntoReorden: "", costoUnitario: "", proveedor: "", notas: "" });
  const f = (k) => (v) => setForm(p => ({ ...p, [k]: v }));

  const save = async () => {
    if (!form.nombre || !form.stock) return;
    const existing = data.findIndex(x => x.sku === form.sku && form.sku);
    let nuevo;
    if (existing >= 0) { nuevo = [...data]; nuevo[existing] = { ...nuevo[existing], ...form }; }
    else { nuevo = [...data, { id: uid(), ...form }]; }
    setData(nuevo); await saveData(KEYS.inventario, nuevo); setModal(false);
    setForm({ sku: "", nombre: "", stock: "", puntoReorden: "", costoUnitario: "", proveedor: "", notas: "" });
  };

  const del = async (id) => { const n = data.filter(x => x.id !== id); setData(n); await saveData(KEYS.inventario, n); };

  const sorted = [...data].sort((a, b) => {
    const aLow = Number(a.stock) <= Number(a.puntoReorden);
    const bLow = Number(b.stock) <= Number(b.puntoReorden);
    return bLow - aLow;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: C.text }}>Inventario</h2>
          <div style={{ fontSize: 12, color: C.textDim }}>{data.length} productos</div>
        </div>
        <Btn onClick={() => setModal(true)}><Icon name="plus" size={14} /> Agregar</Btn>
      </div>

      {sorted.map(item => {
        const bajo = Number(item.stock) <= Number(item.puntoReorden);
        const critico = Number(item.stock) === 0;
        return (
          <Card key={item.id} style={{ padding: "12px 14px", borderColor: critico ? C.red + "66" : bajo ? C.orange + "66" : C.border }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{item.nombre}</span>
                  {item.sku && <span style={{ fontSize: 11, color: C.textDim, fontFamily: "monospace" }}>{item.sku}</span>}
                  {critico && <Tag color={C.red}>SIN STOCK</Tag>}
                  {!critico && bajo && <Tag color={C.orange}>STOCK BAJO</Tag>}
                </div>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                  <div style={{ fontSize: 12, color: C.textDim }}>Stock: <strong style={{ color: critico ? C.red : bajo ? C.orange : C.text }}>{item.stock}</strong></div>
                  {item.puntoReorden && <div style={{ fontSize: 12, color: C.textDim }}>Reorden en: {item.puntoReorden}</div>}
                  {item.costoUnitario && <div style={{ fontSize: 12, color: C.textDim }}>Costo: {fMXN(item.costoUnitario)}</div>}
                </div>
              </div>
              <button onClick={() => del(item.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.textDim, padding: 2 }}><Icon name="trash" size={14} /></button>
            </div>
          </Card>
        );
      })}

      {modal && (
        <Modal title="Agregar / actualizar producto" onClose={() => setModal(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", gap: 10 }}>
              <Input label="SKU" value={form.sku} onChange={f("sku")} placeholder="Ej: LF4418" />
              <Input label="Nombre del producto" value={form.nombre} onChange={f("nombre")} placeholder="Nombre" required />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <Input label="Stock actual" type="number" value={form.stock} onChange={f("stock")} placeholder="0" required />
              <Input label="Punto de reorden" type="number" value={form.puntoReorden} onChange={f("puntoReorden")} placeholder="0" />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <Input label="Costo unitario MXN" type="number" value={form.costoUnitario} onChange={f("costoUnitario")} placeholder="0" />
              <Input label="Proveedor" value={form.proveedor} onChange={f("proveedor")} placeholder="Nombre" />
            </div>
            <Btn onClick={save}>Guardar producto</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ============================================================
// COBROS
// ============================================================
function Cobros({ data, setData, ventas, setVentas }) {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ fechaVenta: today(), fechaVence: "", cliente: "", concepto: "", monto: "", pagado: false, notas: "" });
  const f = (k) => (v) => setForm(p => ({ ...p, [k]: v }));

  const save = async () => {
    if (!form.cliente || !form.monto) return;
    const nuevo = [...data, { id: uid(), ...form }];
    setData(nuevo); await saveData(KEYS.cobros, nuevo); setModal(false);
    setForm({ fechaVenta: today(), fechaVence: "", cliente: "", concepto: "", monto: "", pagado: false, notas: "" });
  };

  const togglePagado = async (id) => {
    const cobro = data.find(c => c.id === id);
    const nowPagado = !cobro?.pagado;
    const n = data.map(c => c.id === id ? { ...c, pagado: nowPagado, fechaPago: nowPagado ? today() : null } : c);
    setData(n); await saveData(KEYS.cobros, n);
    // Si se marca como pagado, actualizar ventas relacionadas del mismo cliente/concepto
    if (nowPagado && ventas && setVentas) {
      const updated = ventas.map(v =>
        v.cliente === cobro.cliente && v.formaPago === "credito" && !v.cobrado ? { ...v, cobrado: true } : v
      );
      setVentas(updated); await saveData(KEYS.ventas, updated);
    }
  };

  const del = async (id) => { const n = data.filter(x => x.id !== id); setData(n); await saveData(KEYS.cobros, n); };

  const pendientes = data.filter(c => !c.pagado).sort((a, b) => a.fechaVence?.localeCompare(b.fechaVence));
  const pagados = data.filter(c => c.pagado);
  const totalPendiente = pendientes.reduce((a, c) => a + Number(c.monto || 0), 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: C.text }}>Cobros</h2>
          <div style={{ fontSize: 12, color: C.textDim }}>Por cobrar: <strong style={{ color: C.yellow }}>{fMXN(totalPendiente)}</strong></div>
        </div>
        <Btn onClick={() => setModal(true)}><Icon name="plus" size={14} /> Registrar</Btn>
      </div>

      {pendientes.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: C.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Pendientes</div>
          {pendientes.map(c => {
            const vencido = c.fechaVence && c.fechaVence < today();
            return (
              <Card key={c.id} style={{ padding: "12px 14px", marginBottom: 8, borderColor: vencido ? C.red + "66" : C.border }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 3, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{c.cliente}</span>
                      {vencido && <Tag color={C.red}>VENCIDO</Tag>}
                    </div>
                    <div style={{ fontSize: 12, color: C.textDim }}>{c.concepto}</div>
                    {c.fechaVence && <div style={{ fontSize: 11, color: vencido ? C.red : C.textDim, marginTop: 2 }}>Vence: {fDate(c.fechaVence)}</div>}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: C.yellow }}>{fMXN(c.monto)}</span>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => togglePagado(c.id)} style={{ background: C.green + "22", border: `1px solid ${C.green}44`, borderRadius: 6, cursor: "pointer", color: C.green, padding: "3px 8px", fontSize: 11, fontWeight: 600 }}>✓ Cobrado</button>
                      <button onClick={() => del(c.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.textDim, padding: 2 }}><Icon name="trash" size={13} /></button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {pagados.length > 0 && (
        <details>
          <summary style={{ fontSize: 12, color: C.textDim, cursor: "pointer", marginBottom: 8, userSelect: "none" }}>{pagados.length} cobro(s) realizados</summary>
          {pagados.map(c => (
            <Card key={c.id} style={{ padding: "10px 14px", marginBottom: 6, opacity: 0.6 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div>
                  <span style={{ fontSize: 13, color: C.text }}>{c.cliente}</span>
                  <div style={{ fontSize: 11, color: C.textDim }}>{c.concepto} · Cobrado {fDate(c.fechaPago)}</div>
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, color: C.green }}>{fMXN(c.monto)}</span>
              </div>
            </Card>
          ))}
        </details>
      )}

      {modal && (
        <Modal title="Registrar cobro" onClose={() => setModal(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Input label="Cliente" value={form.cliente} onChange={f("cliente")} placeholder="Nombre del cliente" required />
            <Input label="Concepto" value={form.concepto} onChange={f("concepto")} placeholder="¿Por qué venta?" />
            <Input label="Monto MXN" type="number" value={form.monto} onChange={f("monto")} placeholder="0" required />
            <div style={{ display: "flex", gap: 10 }}>
              <Input label="Fecha de venta" type="date" value={form.fechaVenta} onChange={f("fechaVenta")} />
              <Input label="Fecha de vencimiento" type="date" value={form.fechaVence} onChange={f("fechaVence")} />
            </div>
            <Btn onClick={save}>Guardar cobro</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ============================================================
// PROVEEDORES
// ============================================================
function Proveedores({ data, setData, compras }) {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ nombre: "", contacto: "", pais: "USA", email: "", whatsapp: "", condicionesPago: "", notas: "" });
  const f = (k) => (v) => setForm(p => ({ ...p, [k]: v }));

  const save = async () => {
    if (!form.nombre) return;
    const nuevo = [...data, { id: uid(), ...form, fechaAlta: today() }];
    setData(nuevo); await saveData(KEYS.proveedores, nuevo); setModal(false);
    setForm({ nombre: "", contacto: "", pais: "USA", email: "", whatsapp: "", condicionesPago: "", notas: "" });
  };

  const del = async (id) => { const n = data.filter(x => x.id !== id); setData(n); await saveData(KEYS.proveedores, n); };

  const comprasPorProveedor = compras.reduce((acc, c) => {
    acc[c.proveedor] = (acc[c.proveedor] || 0) + Number(c.total || 0);
    return acc;
  }, {});

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: C.text }}>Proveedores</h2>
          <div style={{ fontSize: 12, color: C.textDim }}>{data.length} registrados</div>
        </div>
        <Btn onClick={() => setModal(true)}><Icon name="plus" size={14} /> Agregar</Btn>
      </div>

      {data.map(p => (
        <Card key={p.id} style={{ padding: "12px 14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{p.nombre}</span>
                <Tag color={C.blue}>{p.pais}</Tag>
              </div>
              {p.contacto && <div style={{ fontSize: 12, color: C.textDim }}>Contacto: {p.contacto}</div>}
              {p.condicionesPago && <div style={{ fontSize: 12, color: C.textDim }}>Pago: {p.condicionesPago}</div>}
              {comprasPorProveedor[p.nombre] > 0 && (
                <div style={{ fontSize: 11, color: C.blue, marginTop: 3 }}>Total comprado: {fMXN(comprasPorProveedor[p.nombre])}</div>
              )}
              {p.whatsapp && (
                <a href={`https://wa.me/${p.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer"
                  style={{ display: "inline-block", marginTop: 6, fontSize: 11, color: C.green, fontWeight: 600, textDecoration: "none" }}>
                  💬 WhatsApp
                </a>
              )}
            </div>
            <button onClick={() => del(p.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.textDim, padding: 2 }}><Icon name="trash" size={14} /></button>
          </div>
        </Card>
      ))}

      {data.length === 0 && (
        <Card style={{ textAlign: "center", padding: 24 }}>
          <div style={{ color: C.textDim, fontSize: 13 }}>No hay proveedores registrados aún.</div>
        </Card>
      )}

      {modal && (
        <Modal title="Agregar proveedor" onClose={() => setModal(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", gap: 10 }}>
              <Input label="Nombre *" value={form.nombre} onChange={f("nombre")} placeholder="Nombre del proveedor" />
              <Select label="País" value={form.pais} onChange={f("pais")} options={["USA", "México", "Alemania", "China", "Otro"].map(v => ({ value: v, label: v }))} />
            </div>
            <Input label="Nombre del contacto" value={form.contacto} onChange={f("contacto")} placeholder="Nombre de quien te atiende" />
            <div style={{ display: "flex", gap: 10 }}>
              <Input label="Email" value={form.email} onChange={f("email")} placeholder="email@proveedor.com" />
              <Input label="WhatsApp" value={form.whatsapp} onChange={f("whatsapp")} placeholder="+1 555 000 0000" />
            </div>
            <Input label="Condiciones de pago" value={form.condicionesPago} onChange={f("condicionesPago")} placeholder="Ej: 30 días, wire transfer" />
            <Input label="Notas" value={form.notas} onChange={f("notas")} placeholder="Observaciones..." />
            <Btn onClick={save}>Guardar proveedor</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ============================================================
// CHAT CON CLAUDE
// ============================================================
function ChatClaude({ ventas, compras, gastos, clientes, inventario, cobros }) {
  const [msgs, setMsgs] = useState([{
    role: "assistant",
    content: "Hola Jacobo. Soy tu asesor estratégico de AJ Medical. Puedo ver todos tus datos en tiempo real — ventas, compras, gastos, cobros, inventario y clientes. ¿Qué quieres analizar hoy?"
  }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef();

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const buildContext = () => {
    const mesActual = new Date().toISOString().slice(0, 7);
    const ventasMes = ventas.filter(v => v.fecha?.startsWith(mesActual));
    const comprasMes = compras.filter(c => c.fecha?.startsWith(mesActual));
    const gastosMes = gastos.filter(g => g.fecha?.startsWith(mesActual));
    const totalVentas = ventasMes.reduce((a, v) => a + Number(v.total || 0), 0);
    const totalCompras = comprasMes.reduce((a, c) => a + Number(c.total || 0), 0);
    const totalGastos = gastosMes.reduce((a, g) => a + Number(g.monto || 0), 0);
    const cobrosVencidos = cobros.filter(c => !c.pagado && c.fechaVence < new Date().toISOString().split("T")[0]);
    const stockBajo = inventario.filter(i => Number(i.stock) <= Number(i.puntoReorden));

    return `Eres el asesor estratégico senior de AJ Medical, empresa distribuidora de material quirúrgico (laparoscópico y cirugía abierta) en México. Co-dueños: Jacobo (comercial) y Arturo (prospección). Coordinadora: Yossadara.

META: crecer de ~$1.2M MXN/mes (feb 2026) a $3M-$3.5M MXN/mes en septiembre 2026.

DATOS EN TIEMPO REAL (${new Date().toLocaleDateString("es-MX", { month: "long", year: "numeric" })}):
- Ventas del mes: $${totalVentas.toLocaleString()} MXN (${ventasMes.length} transacciones)
- Compras del mes: $${totalCompras.toLocaleString()} MXN
- Gastos del mes: $${totalGastos.toLocaleString()} MXN
- Utilidad estimada: $${(totalVentas - totalCompras - totalGastos).toLocaleString()} MXN
- Cobros pendientes vencidos: ${cobrosVencidos.length} por $${cobrosVencidos.reduce((a, c) => a + Number(c.monto || 0), 0).toLocaleString()} MXN
- Productos en stock bajo: ${stockBajo.length} (${stockBajo.map(s => s.nombre).join(", ")})
- Clientes activos registrados: ${clientes.filter(c => c.activo).length}
- Total ventas históricas: $${ventas.reduce((a, v) => a + Number(v.total || 0), 0).toLocaleString()} MXN

VENTAS DETALLADAS (últimas 20):
${ventas.slice(-20).map(v => `${v.fecha} | ${v.cliente} | ${v.producto} | ${v.cantidad}u | $${v.total?.toLocaleString()}`).join("\n")}

INVENTARIO COMPLETO:
${inventario.map(i => `${i.nombre} (${i.sku}) | Stock: ${i.stock} | Reorden: ${i.puntoReorden}`).join("\n")}

Responde siempre en español. Sé directo, concreto y basado en datos reales. Cuando detectes patrones, riesgos u oportunidades, señálalos proactivamente. Usa formato claro con secciones cuando el análisis lo requiera.`;
  };

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user", content: input.trim() };
    const newMsgs = [...msgs, userMsg];
    setMsgs(newMsgs); setInput(""); setLoading(true);

    try {
      const apiMsgs = newMsgs.filter(m => m.role !== "assistant" || msgs.indexOf(m) > 0).map(m => ({ role: m.role, content: m.content }));
      // Include all messages except remove initial assistant greeting from API call
      const messagesForAPI = newMsgs.slice(1).map(m => ({ role: m.role, content: m.content }));
      const reply = await askClaude(messagesForAPI, buildContext());
      setMsgs(p => [...p, { role: "assistant", content: reply }]);
    } catch (e) {
      setMsgs(p => [...p, { role: "assistant", content: "Error de conexión. Intenta nuevamente." }]);
    }
    setLoading(false);
  };

  const preguntas = ["¿Cómo van las ventas este mes?", "¿Qué productos debo reordenar?", "Dame reporte semanal", "¿Cuál es mi margen actual?", "¿Hay cobros vencidos?"];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 140px)" }}>
      <div style={{ marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: C.text }}>Asesor Estratégico</h2>
        <div style={{ fontSize: 12, color: C.textDim }}>Claude con acceso total a tus datos</div>
      </div>

      {/* Suggested questions */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
        {preguntas.map(q => (
          <button key={q} onClick={() => setInput(q)} style={{ background: C.accentDim, border: `1px solid ${C.accent}33`, borderRadius: 16, padding: "4px 10px", fontSize: 11, color: C.accent, cursor: "pointer", fontFamily: "inherit" }}>{q}</button>
        ))}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column", gap: 10, paddingBottom: 10 }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{
              maxWidth: "85%", padding: "10px 14px", borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
              background: m.role === "user" ? C.accent : C.card,
              color: m.role === "user" ? "#000" : C.text, fontSize: 13, lineHeight: 1.5,
              border: m.role === "assistant" ? `1px solid ${C.border}` : "none",
              whiteSpace: "pre-wrap",
            }}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "16px 16px 16px 4px", padding: "10px 16px" }}>
              <div style={{ display: "flex", gap: 4 }}>
                {[0, 1, 2].map(i => <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: C.accent, animation: `pulse 1s ${i * .2}s infinite` }} />)}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ display: "flex", gap: 8, paddingTop: 10, borderTop: `1px solid ${C.border}` }}>
        <input
          value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
          placeholder="Pregúntame sobre tus datos..."
          style={{ flex: 1, background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "10px 14px", color: C.text, fontSize: 14, fontFamily: "inherit", outline: "none" }}
        />
        <button onClick={send} disabled={loading} style={{ background: C.accent, border: "none", borderRadius: 12, padding: "10px 14px", cursor: "pointer", color: "#000" }}>
          <Icon name="send" size={16} />
        </button>
      </div>

      <style>{`@keyframes pulse { 0%,100%{opacity:.3;transform:scale(.8)} 50%{opacity:1;transform:scale(1)} }`}</style>
    </div>
  );
}

// ============================================================
// HIGHLIGHTS
// ============================================================
function MiniBar({ label, value, max, color }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
        <span style={{ fontSize: 12, color: C.textMid, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 8 }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color, flexShrink: 0 }}>{fMXN(value)}</span>
      </div>
      <div style={{ height: 5, background: C.bg, borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 3, transition: "width .4s" }} />
      </div>
    </div>
  );
}

function Highlights({ ventas, compras, gastos, clientes, inventario }) {
  const [aiReport, setAiReport] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  // ── Helpers ─────────────────────────────────────────────────
  const mesActual = new Date().toISOString().slice(0, 7);
  const mesAnterior = (() => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().slice(0, 7); })();

  const ventasMes = ventas.filter(v => v.fecha?.startsWith(mesActual));
  const ventasMesAnt = ventas.filter(v => v.fecha?.startsWith(mesAnterior));

  const totalMes = ventasMes.reduce((a, v) => a + Number(v.total || 0), 0);
  const totalMesAnt = ventasMesAnt.reduce((a, v) => a + Number(v.total || 0), 0);
  const comprasMes = compras.filter(c => c.fecha?.startsWith(mesActual)).reduce((a, c) => a + Number(c.total || 0), 0);
  const gastosMes = gastos.filter(g => g.fecha?.startsWith(mesActual)).reduce((a, g) => a + Number(g.monto || 0), 0);
  const utilidadMes = totalMes - comprasMes - gastosMes;
  const margenMes = totalMes > 0 ? (utilidadMes / totalMes) * 100 : 0;

  const diffMes = totalMesAnt > 0 ? ((totalMes - totalMesAnt) / totalMesAnt) * 100 : null;

  // ── Ventas por mes (últimos 6) ────────────────────────────
  const meses6 = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - (5 - i));
    return d.toISOString().slice(0, 7);
  });
  const ventasPorMes = meses6.map(m => ({
    mes: m.slice(5) + "/" + m.slice(2, 4),
    total: ventas.filter(v => v.fecha?.startsWith(m)).reduce((a, v) => a + Number(v.total || 0), 0),
    margen: (() => {
      const vv = ventas.filter(v => v.fecha?.startsWith(m));
      const tv = vv.reduce((a, v) => a + Number(v.total || 0), 0);
      const cc = compras.filter(c => c.fecha?.startsWith(m)).reduce((a, c) => a + Number(c.total || 0), 0);
      const gg = gastos.filter(g => g.fecha?.startsWith(m)).reduce((a, g) => a + Number(g.monto || 0), 0);
      return tv > 0 ? ((tv - cc - gg) / tv) * 100 : 0;
    })(),
  }));
  const maxVenta = Math.max(...ventasPorMes.map(m => m.total), 1);
  const barH = 80;

  // ── Top 10 clientes ──────────────────────────────────────
  const topClientes = Object.entries(
    ventas.reduce((acc, v) => { acc[v.cliente] = (acc[v.cliente] || 0) + Number(v.total || 0); return acc; }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const maxCliente = topClientes[0]?.[1] || 1;

  // ── Top 10 productos ─────────────────────────────────────
  const topProductos = Object.entries(
    ventas.reduce((acc, v) => { acc[v.producto] = (acc[v.producto] || 0) + Number(v.total || 0); return acc; }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const maxProducto = topProductos[0]?.[1] || 1;

  // ── Clientes inactivos ───────────────────────────────────
  const hoy = new Date();
  const inactivos = clientes.filter(c => {
    const ultimaVenta = ventas.filter(v => v.cliente === c.nombre).sort((a, b) => b.fecha?.localeCompare(a.fecha))[0];
    if (!ultimaVenta) return false;
    const dias = Math.floor((hoy - new Date(ultimaVenta.fecha)) / 86400000);
    return dias > 30;
  });

  // ── Semáforo ─────────────────────────────────────────────
  const semaforo = [
    {
      label: "Ventas del mes", value: totalMes >= 1200000 ? "green" : totalMes >= 800000 ? "yellow" : "red",
      desc: fMXN(totalMes), meta: "Meta: $1.2M",
    },
    {
      label: "Margen bruto", value: margenMes >= 40 ? "green" : margenMes >= 25 ? "yellow" : "red",
      desc: `${margenMes.toFixed(1)}%`, meta: "Meta: >40%",
    },
    {
      label: "Stock crítico", value: inventario.filter(i => Number(i.stock) === 0).length === 0 ? "green" : inventario.filter(i => Number(i.stock) === 0).length <= 2 ? "yellow" : "red",
      desc: `${inventario.filter(i => Number(i.stock) === 0).length} sin stock`, meta: "Meta: 0",
    },
    {
      label: "Clientes inactivos", value: inactivos.length === 0 ? "green" : inactivos.length <= 3 ? "yellow" : "red",
      desc: `${inactivos.length} +30 días sin comprar`, meta: "Meta: 0",
    },
    {
      label: "Crecimiento mensual", value: diffMes === null ? "yellow" : diffMes >= 10 ? "green" : diffMes >= 0 ? "yellow" : "red",
      desc: diffMes !== null ? `${diffMes >= 0 ? "+" : ""}${diffMes.toFixed(1)}% vs mes ant.` : "Sin datos previos", meta: "Meta: +10%",
    },
  ];
  const semColors = { green: C.green, yellow: C.yellow, red: C.red };

  // ── IA Recomendaciones ───────────────────────────────────
  const getAIReport = async () => {
    setAiLoading(true);
    try {
      const ctx = `Eres asesor estratégico senior de AJ Medical, distribuidora de material quirúrgico en México. Meta: $3M-$3.5M MXN/mes en sep 2026.

DATOS ACTUALES:
- Ventas mes actual: ${fMXN(totalMes)} | Mes anterior: ${fMXN(totalMesAnt)} | Cambio: ${diffMes !== null ? diffMes.toFixed(1) + "%" : "N/A"}
- Margen bruto mes: ${margenMes.toFixed(1)}%
- Top 3 clientes: ${topClientes.slice(0, 3).map(([n, v]) => `${n} (${fMXN(v)})`).join(", ")}
- Top 3 productos: ${topProductos.slice(0, 3).map(([n, v]) => `${n} (${fMXN(v)})`).join(", ")}
- Clientes inactivos (+30 días): ${inactivos.map(c => c.nombre).join(", ") || "ninguno"}
- Productos sin stock: ${inventario.filter(i => Number(i.stock) === 0).map(i => i.nombre).join(", ") || "ninguno"}
- Semáforo: ${semaforo.map(s => `${s.label}: ${s.value}`).join(" | ")}

Dame exactamente 5 recomendaciones concretas y accionables para esta semana. Cada una debe tener: título corto (máx 6 palabras), acción específica, y por qué importa. Formato: usa "→" para separar título de acción. Sin introducciones, directo al grano.`;

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": import.meta.env.VITE_ANTHROPIC_KEY || "", "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{ role: "user", content: ctx }],
        }),
      });
      const data = await res.json();
      setAiReport(data.content?.find(b => b.type === "text")?.text || "Sin respuesta.");
    } catch { setAiReport("Error al conectar. Intenta nuevamente."); }
    setAiLoading(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: C.text }}>Highlights</h2>
        <div style={{ fontSize: 12, color: C.textDim }}>Análisis histórico del negocio</div>
      </div>

      {/* Semáforo */}
      <Card>
        <div style={{ fontSize: 11, color: C.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>🚦 Salud del negocio</div>
        {semaforo.map(s => (
          <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: semColors[s.value], flexShrink: 0, boxShadow: `0 0 6px ${semColors[s.value]}` }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>{s.label}</div>
              <div style={{ fontSize: 11, color: C.textDim }}>{s.meta}</div>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: semColors[s.value] }}>{s.desc}</span>
          </div>
        ))}
      </Card>

      {/* Comparativo mes */}
      <Card>
        <div style={{ fontSize: 11, color: C.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>📊 Mes actual vs anterior</div>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1, background: C.bg, borderRadius: 8, padding: "10px 12px" }}>
            <div style={{ fontSize: 10, color: C.textDim, marginBottom: 4 }}>MES ACTUAL</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: C.accent }}>{fMXN(totalMes)}</div>
            <div style={{ fontSize: 11, color: C.green }}>Margen: {margenMes.toFixed(1)}%</div>
          </div>
          <div style={{ flex: 1, background: C.bg, borderRadius: 8, padding: "10px 12px" }}>
            <div style={{ fontSize: 10, color: C.textDim, marginBottom: 4 }}>MES ANTERIOR</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: C.textMid }}>{fMXN(totalMesAnt)}</div>
            {diffMes !== null && (
              <div style={{ fontSize: 11, color: diffMes >= 0 ? C.green : C.red, fontWeight: 700 }}>
                {diffMes >= 0 ? "▲" : "▼"} {Math.abs(diffMes).toFixed(1)}%
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Gráfica barras ventas por mes */}
      <Card>
        <div style={{ fontSize: 11, color: C.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>📈 Ventas últimos 6 meses</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: barH + 30 }}>
          {ventasPorMes.map((m, i) => (
            <div key={m.mes} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{ fontSize: 9, color: C.textDim, fontWeight: 600 }}>
                {m.total > 0 ? `$${(m.total / 1000).toFixed(0)}k` : ""}
              </div>
              <div style={{
                width: "100%", borderRadius: "4px 4px 0 0",
                height: m.total > 0 ? Math.max(4, (m.total / maxVenta) * barH) : 3,
                background: i === 5 ? C.accent : C.blue + "88",
                transition: "height .4s",
              }} />
              <div style={{ fontSize: 9, color: i === 5 ? C.accent : C.textDim, fontWeight: i === 5 ? 700 : 400 }}>{m.mes}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Gráfica margen por mes */}
      <Card>
        <div style={{ fontSize: 11, color: C.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>💹 Margen bruto por mes</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 60 }}>
          {ventasPorMes.map((m, i) => (
            <div key={m.mes} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{ fontSize: 9, color: C.textDim }}>{m.margen > 0 ? `${m.margen.toFixed(0)}%` : ""}</div>
              <div style={{
                width: "100%", borderRadius: "4px 4px 0 0",
                height: m.margen > 0 ? Math.max(4, (m.margen / 80) * 50) : 3,
                background: m.margen >= 40 ? C.green : m.margen >= 20 ? C.yellow : C.red,
              }} />
              <div style={{ fontSize: 9, color: C.textDim }}>{m.mes}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Top 10 clientes */}
      {topClientes.length > 0 && (
        <Card>
          <div style={{ fontSize: 11, color: C.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>🏆 Top clientes (histórico)</div>
          {topClientes.map(([nombre, total], i) => (
            <MiniBar key={nombre} label={`${i + 1}. ${nombre}`} value={total} max={maxCliente} color={i === 0 ? C.accent : i < 3 ? C.blue : C.textMid} />
          ))}
        </Card>
      )}

      {/* Top 10 productos */}
      {topProductos.length > 0 && (
        <Card>
          <div style={{ fontSize: 11, color: C.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>💊 Top productos (histórico)</div>
          {topProductos.map(([nombre, total], i) => (
            <MiniBar key={nombre} label={`${i + 1}. ${nombre}`} value={total} max={maxProducto} color={i === 0 ? C.green : i < 3 ? C.accent : C.textMid} />
          ))}
        </Card>
      )}

      {/* Clientes inactivos */}
      {inactivos.length > 0 && (
        <Card style={{ borderColor: C.orange + "55" }}>
          <div style={{ fontSize: 11, color: C.orange, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>⚠️ Clientes sin comprar +30 días</div>
          {inactivos.map(c => {
            const ultima = ventas.filter(v => v.cliente === c.nombre).sort((a, b) => b.fecha?.localeCompare(a.fecha))[0];
            const dias = Math.floor((hoy - new Date(ultima?.fecha)) / 86400000);
            return (
              <div key={c.id} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 13, color: C.text }}>{c.nombre}</span>
                <span style={{ fontSize: 12, color: C.orange, fontWeight: 600 }}>{dias} días</span>
              </div>
            );
          })}
        </Card>
      )}

      {/* Recomendaciones IA */}
      <Card style={{ borderColor: C.accent + "44" }}>
        <div style={{ fontSize: 11, color: C.accent, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>🤖 Recomendaciones IA</div>
        {!aiReport && !aiLoading && (
          <div>
            <div style={{ fontSize: 13, color: C.textDim, marginBottom: 12 }}>Genera recomendaciones personalizadas basadas en tus datos reales de este momento.</div>
            <Btn onClick={getAIReport}><Icon name="trend" size={14} /> Analizar ahora</Btn>
          </div>
        )}
        {aiLoading && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: C.textDim, fontSize: 13 }}>
            <div style={{ display: "flex", gap: 4 }}>
              {[0, 1, 2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: C.accent, animation: `pulse 1s ${i * .2}s infinite` }} />)}
            </div>
            Analizando tus datos...
          </div>
        )}
        {aiReport && (
          <div>
            <div style={{ fontSize: 13, color: C.text, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{aiReport}</div>
            <Btn variant="ghost" small onClick={() => { setAiReport(null); }} style={{ marginTop: 12 }}>↺ Regenerar</Btn>
          </div>
        )}
      </Card>
      <style>{`@keyframes pulse { 0%,100%{opacity:.3;transform:scale(.8)} 50%{opacity:1;transform:scale(1)} }`}</style>
    </div>
  );
}

// ============================================================
// APP
// ============================================================
const TABS = [
  { id: "home", label: "Inicio", icon: "home" },
  { id: "highlights", label: "Highlights", icon: "trend" },
  { id: "ventas", label: "Ventas", icon: "sales" },
  { id: "compras", label: "Compras", icon: "purchase" },
  { id: "gastos", label: "Gastos", icon: "expense" },
  { id: "clientes", label: "Clientes", icon: "clients" },
  { id: "proveedores", label: "Proveedores", icon: "supplier" },
  { id: "inventario", label: "Inventario", icon: "inventory" },
  { id: "cobros", label: "Cobros", icon: "cobros" },
  { id: "chat", label: "Asesor", icon: "chat" },
];

export default function App() {
  const [tab, setTab] = useState("home");
  const [ventas, setVentas] = useState([]);
  const [compras, setCompras] = useState([]);
  const [gastos, setGastos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [inventario, setInventario] = useState([]);
  const [cobros, setCobros] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      loadData(KEYS.ventas), loadData(KEYS.compras), loadData(KEYS.gastos),
      loadData(KEYS.clientes), loadData(KEYS.inventario), loadData(KEYS.cobros),
      loadData(KEYS.proveedores),
    ]).then(([v, c, g, cl, i, co, pr]) => {
      setVentas(v); setCompras(c); setGastos(g); setClientes(cl); setInventario(i); setCobros(co); setProveedores(pr);
      setLoaded(true);
    });
  }, []);

  if (!loaded) return (
    <div style={{ background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: C.accent, fontSize: 14 }}>Cargando AJ Medical...</div>
    </div>
  );

  const activeTab = TABS.find(t => t.id === tab);

  return (
    <div style={{ background: C.bg, minHeight: "100vh", fontFamily: "'DM Sans', system-ui, sans-serif", color: C.text, maxWidth: 520, margin: "0 auto" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ padding: "16px 16px 0", position: "sticky", top: 0, background: C.bg, zIndex: 10, borderBottom: `1px solid ${C.border}`, paddingBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: C.accent, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>AJ Medical</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginTop: 1 }}>{activeTab?.label}</div>
          </div>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: C.accentDim, border: `2px solid ${C.accent}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: C.accent }}>J</div>
        </div>

        {/* Nav */}
        <div style={{ display: "flex", gap: 4, overflowX: "auto", paddingBottom: 2, scrollbarWidth: "none" }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "6px 10px",
              background: tab === t.id ? C.accentDim : "transparent",
              border: tab === t.id ? `1px solid ${C.accent}44` : "1px solid transparent",
              borderRadius: 10, cursor: "pointer", color: tab === t.id ? C.accent : C.textDim,
              minWidth: 52, flexShrink: 0, fontFamily: "inherit", transition: "all .15s",
            }}>
              <Icon name={t.icon} size={16} />
              <span style={{ fontSize: 9, fontWeight: 600, whiteSpace: "nowrap" }}>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: 16, paddingBottom: 32 }}>
        {tab === "home" && <Dashboard ventas={ventas} compras={compras} gastos={gastos} cobros={cobros} inventario={inventario} />}
        {tab === "highlights" && <Highlights ventas={ventas} compras={compras} gastos={gastos} clientes={clientes} inventario={inventario} />}
        {tab === "ventas" && <Ventas data={ventas} setData={setVentas} clientes={clientes} inventario={inventario} setInventario={setInventario} cobros={cobros} setCobros={setCobros} />}
        {tab === "compras" && <Compras data={compras} setData={setCompras} inventario={inventario} setInventario={setInventario} proveedores={proveedores} />}
        {tab === "gastos" && <Gastos data={gastos} setData={setGastos} />}
        {tab === "clientes" && <Clientes data={clientes} setData={setClientes} ventas={ventas} />}
        {tab === "proveedores" && <Proveedores data={proveedores} setData={setProveedores} compras={compras} />}
        {tab === "inventario" && <Inventario data={inventario} setData={setInventario} />}
        {tab === "cobros" && <Cobros data={cobros} setData={setCobros} ventas={ventas} setVentas={setVentas} />}
        {tab === "chat" && <ChatClaude ventas={ventas} compras={compras} gastos={gastos} clientes={clientes} inventario={inventario} cobros={cobros} />}
      </div>
    </div>
  );
}
