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
  cotizaciones: "ajm:cotizaciones",
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
    headers: { "Content-Type": "application/json" },
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
    hospital: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10 M12 7v6 M9 10h6",
    document: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8",
    supplier: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
    settings: "M12 15a3 3 0 100-6 3 3 0 000 6z M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z",
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
// SECURITY — Delete with PIN + Settings
// ============================================================
const DELETE_CODE = "5829";
const SETTINGS_KEY = "ajm:settings";

async function loadSettings() {
  try {
    const r = await window.storage.get(SETTINGS_KEY);
    return r ? JSON.parse(r.value) : { saldoInicial: 0, metaMensual: 3000000 };
  } catch { return { saldoInicial: 0, metaMensual: 3000000 }; }
}
async function saveSettings(s) {
  await window.storage.set(SETTINGS_KEY, JSON.stringify(s));
}

function DeleteConfirm({ item, onConfirm, onCancel }) {
  const [step, setStep] = useState(1);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const handlePin = () => {
    if (pin === DELETE_CODE) onConfirm();
    else { setError("Código incorrecto."); setPin(""); }
  };
  return (
    <div style={{ position:"fixed", inset:0, background:"#000000cc", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
      <div style={{ background:C.surface, borderRadius:16, padding:24, width:"100%", maxWidth:340, border:`1px solid ${C.border}` }}>
        {step === 1 ? (<>
          <div style={{ fontSize:20, textAlign:"center", marginBottom:8 }}>⚠️</div>
          <div style={{ fontSize:15, fontWeight:700, color:C.text, textAlign:"center", marginBottom:8 }}>¿Eliminar este registro?</div>
          <div style={{ fontSize:12, color:C.textDim, textAlign:"center", marginBottom:20 }}>{item && <><strong style={{color:C.text}}>{item}</strong><br/></>}Esta acción no se puede deshacer.</div>
          <div style={{ display:"flex", gap:10 }}>
            <Btn variant="ghost" onClick={onCancel} style={{ flex:1 }}>No, cancelar</Btn>
            <Btn variant="danger" onClick={() => setStep(2)} style={{ flex:1 }}>Sí, eliminar</Btn>
          </div>
        </>) : (<>
          <div style={{ fontSize:15, fontWeight:700, color:C.text, marginBottom:6 }}>🔐 Código de autorización</div>
          <div style={{ fontSize:12, color:C.textDim, marginBottom:16 }}>Ingresa el código de 4 dígitos para confirmar.</div>
          <input type="password" inputMode="numeric" maxLength={4} value={pin} autoFocus
            onChange={e => { setPin(e.target.value); setError(""); }}
            onKeyDown={e => e.key==="Enter" && handlePin()}
            placeholder="• • • •"
            style={{ width:"100%", background:C.bg, border:`2px solid ${error ? C.red : C.border}`, borderRadius:10, padding:"14px", color:C.text, fontSize:24, fontFamily:"inherit", outline:"none", textAlign:"center", letterSpacing:12, marginBottom:8, boxSizing:"border-box" }}
          />
          {error && <div style={{ fontSize:12, color:C.red, marginBottom:10, textAlign:"center" }}>{error}</div>}
          <div style={{ display:"flex", gap:10, marginTop:4 }}>
            <Btn variant="ghost" onClick={onCancel} style={{ flex:1 }}>Cancelar</Btn>
            <Btn variant="danger" onClick={handlePin} style={{ flex:1 }}>Confirmar borrado</Btn>
          </div>
        </>)}
      </div>
    </div>
  );
}

function EditModal({ title, onClose, onSave, children }) {
  return (
    <Modal title={title} onClose={onClose}>
      {children}
      <Btn onClick={onSave} style={{ marginTop:12, width:"100%" }}>Guardar cambios</Btn>
    </Modal>
  );
}

// ============================================================
// DASHBOARD
// ============================================================
function Dashboard({ ventas, compras, gastos, cobros, inventario, settings }) {
  const mesActual = new Date().toISOString().slice(0, 7);
  const ventasMes = ventas.filter(v => v.fecha?.startsWith(mesActual));
  const comprasMes = compras.filter(c => c.fecha?.startsWith(mesActual));
  const gastosMes = gastos.filter(g => g.fecha?.startsWith(mesActual));

  const totalVentas = ventasMes.reduce((a, v) => a + Number(v.total || 0), 0);
  const totalCompras = comprasMes.reduce((a, c) => a + Number(c.total || 0), 0);
  const totalGastos = gastosMes.reduce((a, g) => a + Number(g.monto || 0), 0);
  const utilidad = totalVentas - totalCompras - totalGastos;
  const metaMensual = Number(settings?.metaMensual || 3000000);
  const progMeta = Math.min(100, (totalVentas / metaMensual) * 100);

  // ── Flujo de efectivo HISTÓRICO acumulado ──────────────────
  const ingresosCobradosHist = ventas
    .filter(v => v.pagado === true || v.formaPago === "contado")
    .reduce((a, v) => a + Number(v.total || 0), 0);
  const cobrosRecibidosHist = cobros.filter(c => c.pagado).reduce((a, c) => a + Number(c.monto || 0), 0);
  const totalIngresosHist = ingresosCobradosHist + cobrosRecibidosHist;
  const totalEgresosHist = compras.reduce((a, c) => a + Number(c.total || 0), 0) + gastos.reduce((a, g) => a + Number(g.monto || 0), 0);
  const saldoCajaHist = Number(settings?.saldoInicial || 0) + totalIngresosHist - totalEgresosHist;

  // ── Flujo de efectivo MES ACTUAL ──────────────────
  const ingresosMes = ventasMes.filter(v => v.pagado === true || v.formaPago === "contado").reduce((a, v) => a + Number(v.total || 0), 0)
    + cobros.filter(c => c.pagado && c.fechaPago?.startsWith(mesActual)).reduce((a, c) => a + Number(c.monto || 0), 0);
  const egresosMes = totalCompras + totalGastos;
  const saldoMes = ingresosMes - egresosMes;

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

      {/* ── Caja Mes + Histórico ── */}
      <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
        <Card style={{ flex:1, minWidth:140, background: saldoMes >= 0 ? "#0d2218" : "#2b0d10", border:`1px solid ${saldoMes >= 0 ? C.green+"55" : C.red+"55"}` }}>
          <div style={{ fontSize:10, color:C.textDim, fontWeight:700, textTransform:"uppercase", letterSpacing:1, marginBottom:4 }}>💵 Flujo del mes</div>
          <div style={{ fontSize:26, fontWeight:900, color: saldoMes >= 0 ? C.green : C.red, letterSpacing:-1 }}>{fMXN(saldoMes)}</div>
          <div style={{ fontSize:11, color:C.textDim, marginTop:6 }}>↑ {fMXN(ingresosMes)} · ↓ {fMXN(egresosMes)}</div>
        </Card>
        <Card style={{ flex:1, minWidth:140, background:"#0d1a2b", border:`1px solid ${C.blue}44` }}>
          <div style={{ fontSize:10, color:C.textDim, fontWeight:700, textTransform:"uppercase", letterSpacing:1, marginBottom:4 }}>🏦 Saldo acumulado</div>
          <div style={{ fontSize:26, fontWeight:900, color: saldoCajaHist >= 0 ? C.blue : C.red, letterSpacing:-1 }}>{fMXN(saldoCajaHist)}</div>
          <div style={{ fontSize:11, color:C.textDim, marginTop:6 }}>Histórico total</div>
        </Card>
      </div>

      {/* ── Meta mensual ── */}
      <Card>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
          <div style={{ fontSize:11, color:C.textDim, fontWeight:700, textTransform:"uppercase", letterSpacing:1 }}>🎯 Meta mensual</div>
          <div style={{ fontSize:12, color:C.accent, fontWeight:700 }}>{fMXN(totalVentas)} / {fMXN(metaMensual)}</div>
        </div>
        <div style={{ height:10, background:C.bg, borderRadius:5, overflow:"hidden" }}>
          <div style={{ height:"100%", width:`${progMeta}%`, background: progMeta >= 100 ? C.green : progMeta >= 70 ? C.accent : progMeta >= 40 ? C.yellow : C.red, borderRadius:5, transition:"width .5s" }} />
        </div>
        <div style={{ fontSize:11, color:C.textDim, marginTop:6 }}>{progMeta.toFixed(0)}% alcanzado {progMeta >= 100 ? "✓ META CUMPLIDA 🎉" : ""}</div>
        {porCobrar > 0 && <div style={{ marginTop:8, paddingTop:8, borderTop:`1px solid ${C.border}`, fontSize:12, color:C.yellow }}>📋 Por cobrar: <strong>{fMXN(porCobrar)}</strong></div>}
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

    // ── Actualizar inventario con PEPS y bloqueo de stock negativo ──
    let updatedInv = [...inventario];
    const newAlerts = [];
    const stockBloqueado = [];

    for (const l of validas) {
      const qty = Number(l.cantidad);
      const match = findInvMatch(updatedInv, l.productoFinal);
      if (match >= 0) {
        const stockActual = Number(updatedInv[match].stock);
        // Bloqueo: no permitir vender más de lo disponible
        if (qty > stockActual) {
          stockBloqueado.push(`⛔ ${l.productoFinal}: intentas vender ${qty} pero solo hay ${stockActual} en stock`);
          continue; // No descontar este producto
        }
        const newStock = stockActual - qty;

        // PEPS: descontar de los lotes más antiguos primero
        let restante = qty;
        const lotesActuales = [...(updatedInv[match].lotes || [])];
        const lotesActualizados = lotesActuales.map(lote => {
          if (restante <= 0) return lote;
          const descontar = Math.min(restante, lote.cantidad);
          restante -= descontar;
          return { ...lote, cantidad: lote.cantidad - descontar };
        }).filter(lote => lote.cantidad > 0); // Eliminar lotes agotados

        updatedInv[match] = { ...updatedInv[match], stock: newStock, lotes: lotesActualizados };

        if (updatedInv[match].puntoReorden && newStock <= Number(updatedInv[match].puntoReorden)) {
          newAlerts.push(`⚠️ ${updatedInv[match].nombre}: stock en ${newStock} uds (reorden: ${updatedInv[match].puntoReorden})`);
        }
      }
    }
    setInventario(updatedInv); await saveData(KEYS.inventario, updatedInv);
    if (stockBloqueado.length) { setAlerts(stockBloqueado); return; } // No cerrar modal si hay bloqueos
    if (newAlerts.length) { setAlerts(newAlerts); setTimeout(() => setAlerts([]), 8000); }

    setModal(false); setFecha(today()); setCliente(""); setClienteNuevo(""); setNotas(""); setFormaPago("contado"); setFechaVenceCobro(""); setLineas([newLineVenta()]);
  };

  const [delTarget, setDelTarget] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const confirmDel = async () => { const n = data.filter(x => x.id !== delTarget.id); setData(n); await saveData(KEYS.ventas, n); setDelTarget(null); };

  const saveEdit = async () => {
    if (!editTarget) return;
    const n = data.map(x => x.id === editTarget.id ? { ...editTarget, total: Number(editTarget.cantidad)*Number(editTarget.precioUnitario), utilidad: Number(editTarget.cantidad)*Number(editTarget.precioUnitario) - Number(editTarget.cantidad)*Number(editTarget.costo||0) } : x);
    setData(n); await saveData(KEYS.ventas, n); setEditTarget(null);
  };

  const sorted = [...data].sort((a, b) => b.fecha?.localeCompare(a.fecha));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {delTarget && <DeleteConfirm item={`${delTarget.producto} — ${delTarget.cliente}`} onConfirm={confirmDel} onCancel={() => setDelTarget(null)} />}
      {editTarget && (
        <Modal title="Editar venta" onClose={() => setEditTarget(null)}>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <div style={{ display:"flex", gap:10 }}>
              <Input label="Fecha" type="date" value={editTarget.fecha} onChange={v => setEditTarget(p=>({...p,fecha:v}))} />
              <Input label="Cliente" value={editTarget.cliente} onChange={v => setEditTarget(p=>({...p,cliente:v}))} />
            </div>
            <Input label="Producto" value={editTarget.producto} onChange={v => setEditTarget(p=>({...p,producto:v}))} />
            <div style={{ display:"flex", gap:10 }}>
              <Input label="Cantidad" type="number" value={editTarget.cantidad} onChange={v => setEditTarget(p=>({...p,cantidad:v}))} />
              <Input label="Precio unitario" type="number" value={editTarget.precioUnitario} onChange={v => setEditTarget(p=>({...p,precioUnitario:v}))} />
              <Input label="Costo unit." type="number" value={editTarget.costo} onChange={v => setEditTarget(p=>({...p,costo:v}))} />
            </div>
            <Select label="Forma de pago" value={editTarget.formaPago||"contado"} onChange={v => setEditTarget(p=>({...p,formaPago:v}))} options={[{value:"contado",label:"Contado"},{value:"credito",label:"Crédito"}]} />
            <Input label="Notas" value={editTarget.notas||""} onChange={v => setEditTarget(p=>({...p,notas:v}))} />
            <Btn onClick={saveEdit}>Guardar cambios</Btn>
          </div>
        </Modal>
      )}
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
              <div style={{display:"flex",gap:4}}>
                <button onClick={() => setEditTarget(v)} style={{ background:C.blue+"22", border:`1px solid ${C.blue}44`, borderRadius:6, cursor:"pointer", color:C.blue, padding:"3px 8px", fontSize:11, fontWeight:600 }}>✎ Editar</button>
                <button onClick={() => setDelTarget(v)} style={{ background: "none", border: "none", cursor: "pointer", color: C.textDim, padding: 2 }}><Icon name="trash" size={14} /></button>
              </div>
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

    // ── Actualizar inventario con trazabilidad de lotes (PEPS) ──
    let updatedInv = [...inventario];
    const msgs = [];
    for (const l of validas) {
      const qty = Number(l.cantidad);
      const costoUnitMXN = Number((Number(l.costoUnitarioUSD) * tc).toFixed(0));
      const match = findInvMatch(updatedInv, l.productoFinal);

      // Nuevo lote a agregar al historial PEPS
      const nuevoLote = {
        loteId: uid(),
        lote: l.lote || "",
        caducidad: l.caducidad || "",
        cantidad: qty,
        cantidadOriginal: qty,
        costoUnitario: costoUnitMXN,
        fechaEntrada: fecha,
        proveedor: nombreProv,
      };

      if (match >= 0) {
        const newStock = Number(updatedInv[match].stock) + qty;
        // Agregar lote al array existente (ordenado por caducidad para PEPS)
        const lotesActuales = updatedInv[match].lotes || [];
        const lotesActualizados = [...lotesActuales, nuevoLote]
          .sort((a, b) => {
            if (!a.caducidad && !b.caducidad) return a.fechaEntrada?.localeCompare(b.fechaEntrada || "") || 0;
            if (!a.caducidad) return 1;
            if (!b.caducidad) return -1;
            return a.caducidad.localeCompare(b.caducidad);
          });
        updatedInv[match] = {
          ...updatedInv[match],
          stock: newStock,
          costoUnitario: costoUnitMXN,
          lotes: lotesActualizados,
        };
        msgs.push(`✓ ${updatedInv[match].nombre}: +${qty} uds → stock ${newStock}${l.lote ? ` (Lote: ${l.lote})` : ""}`);
      } else {
        updatedInv.push({
          id: uid(),
          nombre: l.productoFinal,
          sku: "",
          stock: qty,
          puntoReorden: "",
          costoUnitario: costoUnitMXN,
          proveedor: nombreProv,
          lotes: [nuevoLote],
        });
        msgs.push(`✓ Nuevo: "${l.productoFinal}" agregado con ${qty} uds${l.lote ? ` (Lote: ${l.lote})` : ""}`);
      }
    }
    setInventario(updatedInv); await saveData(KEYS.inventario, updatedInv);
    setInvMsg(msgs.join(" · ")); setTimeout(() => setInvMsg(null), 6000);

    setModal(false); setFecha(today()); setProveedor(""); setProveedorNuevo(""); setTipoCambio("17.5"); setNotas(""); setLineas([newLineCompra()]);
  };

  const [delTargetC, setDelTargetC] = useState(null);
  const [editTargetC, setEditTargetC] = useState(null);
  const confirmDelC = async () => { const n = data.filter(x => x.id !== delTargetC.id); setData(n); await saveData(KEYS.compras, n); setDelTargetC(null); };
  const saveEditC = async () => {
    if (!editTargetC) return;
    const tUSD = Number(editTargetC.cantidad)*Number(editTargetC.costoUnitarioUSD);
    const n = data.map(x => x.id === editTargetC.id ? {...editTargetC, totalUSD:tUSD, total:tUSD*Number(editTargetC.tipoCambio||17.5)} : x);
    setData(n); await saveData(KEYS.compras, n); setEditTargetC(null);
  };
  const del = async (id) => { const n = data.filter(x => x.id !== id); setData(n); await saveData(KEYS.compras, n); };
  const sorted = [...data].sort((a, b) => b.fecha?.localeCompare(a.fecha));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {delTargetC && <DeleteConfirm item={`${delTargetC.producto} — ${delTargetC.proveedor}`} onConfirm={confirmDelC} onCancel={() => setDelTargetC(null)} />}
      {editTargetC && (
        <Modal title="Editar compra" onClose={() => setEditTargetC(null)}>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <div style={{ display:"flex", gap:10 }}>
              <Input label="Fecha" type="date" value={editTargetC.fecha} onChange={v => setEditTargetC(p=>({...p,fecha:v}))} />
              <Input label="Proveedor" value={editTargetC.proveedor} onChange={v => setEditTargetC(p=>({...p,proveedor:v}))} />
            </div>
            <Input label="Producto" value={editTargetC.producto} onChange={v => setEditTargetC(p=>({...p,producto:v}))} />
            <div style={{ display:"flex", gap:10 }}>
              <Input label="Cantidad" type="number" value={editTargetC.cantidad} onChange={v => setEditTargetC(p=>({...p,cantidad:v}))} />
              <Input label="Costo USD" type="number" value={editTargetC.costoUnitarioUSD} onChange={v => setEditTargetC(p=>({...p,costoUnitarioUSD:v}))} />
              <Input label="TC" type="number" value={editTargetC.tipoCambio} onChange={v => setEditTargetC(p=>({...p,tipoCambio:v}))} />
            </div>
            <Input label="No. Lote" value={editTargetC.lote||""} onChange={v => setEditTargetC(p=>({...p,lote:v}))} />
            <Input label="Caducidad" type="date" value={editTargetC.caducidad||""} onChange={v => setEditTargetC(p=>({...p,caducidad:v}))} />
            <Input label="Notas" value={editTargetC.notas||""} onChange={v => setEditTargetC(p=>({...p,notas:v}))} />
            <Btn onClick={saveEditC}>Guardar cambios</Btn>
          </div>
        </Modal>
      )}
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
              <div style={{display:"flex",gap:4}}>
                <button onClick={() => setEditTargetC(c)} style={{ background:C.blue+"22", border:`1px solid ${C.blue}44`, borderRadius:6, cursor:"pointer", color:C.blue, padding:"3px 8px", fontSize:11, fontWeight:600 }}>✎</button>
                <button onClick={() => setDelTargetC(c)} style={{ background: "none", border: "none", cursor: "pointer", color: C.textDim, padding: 2 }}><Icon name="trash" size={14} /></button>
              </div>
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
  const [form, setForm] = useState({ fecha: today(), categoria: "Logística/envíos", descripcion: "", monto: "", notas: "", recurrente: false });
  const [delTargetG, setDelTargetG] = useState(null);
  const [editTargetG, setEditTargetG] = useState(null);
  const [recurrentesPendientes, setRecurrentesPendientes] = useState([]);
  const [aplicandoRec, setAplicandoRec] = useState(false);
  const f = (k) => (v) => setForm(p => ({ ...p, [k]: v }));

  // ── Detectar gastos recurrentes no aplicados este mes ──────
  useEffect(() => {
    const mesActual = new Date().toISOString().slice(0, 7);
    const recurrentes = data.filter(g => g.recurrente);
    const pendientes = recurrentes.filter(g => {
      // Ya existe este gasto recurrente en el mes actual?
      return !data.some(x => x.descripcion === g.descripcion && x.fecha?.startsWith(mesActual) && x.id !== g.id);
    });
    // Deduplicar por descripcion
    const vistos = new Set();
    const unicos = pendientes.filter(g => {
      if (vistos.has(g.descripcion)) return false;
      vistos.add(g.descripcion); return true;
    });
    setRecurrentesPendientes(unicos);
  }, [data]);

  const aplicarRecurrentes = async (seleccionados) => {
    setAplicandoRec(true);
    const mesActual = new Date().toISOString().slice(0, 7);
    const nuevos = seleccionados.map(g => ({
      ...g,
      id: uid(),
      fecha: `${mesActual}-01`,
      notas: `Recurrente aplicado automáticamente`,
    }));
    const updated = [...data, ...nuevos];
    setData(updated); await saveData(KEYS.gastos, updated);
    setAplicandoRec(false); setRecurrentesPendientes([]);
  };

  const save = async () => {
    if (!form.descripcion || !form.monto) return;
    const nuevo = [...data, { id: uid(), ...form }];
    setData(nuevo); await saveData(KEYS.gastos, nuevo); setModal(false);
    setForm({ fecha: today(), categoria: "Logística/envíos", descripcion: "", monto: "", notas: "", recurrente: false });
  };

  const confirmDelG = async () => { const n = data.filter(x => x.id !== delTargetG.id); setData(n); await saveData(KEYS.gastos, n); setDelTargetG(null); };
  const saveEditG = async () => {
    if (!editTargetG) return;
    const n = data.map(x => x.id === editTargetG.id ? editTargetG : x);
    setData(n); await saveData(KEYS.gastos, n); setEditTargetG(null);
  };

  const sorted = [...data].sort((a, b) => b.fecha?.localeCompare(a.fecha));
  const porCategoria = CATEGORIAS_GASTO.map(cat => ({
    cat, total: data.filter(g => g.categoria === cat).reduce((a, g) => a + Number(g.monto || 0), 0)
  })).filter(x => x.total > 0).sort((a, b) => b.total - a.total);

  // Estado para seleccionar cuáles recurrentes aplicar
  const [selRec, setSelRec] = useState({});
  useEffect(() => {
    const init = {};
    recurrentesPendientes.forEach(g => { init[g.id] = true; });
    setSelRec(init);
  }, [recurrentesPendientes]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {delTargetG && <DeleteConfirm item={`${delTargetG.descripcion} — ${fMXN(delTargetG.monto)}`} onConfirm={confirmDelG} onCancel={() => setDelTargetG(null)} />}
      {editTargetG && (
        <Modal title="Editar gasto" onClose={() => setEditTargetG(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", gap: 10 }}>
              <Input label="Fecha" type="date" value={editTargetG.fecha} onChange={v => setEditTargetG(p => ({ ...p, fecha: v }))} />
              <Select label="Categoría" value={editTargetG.categoria} onChange={v => setEditTargetG(p => ({ ...p, categoria: v }))} options={CATEGORIAS_GASTO.map(c => ({ value: c, label: c }))} />
            </div>
            <Input label="Descripción" value={editTargetG.descripcion} onChange={v => setEditTargetG(p => ({ ...p, descripcion: v }))} />
            <Input label="Monto MXN" type="number" value={editTargetG.monto} onChange={v => setEditTargetG(p => ({ ...p, monto: v }))} />
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input type="checkbox" checked={!!editTargetG.recurrente} onChange={e => setEditTargetG(p => ({ ...p, recurrente: e.target.checked }))} id="edit-rec" />
              <label htmlFor="edit-rec" style={{ fontSize: 13, color: C.textMid, cursor: "pointer" }}>Gasto recurrente mensual</label>
            </div>
            <Input label="Notas" value={editTargetG.notas || ""} onChange={v => setEditTargetG(p => ({ ...p, notas: v }))} />
            <Btn onClick={saveEditG}>Guardar cambios</Btn>
          </div>
        </Modal>
      )}

      {/* Banner de gastos recurrentes pendientes */}
      {recurrentesPendientes.length > 0 && (
        <Card style={{ background: C.blue + "18", border: `1px solid ${C.blue}44` }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.blue, marginBottom: 10 }}>
            🔄 {recurrentesPendientes.length} gasto(s) recurrente(s) pendientes de aplicar este mes
          </div>
          {recurrentesPendientes.map(g => (
            <div key={g.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 0", borderBottom: `1px solid ${C.border}` }}>
              <input type="checkbox" checked={!!selRec[g.id]} onChange={e => setSelRec(p => ({ ...p, [g.id]: e.target.checked }))} />
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 13, color: C.text }}>{g.descripcion}</span>
                <span style={{ fontSize: 11, color: C.textDim, marginLeft: 8 }}>{g.categoria}</span>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.orange }}>{fMXN(g.monto)}</span>
            </div>
          ))}
          <Btn onClick={() => aplicarRecurrentes(recurrentesPendientes.filter(g => selRec[g.id]))}
            style={{ marginTop: 12, width: "100%" }} variant="ghost">
            {aplicandoRec ? "Aplicando..." : "✓ Aplicar seleccionados a este mes"}
          </Btn>
        </Card>
      )}

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
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{g.descripcion}</div>
                {g.recurrente && <Tag color={C.blue}>🔄 Recurrente</Tag>}
              </div>
              <div style={{ fontSize: 11, color: C.textDim, marginTop: 2 }}>{fDate(g.fecha)} · <Tag color={C.orange}>{g.categoria}</Tag></div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: C.orange }}>{fMXN(g.monto)}</span>
              <div style={{ display: "flex", gap: 4 }}>
                <button onClick={() => setEditTargetG(g)} style={{ background: C.blue + "22", border: `1px solid ${C.blue}44`, borderRadius: 6, cursor: "pointer", color: C.blue, padding: "3px 6px", fontSize: 11 }}>✎</button>
                <button onClick={() => setDelTargetG(g)} style={{ background: "none", border: "none", cursor: "pointer", color: C.textDim, padding: 2 }}><Icon name="trash" size={14} /></button>
              </div>
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
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: C.bg, borderRadius: 8, border: `1px solid ${C.border}` }}>
              <input type="checkbox" checked={form.recurrente} onChange={e => f("recurrente")(e.target.checked)} id="rec-check" />
              <label htmlFor="rec-check" style={{ fontSize: 13, color: C.textMid, cursor: "pointer", flex: 1 }}>
                Gasto recurrente mensual
                <div style={{ fontSize: 11, color: C.textDim }}>Se recordará automáticamente cada mes</div>
              </label>
            </div>
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
  const [form, setForm] = useState({ nombre: "", tipo: "Revendedor", contacto: "", telefono: "", email: "", ciudad: "", condicionesPago: "", precioPreferencial: "", notas: "", activo: true });
  const [delTargetCl, setDelTargetCl] = useState(null);
  const [editTargetCl, setEditTargetCl] = useState(null);
  const [fichaCliente, setFichaCliente] = useState(null);
  const f = (k) => (v) => setForm(p => ({ ...p, [k]: v }));

  const save = async () => {
    if (!form.nombre) return;
    const nuevo = [...data, { id: uid(), ...form, fechaAlta: today() }];
    setData(nuevo); await saveData(KEYS.clientes, nuevo); setModal(false);
    setForm({ nombre: "", tipo: "Revendedor", contacto: "", telefono: "", email: "", ciudad: "", condicionesPago: "", precioPreferencial: "", notas: "", activo: true });
  };

  const confirmDelCl = async () => { const n = data.filter(x => x.id !== delTargetCl.id); setData(n); await saveData(KEYS.clientes, n); setDelTargetCl(null); };
  const saveEditCl = async () => {
    if (!editTargetCl) return;
    const n = data.map(x => x.id === editTargetCl.id ? editTargetCl : x);
    setData(n); await saveData(KEYS.clientes, n); setEditTargetCl(null);
  };
  const del = async (id) => { const n = data.filter(x => x.id !== id); setData(n); await saveData(KEYS.clientes, n); };
  const ventasPorCliente = ventas.reduce((acc, v) => { acc[v.cliente] = (acc[v.cliente] || 0) + Number(v.total || 0); return acc; }, {});

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {delTargetCl && <DeleteConfirm item={delTargetCl.nombre} onConfirm={confirmDelCl} onCancel={() => setDelTargetCl(null)} />}
      {editTargetCl && (
        <Modal title="Editar cliente" onClose={() => setEditTargetCl(null)}>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <div style={{ display:"flex", gap:10 }}>
              <Input label="Nombre" value={editTargetCl.nombre} onChange={v => setEditTargetCl(p=>({...p,nombre:v}))} />
              <Select label="Tipo" value={editTargetCl.tipo} onChange={v => setEditTargetCl(p=>({...p,tipo:v}))} options={["Revendedor","Clínica","Hospital","Distribuidor"].map(t=>({value:t,label:t}))} />
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <Input label="Teléfono/WhatsApp" value={editTargetCl.telefono||""} onChange={v => setEditTargetCl(p=>({...p,telefono:v}))} />
              <Input label="Email" value={editTargetCl.email||""} onChange={v => setEditTargetCl(p=>({...p,email:v}))} />
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <Input label="Ciudad" value={editTargetCl.ciudad||""} onChange={v => setEditTargetCl(p=>({...p,ciudad:v}))} />
              <Input label="Condiciones de pago" value={editTargetCl.condicionesPago||""} onChange={v => setEditTargetCl(p=>({...p,condicionesPago:v}))} />
            </div>
            <Input label="Precio preferencial (MXN)" type="number" value={editTargetCl.precioPreferencial||""} onChange={v => setEditTargetCl(p=>({...p,precioPreferencial:v}))} placeholder="Precio especial de este cliente" />
            <Input label="Notas" value={editTargetCl.notas||""} onChange={v => setEditTargetCl(p=>({...p,notas:v}))} />
            <Btn onClick={saveEditCl}>Guardar cambios</Btn>
          </div>
        </Modal>
      )}
      {fichaCliente && (
        <Modal title={`Ficha — ${fichaCliente.nombre}`} onClose={() => setFichaCliente(null)}>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              <Tag color={fichaCliente.tipo==="Hospital"?C.blue:C.accent}>{fichaCliente.tipo}</Tag>
              {!fichaCliente.activo && <Tag color={C.red}>Inactivo</Tag>}
            </div>
            {fichaCliente.ciudad && <div style={{ fontSize:13, color:C.textMid }}>📍 {fichaCliente.ciudad}</div>}
            {fichaCliente.telefono && <div style={{ fontSize:13, color:C.textMid }}>📱 {fichaCliente.telefono}</div>}
            {fichaCliente.email && <div style={{ fontSize:13, color:C.textMid }}>✉️ {fichaCliente.email}</div>}
            {fichaCliente.condicionesPago && <div style={{ fontSize:13, color:C.textMid }}>💳 {fichaCliente.condicionesPago}</div>}
            {fichaCliente.precioPreferencial && <div style={{ fontSize:13, color:C.accent }}>💲 Precio preferencial: {fMXN(fichaCliente.precioPreferencial)}</div>}
            {fichaCliente.notas && <div style={{ fontSize:13, color:C.textDim, fontStyle:"italic" }}>{fichaCliente.notas}</div>}
            <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:10, marginTop:4 }}>
              <div style={{ fontSize:11, color:C.textDim, fontWeight:700, textTransform:"uppercase", letterSpacing:1, marginBottom:8 }}>Historial de ventas</div>
              {ventas.filter(v=>v.cliente===fichaCliente.nombre).sort((a,b)=>b.fecha?.localeCompare(a.fecha)).slice(0,10).map(v=>(
                <div key={v.id} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", borderBottom:`1px solid ${C.border}`, fontSize:12 }}>
                  <span style={{color:C.textMid}}>{fDate(v.fecha)} · {v.producto}</span>
                  <span style={{color:C.accent, fontWeight:700}}>{fMXN(v.total)}</span>
                </div>
              ))}
              <div style={{ fontSize:13, fontWeight:800, color:C.accent, marginTop:10 }}>Total histórico: {fMXN(ventasPorCliente[fichaCliente.nombre]||0)}</div>
            </div>
          </div>
        </Modal>
      )}
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
            <div style={{ flex: 1, cursor:"pointer" }} onClick={() => setFichaCliente(c)}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{c.nombre}</span>
                <Tag color={c.tipo === "Hospital" ? C.blue : C.accent}>{c.tipo}</Tag>
                {!c.activo && <Tag color={C.red}>Inactivo</Tag>}
              </div>
              {c.ciudad && <div style={{ fontSize: 12, color: C.textDim }}>{c.ciudad}</div>}
              {c.telefono && <div style={{ fontSize: 11, color: C.textDim }}>📱 {c.telefono}</div>}
              {c.condicionesPago && <div style={{ fontSize: 11, color: C.textDim }}>💳 {c.condicionesPago}</div>}
              {ventasPorCliente[c.nombre] > 0 && <div style={{ fontSize: 11, color: C.accent, marginTop: 2 }}>Ventas totales: {fMXN(ventasPorCliente[c.nombre])}</div>}
            </div>
            <div style={{display:"flex",gap:4}}>
              <button onClick={() => setEditTargetCl(c)} style={{ background:C.blue+"22", border:`1px solid ${C.blue}44`, borderRadius:6, cursor:"pointer", color:C.blue, padding:"3px 6px", fontSize:11 }}>✎</button>
              <button onClick={() => setDelTargetCl(c)} style={{ background: "none", border: "none", cursor: "pointer", color: C.textDim, padding: 2 }}><Icon name="trash" size={14} /></button>
            </div>
          </div>
        </Card>
      ))}

      {modal && (
        <Modal title="Agregar cliente" onClose={() => setModal(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display:"flex", gap:10 }}>
              <Input label="Nombre *" value={form.nombre} onChange={f("nombre")} placeholder="Nombre del cliente" required />
              <Select label="Tipo" value={form.tipo} onChange={f("tipo")} options={["Revendedor", "Clínica", "Hospital", "Distribuidor"].map(t => ({ value: t, label: t }))} />
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <Input label="Teléfono/WhatsApp" value={form.telefono} onChange={f("telefono")} placeholder="+52 55 0000 0000" />
              <Input label="Email" value={form.email} onChange={f("email")} placeholder="email@empresa.com" />
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <Input label="Ciudad" value={form.ciudad} onChange={f("ciudad")} placeholder="Ciudad" />
              <Input label="Condiciones de pago" value={form.condicionesPago} onChange={f("condicionesPago")} placeholder="Ej: 30 días" />
            </div>
            <Input label="Precio preferencial (MXN)" type="number" value={form.precioPreferencial} onChange={f("precioPreferencial")} placeholder="Precio especial para este cliente" />
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
function Inventario({ data, setData, ventas }) {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ sku: "", nombre: "", stock: "", puntoReorden: "", costoUnitario: "", proveedor: "", notas: "" });
  const [delTargetI, setDelTargetI] = useState(null);
  const [editTargetI, setEditTargetI] = useState(null);
  const [expandedLotes, setExpandedLotes] = useState({});
  const f = (k) => (v) => setForm(p => ({ ...p, [k]: v }));

  // Valor total del inventario
  const valorTotal = data.reduce((a, i) => a + Number(i.stock || 0) * Number(i.costoUnitario || 0), 0);

  // Alertas de caducidad próxima (30 días)
  const hoy = new Date();
  const en30 = new Date(); en30.setDate(en30.getDate() + 30);
  const lotesPorCaducar = [];
  const lotesVencidos = [];
  data.forEach(item => {
    (item.lotes || []).forEach(lote => {
      if (!lote.caducidad || lote.cantidad <= 0) return;
      const cad = new Date(lote.caducidad + "T12:00:00");
      if (cad < hoy) lotesVencidos.push({ ...lote, producto: item.nombre });
      else if (cad <= en30) lotesPorCaducar.push({ ...lote, producto: item.nombre });
    });
  });

  // Calcular punto de reorden sugerido basado en velocidad de ventas
  const calcReorden = (nombre) => {
    const hace90 = new Date(); hace90.setDate(hace90.getDate() - 90);
    const vendido = (ventas || []).filter(v => v.producto === nombre && v.fecha >= hace90.toISOString().slice(0, 10)).reduce((a, v) => a + Number(v.cantidad || 0), 0);
    return Math.ceil(vendido / 3);
  };

  const save = async () => {
    if (!form.nombre || !form.stock) return;
    const existing = data.findIndex(x => x.sku === form.sku && form.sku);
    let nuevo;
    if (existing >= 0) { nuevo = [...data]; nuevo[existing] = { ...nuevo[existing], ...form }; }
    else { nuevo = [...data, { id: uid(), ...form, lotes: [] }]; }
    setData(nuevo); await saveData(KEYS.inventario, nuevo); setModal(false);
    setForm({ sku: "", nombre: "", stock: "", puntoReorden: "", costoUnitario: "", proveedor: "", notas: "" });
  };

  const confirmDelI = async () => { const n = data.filter(x => x.id !== delTargetI.id); setData(n); await saveData(KEYS.inventario, n); setDelTargetI(null); };
  const saveEditI = async () => {
    if (!editTargetI) return;
    const n = data.map(x => x.id === editTargetI.id ? editTargetI : x);
    setData(n); await saveData(KEYS.inventario, n); setEditTargetI(null);
  };

  const sorted = [...data].sort((a, b) => {
    const aLow = Number(a.stock) <= Number(a.puntoReorden) && a.puntoReorden;
    const bLow = Number(b.stock) <= Number(b.puntoReorden) && b.puntoReorden;
    return bLow - aLow;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {delTargetI && <DeleteConfirm item={delTargetI.nombre} onConfirm={confirmDelI} onCancel={() => setDelTargetI(null)} />}
      {editTargetI && (
        <Modal title="Editar producto" onClose={() => setEditTargetI(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", gap: 10 }}>
              <Input label="SKU" value={editTargetI.sku || ""} onChange={v => setEditTargetI(p => ({ ...p, sku: v }))} />
              <Input label="Nombre *" value={editTargetI.nombre} onChange={v => setEditTargetI(p => ({ ...p, nombre: v }))} />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <Input label="Stock actual" type="number" value={editTargetI.stock} onChange={v => setEditTargetI(p => ({ ...p, stock: v }))} />
              <Input label="Punto de reorden" type="number" value={editTargetI.puntoReorden || ""} onChange={v => setEditTargetI(p => ({ ...p, puntoReorden: v }))} />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <Input label="Costo unitario MXN" type="number" value={editTargetI.costoUnitario || ""} onChange={v => setEditTargetI(p => ({ ...p, costoUnitario: v }))} />
              <Input label="Proveedor" value={editTargetI.proveedor || ""} onChange={v => setEditTargetI(p => ({ ...p, proveedor: v }))} />
            </div>
            <div style={{ fontSize: 12, color: C.accent }}>
              Velocidad sugerida de reorden: {calcReorden(editTargetI.nombre)} uds/mes
            </div>
            <Btn onClick={saveEditI}>Guardar cambios</Btn>
          </div>
        </Modal>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: C.text }}>Inventario</h2>
          <div style={{ fontSize: 12, color: C.textDim }}>{data.length} productos</div>
        </div>
        <Btn onClick={() => setModal(true)}><Icon name="plus" size={14} /> Agregar</Btn>
      </div>

      {/* Valor total */}
      <Card style={{ background: "#0d1a2b", border: `1px solid ${C.blue}44` }}>
        <div style={{ fontSize: 11, color: C.textDim, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>💰 Valor total del inventario</div>
        <div style={{ fontSize: 24, fontWeight: 900, color: C.blue }}>{fMXN(valorTotal)}</div>
        <div style={{ fontSize: 11, color: C.textDim, marginTop: 4 }}>
          {data.filter(i => Number(i.stock) > 0).length} productos con stock · {data.filter(i => Number(i.stock) === 0).length} sin stock
        </div>
      </Card>

      {/* Alertas de caducidad */}
      {lotesVencidos.length > 0 && (
        <div style={{ background: C.red + "18", border: `1px solid ${C.red}44`, borderRadius: 10, padding: "10px 14px" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.red, marginBottom: 6 }}>🚨 Lotes VENCIDOS ({lotesVencidos.length})</div>
          {lotesVencidos.map((l, i) => (
            <div key={i} style={{ fontSize: 12, color: C.textMid, marginBottom: 2 }}>
              {l.producto} · Lote {l.lote || "s/n"} · {l.cantidad} uds · Venció: {fDate(l.caducidad)}
            </div>
          ))}
        </div>
      )}
      {lotesPorCaducar.length > 0 && (
        <div style={{ background: C.orange + "18", border: `1px solid ${C.orange}44`, borderRadius: 10, padding: "10px 14px" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.orange, marginBottom: 6 }}>⚠️ Lotes próximos a vencer — 30 días ({lotesPorCaducar.length})</div>
          {lotesPorCaducar.map((l, i) => (
            <div key={i} style={{ fontSize: 12, color: C.textMid, marginBottom: 2 }}>
              {l.producto} · Lote {l.lote || "s/n"} · {l.cantidad} uds · Cad: {fDate(l.caducidad)}
            </div>
          ))}
        </div>
      )}

      {sorted.map(item => {
        const bajo = item.puntoReorden && Number(item.stock) <= Number(item.puntoReorden);
        const critico = Number(item.stock) === 0;
        const lotesActivos = (item.lotes || []).filter(l => l.cantidad > 0);
        const expanded = expandedLotes[item.id];

        return (
          <Card key={item.id} style={{ padding: "12px 14px", borderColor: critico ? C.red + "66" : bajo ? C.orange + "66" : C.border }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{item.nombre}</span>
                  {item.sku && <span style={{ fontSize: 11, color: C.textDim, fontFamily: "monospace" }}>{item.sku}</span>}
                  {critico && <Tag color={C.red}>SIN STOCK</Tag>}
                  {!critico && bajo && <Tag color={C.orange}>REORDENAR</Tag>}
                </div>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                  <div style={{ fontSize: 12, color: C.textDim }}>Stock: <strong style={{ color: critico ? C.red : bajo ? C.orange : C.text }}>{item.stock}</strong></div>
                  {item.puntoReorden && <div style={{ fontSize: 12, color: C.textDim }}>Reorden: {item.puntoReorden}</div>}
                  {item.costoUnitario && <div style={{ fontSize: 12, color: C.textDim }}>Costo: {fMXN(item.costoUnitario)}</div>}
                  {item.costoUnitario && <div style={{ fontSize: 12, color: C.textDim }}>Valor: {fMXN(Number(item.stock) * Number(item.costoUnitario))}</div>}
                </div>

                {/* Lotes PEPS */}
                {lotesActivos.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <button onClick={() => setExpandedLotes(p => ({ ...p, [item.id]: !p[item.id] }))}
                      style={{ background: "none", border: "none", cursor: "pointer", color: C.accent, fontSize: 11, fontWeight: 600, padding: 0, fontFamily: "inherit" }}>
                      {expanded ? "▲" : "▼"} {lotesActivos.length} lote(s) en PEPS
                    </button>
                    {expanded && (
                      <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 4 }}>
                        {lotesActivos.map((lote, idx) => {
                          const cadDate = lote.caducidad ? new Date(lote.caducidad + "T12:00:00") : null;
                          const vencido = cadDate && cadDate < hoy;
                          const proxCad = cadDate && cadDate <= en30 && !vencido;
                          return (
                            <div key={lote.loteId} style={{
                              background: C.bg, borderRadius: 6, padding: "6px 10px",
                              border: `1px solid ${vencido ? C.red + "55" : proxCad ? C.orange + "55" : C.border}`,
                              fontSize: 11,
                            }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div>
                                  <span style={{ color: C.accent, fontWeight: 700 }}>#{idx + 1} PEPS</span>
                                  {lote.lote && <span style={{ color: C.textMid, marginLeft: 6, fontFamily: "monospace" }}>Lote: {lote.lote}</span>}
                                  <span style={{ color: C.textDim, marginLeft: 8 }}>{lote.cantidad} uds disponibles</span>
                                </div>
                                {lote.caducidad && (
                                  <span style={{ color: vencido ? C.red : proxCad ? C.orange : C.textDim, fontWeight: vencido || proxCad ? 700 : 400 }}>
                                    {vencido ? "⛔ VENCIDO" : proxCad ? "⚠️" : ""} Cad: {fDate(lote.caducidad)}
                                  </span>
                                )}
                              </div>
                              <div style={{ color: C.textDim, marginTop: 2 }}>
                                Entrada: {fDate(lote.fechaEntrada)} · Costo: {fMXN(lote.costoUnitario)}/ud
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 4, marginLeft: 8 }}>
                <button onClick={() => setEditTargetI(item)} style={{ background: C.blue + "22", border: `1px solid ${C.blue}44`, borderRadius: 6, cursor: "pointer", color: C.blue, padding: "3px 6px", fontSize: 11 }}>✎</button>
                <button onClick={() => setDelTargetI(item)} style={{ background: "none", border: "none", cursor: "pointer", color: C.textDim, padding: 2 }}><Icon name="trash" size={14} /></button>
              </div>
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

  const [delTargetCo, setDelTargetCo] = useState(null);
  const [abonoTarget, setAbonoTarget] = useState(null);
  const [abonoMonto, setAbonoMonto] = useState("");

  const togglePagado = async (id) => {
    const cobro = data.find(c => c.id === id);
    const nowPagado = !cobro?.pagado;
    const n = data.map(c => c.id === id ? { ...c, pagado: nowPagado, fechaPago: nowPagado ? today() : null, montoPagado: nowPagado ? cobro.monto : 0 } : c);
    setData(n); await saveData(KEYS.cobros, n);
    if (nowPagado && ventas && setVentas && cobro.ventaId) {
      const updated = ventas.map(v => v.id === cobro.ventaId ? { ...v, cobrado: true } : v);
      setVentas(updated); await saveData(KEYS.ventas, updated);
    }
  };

  const registrarAbono = async () => {
    if (!abonoTarget || !abonoMonto) return;
    const montoPagadoAntes = Number(abonoTarget.montoPagado || 0);
    const nuevoAbono = Number(abonoMonto);
    const totalPagado = montoPagadoAntes + nuevoAbono;
    const pagadoCompleto = totalPagado >= Number(abonoTarget.monto);
    const n = data.map(c => c.id === abonoTarget.id ? {
      ...c, montoPagado: totalPagado, pagado: pagadoCompleto,
      fechaPago: pagadoCompleto ? today() : c.fechaPago,
      abonos: [...(c.abonos||[]), { monto: nuevoAbono, fecha: today() }]
    } : c);
    setData(n); await saveData(KEYS.cobros, n); setAbonoTarget(null); setAbonoMonto("");
  };

  const confirmDelCo = async () => { const n = data.filter(x => x.id !== delTargetCo.id); setData(n); await saveData(KEYS.cobros, n); setDelTargetCo(null); };
  const del = async (id) => { const n = data.filter(x => x.id !== id); setData(n); await saveData(KEYS.cobros, n); };

  const pendientes = data.filter(c => !c.pagado).sort((a, b) => a.fechaVence?.localeCompare(b.fechaVence));
  const pagados = data.filter(c => c.pagado);
  const totalPendiente = pendientes.reduce((a, c) => a + Number(c.monto || 0) - Number(c.montoPagado||0), 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {delTargetCo && <DeleteConfirm item={`${delTargetCo.cliente} — ${fMXN(delTargetCo.monto)}`} onConfirm={confirmDelCo} onCancel={() => setDelTargetCo(null)} />}
      {abonoTarget && (
        <Modal title="Registrar abono" onClose={() => { setAbonoTarget(null); setAbonoMonto(""); }}>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <div style={{ fontSize:13, color:C.textMid }}>Cliente: <strong style={{color:C.text}}>{abonoTarget.cliente}</strong></div>
            <div style={{ fontSize:13, color:C.textMid }}>Total: {fMXN(abonoTarget.monto)} · Ya pagado: {fMXN(abonoTarget.montoPagado||0)} · Pendiente: {fMXN(Number(abonoTarget.monto)-(abonoTarget.montoPagado||0))}</div>
            {(abonoTarget.abonos||[]).length > 0 && (
              <div style={{ background:C.bg, borderRadius:8, padding:10 }}>
                <div style={{ fontSize:11, color:C.textDim, marginBottom:6 }}>ABONOS ANTERIORES</div>
                {abonoTarget.abonos.map((a,i) => <div key={i} style={{ fontSize:12, color:C.textMid }}>{fDate(a.fecha)}: {fMXN(a.monto)}</div>)}
              </div>
            )}
            <Input label="Monto del abono MXN" type="number" value={abonoMonto} onChange={setAbonoMonto} placeholder="0" />
            <Btn onClick={registrarAbono}>Registrar abono</Btn>
          </div>
        </Modal>
      )}
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
                    <div style={{ display: "flex", gap: 4, flexWrap:"wrap" }}>
                      <button onClick={() => togglePagado(c.id)} style={{ background: C.green + "22", border: `1px solid ${C.green}44`, borderRadius: 6, cursor: "pointer", color: C.green, padding: "3px 8px", fontSize: 11, fontWeight: 600 }}>✓ Cobrado</button>
                      <button onClick={() => setAbonoTarget(c)} style={{ background: C.yellow + "22", border: `1px solid ${C.yellow}44`, borderRadius: 6, cursor: "pointer", color: C.yellow, padding: "3px 8px", fontSize: 11, fontWeight: 600 }}>+ Abono</button>
                      <button onClick={() => setDelTargetCo(c)} style={{ background: "none", border: "none", cursor: "pointer", color: C.textDim, padding: 2 }}><Icon name="trash" size={13} /></button>
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
function Proveedores({ data, setData, compras, inventario }) {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ nombre: "", contacto: "", pais: "USA", email: "", whatsapp: "", condicionesPago: "", notas: "" });
  const [delTargetP, setDelTargetP] = useState(null);
  const [editTargetP, setEditTargetP] = useState(null);
  const [fichaProveedor, setFichaProveedor] = useState(null);
  const f = (k) => (v) => setForm(p => ({ ...p, [k]: v }));

  const save = async () => {
    if (!form.nombre) return;
    const nuevo = [...data, { id: uid(), ...form, fechaAlta: today() }];
    setData(nuevo); await saveData(KEYS.proveedores, nuevo); setModal(false);
    setForm({ nombre: "", contacto: "", pais: "USA", email: "", whatsapp: "", condicionesPago: "", notas: "" });
  };

  const confirmDelP = async () => { const n = data.filter(x => x.id !== delTargetP.id); setData(n); await saveData(KEYS.proveedores, n); setDelTargetP(null); };
  const saveEditP = async () => {
    if (!editTargetP) return;
    const n = data.map(x => x.id === editTargetP.id ? editTargetP : x);
    setData(n); await saveData(KEYS.proveedores, n); setEditTargetP(null);
  };
  const del = async (id) => { const n = data.filter(x => x.id !== id); setData(n); await saveData(KEYS.proveedores, n); };

  const comprasPorProveedor = compras.reduce((acc, c) => {
    acc[c.proveedor] = (acc[c.proveedor] || 0) + Number(c.total || 0);
    return acc;
  }, {});
  const productosPorProveedor = (inv, nombre) => (inv||[]).filter(i => i.proveedor === nombre);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {delTargetP && <DeleteConfirm item={delTargetP.nombre} onConfirm={confirmDelP} onCancel={() => setDelTargetP(null)} />}
      {editTargetP && (
        <Modal title="Editar proveedor" onClose={() => setEditTargetP(null)}>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <div style={{ display:"flex", gap:10 }}>
              <Input label="Nombre *" value={editTargetP.nombre} onChange={v => setEditTargetP(p=>({...p,nombre:v}))} />
              <Select label="País" value={editTargetP.pais||"USA"} onChange={v => setEditTargetP(p=>({...p,pais:v}))} options={["USA","México","Alemania","China","Otro"].map(v=>({value:v,label:v}))} />
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <Input label="Contacto" value={editTargetP.contacto||""} onChange={v => setEditTargetP(p=>({...p,contacto:v}))} />
              <Input label="WhatsApp" value={editTargetP.whatsapp||""} onChange={v => setEditTargetP(p=>({...p,whatsapp:v}))} />
            </div>
            <Input label="Email" value={editTargetP.email||""} onChange={v => setEditTargetP(p=>({...p,email:v}))} />
            <Input label="Condiciones de pago" value={editTargetP.condicionesPago||""} onChange={v => setEditTargetP(p=>({...p,condicionesPago:v}))} />
            <Input label="Notas" value={editTargetP.notas||""} onChange={v => setEditTargetP(p=>({...p,notas:v}))} />
            <Btn onClick={saveEditP}>Guardar cambios</Btn>
          </div>
        </Modal>
      )}
      {fichaProveedor && (
        <Modal title={`Ficha — ${fichaProveedor.nombre}`} onClose={() => setFichaProveedor(null)}>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {fichaProveedor.pais && <div style={{ fontSize:13, color:C.textMid }}>🌍 {fichaProveedor.pais}</div>}
            {fichaProveedor.contacto && <div style={{ fontSize:13, color:C.textMid }}>👤 {fichaProveedor.contacto}</div>}
            {fichaProveedor.whatsapp && <div style={{ fontSize:13, color:C.textMid }}>📱 {fichaProveedor.whatsapp}</div>}
            {fichaProveedor.email && <div style={{ fontSize:13, color:C.textMid }}>✉️ {fichaProveedor.email}</div>}
            {fichaProveedor.condicionesPago && <div style={{ fontSize:13, color:C.textMid }}>💳 {fichaProveedor.condicionesPago}</div>}
            <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:10 }}>
              <div style={{ fontSize:11, color:C.textDim, fontWeight:700, textTransform:"uppercase", marginBottom:8 }}>Productos que maneja</div>
              {productosPorProveedor(inventario, fichaProveedor.nombre).length === 0
                ? <div style={{ fontSize:12, color:C.textDim }}>Sin productos registrados</div>
                : productosPorProveedor(inventario, fichaProveedor.nombre).map(i => (
                  <div key={i.id} style={{ fontSize:12, color:C.textMid, padding:"4px 0", borderBottom:`1px solid ${C.border}` }}>
                    {i.nombre} {i.sku ? `(${i.sku})` : ""} — Stock: {i.stock}
                  </div>
                ))
              }
            </div>
            <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:10 }}>
              <div style={{ fontSize:11, color:C.textDim, fontWeight:700, textTransform:"uppercase", marginBottom:8 }}>Historial de compras</div>
              {compras.filter(c => c.proveedor === fichaProveedor.nombre).sort((a,b) => b.fecha?.localeCompare(a.fecha)).slice(0,8).map(c => (
                <div key={c.id} style={{ display:"flex", justifyContent:"space-between", fontSize:12, padding:"4px 0", borderBottom:`1px solid ${C.border}` }}>
                  <span style={{color:C.textMid}}>{fDate(c.fecha)} · {c.producto} ({c.cantidad} uds)</span>
                  <span style={{color:C.blue, fontWeight:700}}>{fMXN(c.total)}</span>
                </div>
              ))}
              <div style={{ fontSize:13, fontWeight:800, color:C.blue, marginTop:10 }}>
                Total comprado: {fMXN(comprasPorProveedor[fichaProveedor.nombre]||0)}
              </div>
            </div>
          </div>
        </Modal>
      )}
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
            <div style={{display:"flex",gap:4}}>
              <button onClick={() => setEditTargetP(p)} style={{ background:C.blue+"22", border:`1px solid ${C.blue}44`, borderRadius:6, cursor:"pointer", color:C.blue, padding:"3px 6px", fontSize:11 }}>✎</button>
              <button onClick={() => setDelTargetP(p)} style={{ background: "none", border: "none", cursor: "pointer", color: C.textDim, padding: 2 }}><Icon name="trash" size={14} /></button>
            </div>
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

function Highlights({ ventas, compras, gastos, clientes, inventario, settings }) {
  const [aiReport, setAiReport] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [editMetas, setEditMetas] = useState(false);
  const [metaVentas, setMetaVentas] = useState("");
  const [metaMargen, setMetaMargen] = useState("");

  // Metas desde settings (configurables), con fallback
  const META_VENTAS = Number(settings?.metaMensual || 3000000);
  const META_MARGEN = Number(settings?.metaMargen || 40);

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
      label: "Ventas del mes",
      value: totalMes >= META_VENTAS ? "green" : totalMes >= META_VENTAS * 0.6 ? "yellow" : "red",
      desc: fMXN(totalMes), meta: `Meta: ${fMXN(META_VENTAS)}`,
    },
    {
      label: "Margen bruto",
      value: margenMes >= META_MARGEN ? "green" : margenMes >= META_MARGEN * 0.6 ? "yellow" : "red",
      desc: `${margenMes.toFixed(1)}%`, meta: `Meta: >${META_MARGEN}%`,
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
        headers: { "Content-Type": "application/json" },
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: C.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>🚦 Salud del negocio</div>
          <button onClick={() => { setMetaVentas(String(META_VENTAS)); setMetaMargen(String(META_MARGEN)); setEditMetas(true); }}
            style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 6, padding: "3px 8px", fontSize: 11, color: C.textDim, cursor: "pointer", fontFamily: "inherit" }}>
            ✎ Metas
          </button>
        </div>
        {editMetas && (
          <div style={{ background: C.bg, borderRadius: 10, padding: 12, marginBottom: 12, border: `1px solid ${C.accent}44` }}>
            <div style={{ fontSize: 12, color: C.accent, fontWeight: 700, marginBottom: 10 }}>Configurar metas del semáforo</div>
            <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
              <Input label="Meta ventas mes (MXN)" type="number" value={metaVentas} onChange={setMetaVentas} placeholder="3000000" />
              <Input label="Meta margen bruto (%)" type="number" value={metaMargen} onChange={setMetaMargen} placeholder="40" />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn onClick={async () => {
                const newSettings = { ...(settings || {}), metaMensual: Number(metaVentas), metaMargen: Number(metaMargen) };
                await saveSettings(newSettings); setEditMetas(false);
                window.location.reload(); // Reload to apply new settings
              }} small>Guardar metas</Btn>
              <Btn variant="ghost" onClick={() => setEditMetas(false)} small>Cancelar</Btn>
            </div>
          </div>
        )}
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
// CONFIGURACION
// ============================================================
function Configuracion({ settings, setSettings }) {
  const [form, setForm] = useState({ ...settings });
  const [saved, setSaved] = useState(false);
  const f = k => v => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    setSettings(form);
    await saveSettings(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <div>
        <h2 style={{ margin:0, fontSize:18, fontWeight:800, color:C.text }}>Configuración</h2>
        <div style={{ fontSize:12, color:C.textDim }}>Ajusta los parámetros del sistema</div>
      </div>

      <Card>
        <div style={{ fontSize:11, color:C.textDim, fontWeight:700, textTransform:"uppercase", letterSpacing:1, marginBottom:16 }}>Flujo de Caja</div>
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <Input label="Saldo inicial en caja (MXN)" type="number" value={String(form.saldoInicial||0)} onChange={f("saldoInicial")}
            placeholder="¿Cuánto tenías cuando arrancaste el sistema?" />
          <div style={{ fontSize:11, color:C.textDim }}>Este es el punto de partida para calcular tu saldo acumulado. Ponlo en cero si no sabes o si empiezas desde hoy.</div>
        </div>
      </Card>

      <Card>
        <div style={{ fontSize:11, color:C.textDim, fontWeight:700, textTransform:"uppercase", letterSpacing:1, marginBottom:16 }}>Metas</div>
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <Input label="Meta de ventas mensual (MXN)" type="number" value={String(form.metaMensual||3000000)} onChange={f("metaMensual")}
            placeholder="3000000" />
          <div style={{ fontSize:11, color:C.textDim }}>Esta meta aparece en el Dashboard y en el semáforo de Highlights. Actualízala conforme crezca tu negocio.</div>
        </div>
      </Card>

      <Btn onClick={handleSave} style={{ alignSelf:"flex-start" }}>
        {saved ? "✓ Guardado" : "Guardar configuración"}
      </Btn>
    </div>
  );
}

// ============================================================
// CANAL HOSPITALARIO — Cotizaciones
// ============================================================
let folioCounter = 1000;
const genFolio = () => `COT-${new Date().getFullYear()}-${String(++folioCounter).padStart(4, "0")}`;

const ESTADOS_COT = {
  borrador:  { label: "Borrador",   color: "#64748b" },
  enviada:   { label: "Enviada",    color: "#4361ee" },
  aprobada:  { label: "Aprobada",   color: "#06d6a0" },
  rechazada: { label: "Rechazada",  color: "#ff4d6d" },
  convertida:{ label: "Convertida", color: "#00c2a8" },
};

const newLineHosp = () => ({ id: uid(), producto: "", cantidad: "1", precioUnitario: "", descripcion: "" });

function generarPDFCotizacion(cot) {
  const win = window.open("", "_blank");
  if (!win) return;
  const total = cot.lineas?.reduce((a, l) => a + Number(l.cantidad||0)*Number(l.precioUnitario||0), 0) || 0;
  win.document.write(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8"/>
      <title>Cotización ${cot.folio}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; color: #1a1a2e; padding: 40px; font-size: 13px; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; border-bottom: 3px solid #00c2a8; padding-bottom: 20px; }
        .logo { font-size: 28px; font-weight: 900; color: #00c2a8; letter-spacing: -1px; }
        .logo span { color: #1a1a2e; }
        .folio-box { text-align: right; }
        .folio-num { font-size: 20px; font-weight: 800; color: #00c2a8; }
        .section { margin-bottom: 24px; }
        .section-title { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .info-item label { font-size: 10px; color: #64748b; display: block; margin-bottom: 2px; }
        .info-item span { font-size: 13px; font-weight: 600; color: #1a1a2e; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #f1f5f9; padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
        td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
        tr:last-child td { border-bottom: none; }
        .td-right { text-align: right; }
        .total-box { background: #f8fafc; border: 2px solid #00c2a8; border-radius: 8px; padding: 16px; text-align: right; margin-top: 16px; }
        .total-label { font-size: 12px; color: #64748b; margin-bottom: 4px; }
        .total-value { font-size: 26px; font-weight: 900; color: #00c2a8; }
        .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 11px; text-align: center; }
        .validity { background: #fff7ed; border: 1px solid #fed7aa; border-radius: 6px; padding: 8px 12px; font-size: 12px; color: #c2410c; margin-top: 12px; }
        @media print { body { padding: 20px; } }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="logo">AJ <span>Medical</span></div>
          <div style="font-size:11px;color:#64748b;margin-top:4px;">Distribución de Material Quirúrgico</div>
          <div style="font-size:11px;color:#64748b;">México · ajmedical.vercel.app</div>
        </div>
        <div class="folio-box">
          <div style="font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Cotización</div>
          <div class="folio-num">${cot.folio}</div>
          <div style="font-size:12px;color:#64748b;margin-top:4px;">Fecha: ${cot.fecha}</div>
          ${cot.vigencia ? `<div class="validity">⏰ Vigencia: ${cot.vigencia}</div>` : ""}
        </div>
      </div>

      <div class="section">
        <div class="section-title">Datos del cliente</div>
        <div class="info-grid">
          <div class="info-item"><label>Hospital / Institución</label><span>${cot.hospital || "—"}</span></div>
          <div class="info-item"><label>Contacto</label><span>${cot.contacto || "—"}</span></div>
          <div class="info-item"><label>Área / Departamento</label><span>${cot.area || "—"}</span></div>
          <div class="info-item"><label>Ciudad</label><span>${cot.ciudad || "—"}</span></div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Productos cotizados</div>
        <table>
          <thead>
            <tr>
              <th>#</th><th>Descripción</th><th>Referencia</th><th class="td-right">Cant.</th>
              <th class="td-right">P. Unitario</th><th class="td-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${(cot.lineas||[]).map((l, i) => `
              <tr>
                <td>${i+1}</td>
                <td>${l.descripcion || l.producto}</td>
                <td style="font-family:monospace;font-size:11px;">${l.producto}</td>
                <td class="td-right">${l.cantidad}</td>
                <td class="td-right">$${Number(l.precioUnitario||0).toLocaleString("es-MX")}</td>
                <td class="td-right" style="font-weight:700;">$${(Number(l.cantidad||0)*Number(l.precioUnitario||0)).toLocaleString("es-MX")}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
        <div class="total-box">
          <div class="total-label">TOTAL COTIZACIÓN</div>
          <div class="total-value">$${total.toLocaleString("es-MX")} MXN</div>
        </div>
      </div>

      ${cot.condiciones ? `
      <div class="section">
        <div class="section-title">Condiciones comerciales</div>
        <div style="font-size:13px;color:#475569;line-height:1.6;">${cot.condiciones}</div>
      </div>` : ""}

      ${cot.notas ? `
      <div class="section">
        <div class="section-title">Notas adicionales</div>
        <div style="font-size:13px;color:#475569;line-height:1.6;">${cot.notas}</div>
      </div>` : ""}

      <div class="footer">
        AJ Medical — Esta cotización es válida por los días indicados a partir de su fecha de emisión.<br/>
        Para aceptar, comuníquese con nosotros indicando el número de folio <strong>${cot.folio}</strong>.
      </div>
      <script>window.onload = () => { window.print(); }</script>
    </body>
    </html>
  `);
  win.document.close();
}

function CanalHospitalario({ data, setData, clientes, inventario, setInventario, ventas, setVentas, cobros, setCobros }) {
  const [modal, setModal] = useState(false);
  const [vistaDetalle, setVistaDetalle] = useState(null);
  const [delTarget, setDelTarget] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState("todas");

  // Form state
  const [hospital, setHospital] = useState("");
  const [contacto, setContacto] = useState("");
  const [area, setArea] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [fecha, setFecha] = useState(today);
  const [vigencia, setVigencia] = useState("");
  const [condiciones, setCondiciones] = useState("Precios en MXN. Entrega inmediata sujeta a disponibilidad de stock. Facturación al momento de la entrega.");
  const [notas, setNotas] = useState("");
  const [lineas, setLineas] = useState([newLineHosp()]);

  const updateLinea = (idx, field, value) => {
    setLineas(prev => {
      const next = prev.map((l, i) => i === idx ? { ...l, [field]: value } : l);
      if (field === "producto") {
        const match = findInvMatch(inventario, value);
        if (match >= 0 && inventario[match].nombre) {
          next[idx] = { ...next[idx], descripcion: inventario[match].nombre };
        }
      }
      return next;
    });
  };

  const totalGeneral = lineas.reduce((a, l) => a + Number(l.cantidad||0)*Number(l.precioUnitario||0), 0);

  const save = async () => {
    const validas = lineas.filter(l => l.producto && l.cantidad && l.precioUnitario);
    if (!hospital || validas.length === 0) return;
    const nueva = {
      id: uid(), folio: genFolio(), fecha, hospital, contacto, area, ciudad,
      vigencia, condiciones, notas, lineas: validas,
      estado: "borrador", total: totalGeneral, fechaCreacion: today(),
    };
    const updated = [...data, nueva];
    setData(updated); await saveData(KEYS.cotizaciones, updated);
    setModal(false); resetForm();
  };

  const resetForm = () => {
    setHospital(""); setContacto(""); setArea(""); setCiudad(""); setFecha(today());
    setVigencia(""); setNotas(""); setLineas([newLineHosp()]);
    setCondiciones("Precios en MXN. Entrega inmediata sujeta a disponibilidad de stock. Facturación al momento de la entrega.");
  };

  const cambiarEstado = async (id, nuevoEstado) => {
    const updated = data.map(c => c.id === id ? { ...c, estado: nuevoEstado } : c);
    setData(updated); await saveData(KEYS.cotizaciones, updated);
    if (vistaDetalle?.id === id) setVistaDetalle(prev => ({ ...prev, estado: nuevoEstado }));
  };

  const convertirAVenta = async (cot) => {
    // Crear ventas por cada línea de la cotización
    const nuevasVentas = cot.lineas.map(l => {
      const total = Number(l.cantidad) * Number(l.precioUnitario);
      const match = findInvMatch(inventario, l.producto);
      const costo = match >= 0 ? Number(inventario[match].costoUnitario || 0) : 0;
      const utilidad = total - Number(l.cantidad) * costo;
      return {
        id: uid(), fecha: today(), cliente: cot.hospital,
        producto: l.descripcion || l.producto, cantidad: l.cantidad,
        precioUnitario: l.precioUnitario, costo, total, utilidad,
        formaPago: "credito", cobrado: false,
        notas: `Cotización ${cot.folio}`, cotizacionId: cot.id,
      };
    });

    // Registrar cobro pendiente por total
    const nuevoCobro = {
      id: uid(), fechaVenta: today(), fechaVence: "",
      cliente: cot.hospital, concepto: `Cotización ${cot.folio}`,
      monto: cot.total, pagado: false, notas: `Generado desde ${cot.folio}`,
    };

    const updatedVentas = [...ventas, ...nuevasVentas];
    const updatedCobros = [...cobros, nuevoCobro];

    // Descontar inventario (PEPS)
    let updatedInv = [...inventario];
    for (const l of cot.lineas) {
      const qty = Number(l.cantidad);
      const match = findInvMatch(updatedInv, l.producto);
      if (match >= 0) {
        const newStock = Math.max(0, Number(updatedInv[match].stock) - qty);
        const lotesActuales = [...(updatedInv[match].lotes || [])];
        let restante = qty;
        const lotesActualizados = lotesActuales.map(lote => {
          if (restante <= 0) return lote;
          const descontar = Math.min(restante, lote.cantidad);
          restante -= descontar;
          return { ...lote, cantidad: lote.cantidad - descontar };
        }).filter(lote => lote.cantidad > 0);
        updatedInv[match] = { ...updatedInv[match], stock: newStock, lotes: lotesActualizados };
      }
    }

    await saveData(KEYS.ventas, updatedVentas);
    await saveData(KEYS.cobros, updatedCobros);
    await saveData(KEYS.inventario, updatedInv);
    setVentas(updatedVentas); setCobros(updatedCobros); setInventario(updatedInv);

    // Marcar cotización como convertida
    await cambiarEstado(cot.id, "convertida");
    setVistaDetalle(null);
  };

  const confirmDel = async () => {
    const n = data.filter(x => x.id !== delTarget.id);
    setData(n); await saveData(KEYS.cotizaciones, n); setDelTarget(null);
  };

  const filtradas = filtroEstado === "todas" ? data : data.filter(c => c.estado === filtroEstado);
  const sorted = [...filtradas].sort((a, b) => b.fechaCreacion?.localeCompare(a.fechaCreacion));

  // Stats
  const totalEnviadas = data.filter(c => c.estado === "enviada").reduce((a, c) => a + c.total, 0);
  const totalAprobadas = data.filter(c => c.estado === "aprobada").reduce((a, c) => a + c.total, 0);
  const tasaAprobacion = data.filter(c => c.estado !== "borrador").length > 0
    ? (data.filter(c => c.estado === "aprobada" || c.estado === "convertida").length / data.filter(c => c.estado !== "borrador").length * 100).toFixed(0)
    : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {delTarget && <DeleteConfirm item={`Cotización ${delTarget.folio}`} onConfirm={confirmDel} onCancel={() => setDelTarget(null)} />}

      {/* Detalle cotización */}
      {vistaDetalle && (
        <Modal title={`${vistaDetalle.folio}`} onClose={() => setVistaDetalle(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Tag color={ESTADOS_COT[vistaDetalle.estado]?.color}>{ESTADOS_COT[vistaDetalle.estado]?.label}</Tag>
              <span style={{ fontSize: 12, color: C.textDim }}>{vistaDetalle.fecha} · {vistaDetalle.hospital}</span>
            </div>

            {/* Info cliente */}
            <div style={{ background: C.bg, borderRadius: 8, padding: 10, fontSize: 12, color: C.textMid }}>
              {vistaDetalle.contacto && <div>👤 {vistaDetalle.contacto}</div>}
              {vistaDetalle.area && <div>🏥 {vistaDetalle.area}</div>}
              {vistaDetalle.ciudad && <div>📍 {vistaDetalle.ciudad}</div>}
              {vistaDetalle.vigencia && <div>⏰ Vigencia: {vistaDetalle.vigencia}</div>}
            </div>

            {/* Líneas */}
            <div>
              <div style={{ fontSize: 11, color: C.textDim, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Productos</div>
              {vistaDetalle.lineas?.map((l, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
                  <div>
                    <div style={{ color: C.text, fontWeight: 600 }}>{l.descripcion || l.producto}</div>
                    <div style={{ fontSize: 11, color: C.textDim }}>{l.cantidad} uds · {fMXN(l.precioUnitario)}/ud</div>
                  </div>
                  <span style={{ color: C.accent, fontWeight: 700 }}>{fMXN(Number(l.cantidad)*Number(l.precioUnitario))}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
                <span style={{ fontSize: 18, fontWeight: 900, color: C.accent }}>Total: {fMXN(vistaDetalle.total)}</span>
              </div>
            </div>

            {vistaDetalle.condiciones && (
              <div style={{ fontSize: 12, color: C.textDim, fontStyle: "italic", borderTop: `1px solid ${C.border}`, paddingTop: 8 }}>
                {vistaDetalle.condiciones}
              </div>
            )}

            {/* Acciones según estado */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
              <Btn onClick={() => generarPDFCotizacion(vistaDetalle)} variant="ghost">
                <Icon name="document" size={14} /> Generar PDF / Imprimir
              </Btn>

              {vistaDetalle.estado === "borrador" && (
                <Btn onClick={() => cambiarEstado(vistaDetalle.id, "enviada")}>
                  📤 Marcar como Enviada al hospital
                </Btn>
              )}
              {vistaDetalle.estado === "enviada" && (
                <div style={{ display: "flex", gap: 8 }}>
                  <Btn onClick={() => cambiarEstado(vistaDetalle.id, "aprobada")} style={{ flex: 1 }}>
                    ✓ Aprobada
                  </Btn>
                  <Btn variant="danger" onClick={() => cambiarEstado(vistaDetalle.id, "rechazada")} style={{ flex: 1 }}>
                    ✗ Rechazada
                  </Btn>
                </div>
              )}
              {vistaDetalle.estado === "aprobada" && (
                <Btn onClick={() => convertirAVenta(vistaDetalle)} style={{ background: C.green, color: "#000" }}>
                  🚀 Convertir a Venta + Cobro pendiente
                </Btn>
              )}
              {vistaDetalle.estado === "convertida" && (
                <div style={{ background: C.green + "22", border: `1px solid ${C.green}44`, borderRadius: 8, padding: "10px 12px", fontSize: 13, color: C.green, fontWeight: 600 }}>
                  ✓ Convertida — Ver en Ventas y Cobros
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: C.text }}>Canal Hospitalario</h2>
          <div style={{ fontSize: 12, color: C.textDim }}>{data.length} cotizaciones · Tasa aprobación: {tasaAprobacion}%</div>
        </div>
        <Btn onClick={() => setModal(true)}><Icon name="plus" size={14} /> Nueva cotización</Btn>
      </div>

      {/* KPIs */}
      <div style={{ display: "flex", gap: 10 }}>
        <StatCard label="Enviadas" value={fMXN(totalEnviadas)} color={C.blue} sub={`${data.filter(c=>c.estado==="enviada").length} cotiz.`} />
        <StatCard label="Aprobadas" value={fMXN(totalAprobadas)} color={C.green} sub={`${data.filter(c=>c.estado==="aprobada").length} cotiz.`} />
      </div>

      {/* Filtro por estado */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {[["todas", "Todas"], ...Object.entries(ESTADOS_COT).map(([k, v]) => [k, v.label])].map(([key, label]) => (
          <button key={key} onClick={() => setFiltroEstado(key)} style={{
            padding: "4px 12px", borderRadius: 16, fontSize: 11, fontWeight: 600, cursor: "pointer",
            fontFamily: "inherit", background: filtroEstado === key ? C.accent + "22" : "transparent",
            border: `1px solid ${filtroEstado === key ? C.accent : C.border}`,
            color: filtroEstado === key ? C.accent : C.textDim,
          }}>{label}</button>
        ))}
      </div>

      {/* Lista cotizaciones */}
      {sorted.length === 0 && (
        <Card style={{ textAlign: "center", padding: 32 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🏥</div>
          <div style={{ fontSize: 14, color: C.textDim }}>Sin cotizaciones aún</div>
          <div style={{ fontSize: 12, color: C.textDim, marginTop: 4 }}>Crea tu primera cotización para un hospital</div>
        </Card>
      )}
      {sorted.map(c => {
        const est = ESTADOS_COT[c.estado] || ESTADOS_COT.borrador;
        return (
          <Card key={c.id} style={{ padding: "12px 14px", borderColor: est.color + "44", cursor: "pointer" }}
            onClick={() => setVistaDetalle(c)}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: C.text, fontFamily: "monospace" }}>{c.folio}</span>
                  <Tag color={est.color}>{est.label}</Tag>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 2 }}>{c.hospital}</div>
                <div style={{ fontSize: 11, color: C.textDim }}>
                  {fDate(c.fecha)} · {c.lineas?.length} producto(s)
                  {c.vigencia && ` · Vigencia: ${c.vigencia}`}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                <span style={{ fontSize: 16, fontWeight: 900, color: est.color }}>{fMXN(c.total)}</span>
                <button onClick={e => { e.stopPropagation(); setDelTarget(c); }}
                  style={{ background: "none", border: "none", cursor: "pointer", color: C.textDim, padding: 2 }}>
                  <Icon name="trash" size={13} />
                </button>
              </div>
            </div>
          </Card>
        );
      })}

      {/* Modal nueva cotización */}
      {modal && (
        <Modal title="Nueva cotización" onClose={() => { setModal(false); resetForm(); }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: 11, color: C.textDim, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>Datos del hospital</div>
            <Input label="Hospital / Institución *" value={hospital} onChange={setHospital} placeholder="Nombre del hospital" />
            <div style={{ display: "flex", gap: 10 }}>
              <Input label="Contacto" value={contacto} onChange={setContacto} placeholder="Nombre del contacto" />
              <Input label="Área / Dpto." value={area} onChange={setArea} placeholder="Quirófano, Compras..." />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <Input label="Ciudad" value={ciudad} onChange={setCiudad} placeholder="Ciudad" />
              <Input label="Fecha" type="date" value={fecha} onChange={setFecha} />
            </div>
            <Input label="Vigencia de la cotización" value={vigencia} onChange={setVigencia} placeholder="Ej: 30 días, hasta 30/06/2026" />

            <div style={{ fontSize: 11, color: C.textDim, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>Productos</div>
            {lineas.map((l, idx) => {
              const sub = Number(l.cantidad||0)*Number(l.precioUnitario||0);
              return (
                <div key={l.id} style={{ background: C.bg, borderRadius: 10, padding: 10, border: `1px solid ${C.border}` }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "flex-end", marginBottom: 6 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 10, color: C.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Producto / SKU *</label>
                      <select value={l.producto} onChange={e => updateLinea(idx, "producto", e.target.value)}
                        style={{ width: "100%", marginTop: 4, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 10px", color: l.producto ? C.text : C.textDim, fontSize: 13, fontFamily: "inherit", outline: "none" }}>
                        <option value="">Seleccionar...</option>
                        {inventario.map(i => <option key={i.id} value={i.nombre}>{i.nombre}{i.sku ? ` (${i.sku})` : ""} — Stock: {i.stock}</option>)}
                        <option value="__otro__">Otro</option>
                      </select>
                      {l.producto === "__otro__" && (
                        <input value={l.descripcion||""} onChange={e => updateLinea(idx, "descripcion", e.target.value)} placeholder="Nombre del producto"
                          style={{ width: "100%", marginTop: 6, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px", color: C.text, fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
                      )}
                    </div>
                    {lineas.length > 1 && (
                      <button onClick={() => setLineas(p => p.filter((_, i) => i !== idx))}
                        style={{ background: "none", border: "none", cursor: "pointer", color: C.red, padding: "4px 0 8px" }}>
                        <Icon name="trash" size={14} />
                      </button>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <div style={{ flex: "0 0 70px" }}>
                      <label style={{ fontSize: 10, color: C.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Cant.</label>
                      <input type="number" value={l.cantidad} onChange={e => updateLinea(idx, "cantidad", e.target.value)}
                        style={{ width: "100%", marginTop: 4, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px", color: C.text, fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 10, color: C.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Precio unitario MXN *</label>
                      <input type="number" value={l.precioUnitario} onChange={e => updateLinea(idx, "precioUnitario", e.target.value)} placeholder="0"
                        style={{ width: "100%", marginTop: 4, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px", color: C.text, fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
                    </div>
                  </div>
                  {sub > 0 && <div style={{ marginTop: 6, fontSize: 12, color: C.textDim }}>Subtotal: <strong style={{ color: C.accent }}>{fMXN(sub)}</strong></div>}
                </div>
              );
            })}
            <Btn variant="ghost" onClick={() => setLineas(p => [...p, newLineHosp()])} small><Icon name="plus" size={13} /> Agregar producto</Btn>

            {totalGeneral > 0 && (
              <div style={{ background: C.accentDim, borderRadius: 10, padding: "12px 14px", display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: C.textMid, fontSize: 13 }}>{lineas.filter(l=>l.producto&&l.precioUnitario).length} producto(s)</span>
                <span style={{ fontSize: 17, fontWeight: 900, color: C.accent }}>Total: {fMXN(totalGeneral)}</span>
              </div>
            )}

            <Input label="Condiciones comerciales" value={condiciones} onChange={setCondiciones} placeholder="Términos de pago, entrega..." />
            <Input label="Notas adicionales" value={notas} onChange={setNotas} placeholder="Información extra para el cliente..." />
            <Btn onClick={save}>Crear cotización</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ============================================================
// LOGIN — Sistema multi-usuario con roles
// ============================================================
const USERS = {
  "JacoboVera05": {
    pass: "Jeicop05@",
    nombre: "Jacobo",
    inicial: "J",
    rol: "admin",
    // Admin ve todo
    tabsPermitidas: null, // null = todas
  },
  "giovana.liceaga": {
    pass: "Natasha27",
    nombre: "Giovana",
    inicial: "G",
    rol: "operaciones",
    tabsPermitidas: ["home", "ventas", "compras", "gastos", "clientes", "inventario", "cobros", "calendario"],
  },
};
const SESSION_KEY = "ajm:session";
const SESSION_USER_KEY = "ajm:session_user";

function Login({ onLogin }) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = () => {
    if (!user || !pass) { setError("Ingresa usuario y contraseña."); return; }
    setLoading(true);
    setTimeout(() => {
      const userData = USERS[user];
      if (userData && pass === userData.pass) {
        localStorage.setItem(SESSION_KEY, "1");
        localStorage.setItem(SESSION_USER_KEY, user);
        onLogin(user);
      } else {
        setError("Usuario o contraseña incorrectos.");
        setLoading(false);
      }
    }, 600);
  };

  return (
    <div style={{
      background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", fontFamily: "'DM Sans', system-ui, sans-serif", padding: 24,
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <div style={{ width: "100%", maxWidth: 360 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 20, background: C.accentDim,
            border: `2px solid ${C.accent}`, display: "inline-flex", alignItems: "center",
            justifyContent: "center", fontSize: 24, fontWeight: 900, color: C.accent, marginBottom: 16,
          }}>AJ</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.text }}>AJ Medical</div>
          <div style={{ fontSize: 13, color: C.textDim, marginTop: 4 }}>Sistema de Gestión</div>
        </div>

        {/* Form */}
        <div style={{ background: C.card, borderRadius: 16, padding: 24, border: `1px solid ${C.border}` }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, color: C.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 6 }}>Usuario</label>
            <input
              value={user} onChange={e => { setUser(e.target.value); setError(""); }}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
              placeholder="Tu usuario"
              autoComplete="username"
              style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px", color: C.text, fontSize: 15, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
              onFocus={e => e.target.style.borderColor = C.accent}
              onBlur={e => e.target.style.borderColor = C.border}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 11, color: C.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 6 }}>Contraseña</label>
            <div style={{ position: "relative" }}>
              <input
                type={showPass ? "text" : "password"}
                value={pass} onChange={e => { setPass(e.target.value); setError(""); }}
                onKeyDown={e => e.key === "Enter" && handleLogin()}
                placeholder="Tu contraseña"
                autoComplete="current-password"
                style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 44px 12px 14px", color: C.text, fontSize: 15, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
                onFocus={e => e.target.style.borderColor = C.accent}
                onBlur={e => e.target.style.borderColor = C.border}
              />
              <button onClick={() => setShowPass(p => !p)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: C.textDim, fontSize: 13, fontFamily: "inherit" }}>
                {showPass ? "Ocultar" : "Ver"}
              </button>
            </div>
          </div>

          {error && (
            <div style={{ background: C.red + "18", border: `1px solid ${C.red}44`, borderRadius: 8, padding: "10px 12px", fontSize: 13, color: C.red, marginBottom: 16, fontWeight: 600 }}>
              {error}
            </div>
          )}

          <button
            onClick={handleLogin} disabled={loading}
            style={{
              width: "100%", background: loading ? C.accent + "88" : C.accent, border: "none",
              borderRadius: 10, padding: "14px", color: "#000", fontSize: 15, fontWeight: 800,
              cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", transition: "all .15s",
            }}
          >
            {loading ? "Verificando..." : "Entrar"}
          </button>
        </div>

        <div style={{ textAlign: "center", marginTop: 20, fontSize: 11, color: C.textDim }}>
          AJ Medical © 2026 — Acceso restringido
        </div>
      </div>
    </div>
  );
}

// ============================================================
// CALENDARIO — integrado con todos los módulos
// ============================================================
const CAL_KEY = "ajm:calendario";
const EVENT_TYPES = {
  compra:   { label: "Llegada de material", color: "#4361ee" },
  venta:    { label: "Venta realizada",      color: "#00c2a8" },
  cobro:    { label: "Cobro pendiente",      color: "#ffd166" },
  gasto:    { label: "Gasto / Pago",         color: "#ff9a3c" },
  cotiz:    { label: "Cotización hospital",  color: "#06d6a0" },
  reorden:  { label: "Reorden inventario",   color: "#ff4d6d" },
  manual:   { label: "Evento manual",        color: "#94a3b8" },
};

function Calendario({ ventas, compras, gastos, cobros, inventario, cotizaciones }) {
  const [eventosMan, setEventosMan] = useState([]);
  const [mes, setMes] = useState(() => new Date().toISOString().slice(0, 7));
  const [modal, setModal] = useState(false);
  const [diaSeleccionado, setDiaSeleccionado] = useState(null);
  const [form, setForm] = useState({ titulo: "", tipo: "manual", fecha: today(), notas: "" });
  const f = k => v => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => { loadData(CAL_KEY).then(setEventosMan); }, []);

  const saveManual = async () => {
    if (!form.titulo || !form.fecha) return;
    const nuevo = [...eventosMan, { id: uid(), ...form }];
    setEventosMan(nuevo); await saveData(CAL_KEY, nuevo); setModal(false);
    setForm({ titulo: "", tipo: "manual", fecha: diaSeleccionado || today(), notas: "" });
  };
  const delManual = async (id) => {
    const n = eventosMan.filter(e => e.id !== id);
    setEventosMan(n); await saveData(CAL_KEY, n);
  };

  // ── Generar eventos automáticos desde todos los módulos ─────
  const eventosAuto = [];

  // Compras → llegada de material
  compras.forEach(c => {
    if (c.fecha) eventosAuto.push({ id: `c-${c.id}`, fecha: c.fecha, tipo: "compra", titulo: `Compra: ${c.producto}`, sub: `${c.proveedor} · ${c.cantidad} uds`, auto: true });
  });

  // Ventas
  ventas.forEach(v => {
    if (v.fecha) eventosAuto.push({ id: `v-${v.id}`, fecha: v.fecha, tipo: "venta", titulo: `Venta: ${v.producto}`, sub: `${v.cliente} · ${fMXN(v.total)}`, auto: true });
  });

  // Cobros pendientes → fecha de vencimiento
  cobros.filter(c => !c.pagado && c.fechaVence).forEach(c => {
    eventosAuto.push({ id: `co-${c.id}`, fecha: c.fechaVence, tipo: "cobro", titulo: `Cobro vence: ${c.cliente}`, sub: fMXN(c.monto), auto: true });
  });

  // Gastos
  gastos.forEach(g => {
    if (g.fecha) eventosAuto.push({ id: `g-${g.id}`, fecha: g.fecha, tipo: "gasto", titulo: `Gasto: ${g.descripcion}`, sub: `${g.categoria} · ${fMXN(g.monto)}`, auto: true });
  });

  // Cotizaciones hospitalarias
  (cotizaciones || []).forEach(cot => {
    if (cot.fecha) eventosAuto.push({ id: `cot-${cot.id}`, fecha: cot.fecha, tipo: "cotiz", titulo: `Cotización: ${cot.hospital}`, sub: `${cot.folio} · ${fMXN(cot.total)}`, auto: true });
  });

  // Inventario → alertas de reorden
  inventario.filter(i => i.puntoReorden && Number(i.stock) <= Number(i.puntoReorden)).forEach(i => {
    eventosAuto.push({ id: `inv-${i.id}`, fecha: today(), tipo: "reorden", titulo: `Reordenar: ${i.nombre}`, sub: `Stock: ${i.stock} (reorden: ${i.puntoReorden})`, auto: true });
  });

  // Todos los eventos combinados
  const todosEventos = [...eventosAuto, ...eventosMan];

  // Grid del mes
  const [year, month] = mes.split("-").map(Number);
  const primerDia = new Date(year, month - 1, 1).getDay();
  const diasMes = new Date(year, month, 0).getDate();
  const diasGrid = [];
  for (let i = 0; i < primerDia; i++) diasGrid.push(null);
  for (let i = 1; i <= diasMes; i++) diasGrid.push(i);

  const mesNombre = new Date(year, month - 1).toLocaleDateString("es-MX", { month: "long", year: "numeric" });
  const cambiarMes = d => { const dt = new Date(year, month - 1 + d, 1); setMes(dt.toISOString().slice(0, 7)); };

  const eventosDelDia = dia => {
    if (!dia) return [];
    const fecha = `${mes}-${String(dia).padStart(2, "0")}`;
    return todosEventos.filter(e => e.fecha === fecha);
  };

  const eventosDelMes = todosEventos.filter(e => e.fecha?.startsWith(mes)).sort((a, b) => a.fecha.localeCompare(b.fecha));

  // Alertas
  const cobrosVencidos = cobros.filter(c => !c.pagado && c.fechaVence && c.fechaVence < today());
  const proximos7 = cobros.filter(c => {
    if (c.pagado || !c.fechaVence) return false;
    const dias = Math.ceil((new Date(c.fechaVence) - new Date()) / 86400000);
    return dias >= 0 && dias <= 7;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: C.text }}>Calendario</h2>
          <div style={{ fontSize: 12, color: C.textDim }}>{eventosDelMes.length} eventos este mes</div>
        </div>
        <Btn onClick={() => { setDiaSeleccionado(today()); setForm(p => ({ ...p, fecha: today() })); setModal(true); }}>
          <Icon name="plus" size={14} /> Agregar
        </Btn>
      </div>

      {/* Alertas automáticas */}
      {cobrosVencidos.length > 0 && (
        <div style={{ background: C.red + "18", border: `1px solid ${C.red}44`, borderRadius: 10, padding: "10px 14px" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.red, marginBottom: 4 }}>🚨 {cobrosVencidos.length} cobro(s) vencido(s)</div>
          {cobrosVencidos.map(c => <div key={c.id} style={{ fontSize: 12, color: C.textMid }}>{c.cliente} — {fMXN(c.monto)} · Venció: {fDate(c.fechaVence)}</div>)}
        </div>
      )}
      {proximos7.length > 0 && (
        <div style={{ background: C.yellow + "18", border: `1px solid ${C.yellow}44`, borderRadius: 10, padding: "10px 14px" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.yellow, marginBottom: 4 }}>⏰ Cobros que vencen esta semana</div>
          {proximos7.map(c => <div key={c.id} style={{ fontSize: 12, color: C.textMid }}>{c.cliente} — {fMXN(c.monto)} · Vence: {fDate(c.fechaVence)}</div>)}
        </div>
      )}

      {/* Navegación y grid */}
      <Card style={{ padding: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <button onClick={() => cambiarMes(-1)} style={{ background: "none", border: "none", cursor: "pointer", color: C.textMid, fontSize: 20, padding: "0 8px" }}>‹</button>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.text, textTransform: "capitalize" }}>{mesNombre}</span>
          <button onClick={() => cambiarMes(1)} style={{ background: "none", border: "none", cursor: "pointer", color: C.textMid, fontSize: 20, padding: "0 8px" }}>›</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 4 }}>
          {["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"].map(d => (
            <div key={d} style={{ fontSize: 9, color: C.textDim, textAlign: "center", fontWeight: 700, padding: "2px 0" }}>{d}</div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
          {diasGrid.map((dia, i) => {
            const evs = eventosDelDia(dia);
            const esHoy = dia && `${mes}-${String(dia).padStart(2, "0")}` === today();
            return (
              <div key={i} onClick={() => { if (!dia) return; const f = `${mes}-${String(dia).padStart(2, "0")}`; setDiaSeleccionado(f); setForm(p => ({ ...p, fecha: f })); setModal(true); }}
                style={{ minHeight: 38, borderRadius: 6, padding: "3px 2px", cursor: dia ? "pointer" : "default", background: esHoy ? C.accentDim : dia ? C.bg : "transparent", border: esHoy ? `1px solid ${C.accent}` : "1px solid transparent" }}>
                {dia && <>
                  <div style={{ fontSize: 11, fontWeight: esHoy ? 800 : 400, color: esHoy ? C.accent : C.textMid, textAlign: "center" }}>{dia}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 1, justifyContent: "center", marginTop: 1 }}>
                    {evs.slice(0, 4).map((e, ei) => (
                      <div key={ei} style={{ width: 5, height: 5, borderRadius: "50%", background: EVENT_TYPES[e.tipo]?.color || C.accent }} />
                    ))}
                  </div>
                </>}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Leyenda */}
      <Card style={{ padding: "10px 14px" }}>
        <div style={{ fontSize: 11, color: C.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Fuentes de eventos</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {Object.entries(EVENT_TYPES).map(([k, v]) => (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: v.color }} />
              <span style={{ fontSize: 10, color: C.textMid }}>{v.label}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Lista eventos del mes */}
      {eventosDelMes.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: C.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Todos los eventos — {mesNombre}</div>
          {eventosDelMes.map(e => {
            const tipo = EVENT_TYPES[e.tipo] || EVENT_TYPES.manual;
            return (
              <Card key={e.id} style={{ padding: "10px 14px", marginBottom: 6, borderColor: tipo.color + "44" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 2 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: tipo.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{e.titulo}</span>
                    </div>
                    {e.sub && <div style={{ fontSize: 11, color: C.textDim, marginLeft: 16 }}>{e.sub}</div>}
                    <div style={{ fontSize: 10, color: C.textDim, marginLeft: 16, marginTop: 2 }}>{fDate(e.fecha)} · <Tag color={tipo.color}>{tipo.label}</Tag></div>
                  </div>
                  {!e.auto && (
                    <button onClick={() => delManual(e.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.textDim, padding: 2 }}>
                      <Icon name="trash" size={13} />
                    </button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {modal && (
        <Modal title={`Agregar evento — ${fDate(diaSeleccionado)}`} onClose={() => setModal(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Input label="Título *" value={form.titulo} onChange={f("titulo")} placeholder="¿Qué es?" />
            <div style={{ display: "flex", gap: 10 }}>
              <Input label="Fecha" type="date" value={form.fecha} onChange={f("fecha")} />
              <Select label="Tipo" value={form.tipo} onChange={f("tipo")} options={Object.entries(EVENT_TYPES).map(([k, v]) => ({ value: k, label: v.label }))} />
            </div>
            <Input label="Notas" value={form.notas} onChange={f("notas")} placeholder="Detalles..." />
            <Btn onClick={saveManual}>Guardar evento</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ============================================================
// REPORTES — con período libre e integración completa
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

function Reportes({ ventas, compras, gastos, clientes, cobros, inventario }) {
  const [fechaIni, setFechaIni] = useState(() => { const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10); });
  const [fechaFin, setFechaFin] = useState(today);
  const [tipoRep, setTipoRep] = useState("ventas");
  const [vista, setVista] = useState(null);

  const periodoLabel = fechaIni === fechaFin ? fDate(fechaIni) : `${fDate(fechaIni)} — ${fDate(fechaFin)}`;
  const enPeriodo = fecha => fecha && fecha >= fechaIni && fecha <= fechaFin;

  const generarReporte = () => {
    const vPer = ventas.filter(v => enPeriodo(v.fecha));
    const cPer = compras.filter(c => enPeriodo(c.fecha));
    const gPer = gastos.filter(g => enPeriodo(g.fecha));

    if (tipoRep === "ventas") {
      const total = vPer.reduce((a, v) => a + Number(v.total || 0), 0);
      const utilidad = vPer.reduce((a, v) => a + Number(v.utilidad || 0), 0);
      const margen = total > 0 ? (utilidad / total * 100).toFixed(1) : 0;
      const porCliente = Object.entries(vPer.reduce((acc, v) => { acc[v.cliente] = (acc[v.cliente] || 0) + Number(v.total || 0); return acc; }, {})).sort((a, b) => b[1] - a[1]);
      const porProducto = Object.entries(vPer.reduce((acc, v) => { acc[v.producto] = (acc[v.producto] || 0) + Number(v.total || 0); return acc; }, {})).sort((a, b) => b[1] - a[1]);
      return { tipo: "ventas", periodo: periodoLabel, total, utilidad, margen, porCliente, porProducto, detalle: vPer };
    }
    if (tipoRep === "recompra") {
      const enReorden = inventario.filter(i => i.puntoReorden !== "" && i.puntoReorden !== undefined && Number(i.stock) <= Number(i.puntoReorden)).map(i => {
        const hace90 = new Date(); hace90.setDate(hace90.getDate() - 90);
        const vendido90 = ventas.filter(v => v.producto === i.nombre && v.fecha >= hace90.toISOString().slice(0, 10)).reduce((a, v) => a + Number(v.cantidad || 0), 0);
        const velocidadMes = Math.ceil(vendido90 / 3);
        return { ...i, velocidadMes, sugerido: Math.max(Number(i.puntoReorden) * 2, velocidadMes * 2), critico: Number(i.stock) === 0 };
      }).sort((a, b) => b.critico - a.critico);
      return { tipo: "recompra", periodo: "Tiempo real", enReorden };
    }
    if (tipoRep === "margenes") {
      const porProducto = Object.entries(vPer.reduce((acc, v) => {
        if (!acc[v.producto]) acc[v.producto] = { total: 0, costo: 0, qty: 0 };
        acc[v.producto].total += Number(v.total || 0);
        acc[v.producto].costo += Number(v.cantidad || 0) * Number(v.costo || 0);
        acc[v.producto].qty += Number(v.cantidad || 0);
        return acc;
      }, {})).map(([nombre, d]) => ({ nombre, total: d.total, costo: d.costo, qty: d.qty, utilidad: d.total - d.costo, margen: d.total > 0 ? ((d.total - d.costo) / d.total * 100).toFixed(1) : 0 })).sort((a, b) => b.margen - a.margen);
      return { tipo: "margenes", periodo: periodoLabel, porProducto };
    }
    if (tipoRep === "inactivos") {
      const hoy = new Date();
      const inactivos = clientes.map(c => {
        const ultima = ventas.filter(v => v.cliente === c.nombre).sort((a, b) => b.fecha?.localeCompare(a.fecha))[0];
        const dias = ultima ? Math.floor((hoy - new Date(ultima.fecha)) / 86400000) : null;
        const totalHistorico = ventas.filter(v => v.cliente === c.nombre).reduce((a, v) => a + Number(v.total || 0), 0);
        return { ...c, ultimaVenta: ultima?.fecha, dias, totalHistorico };
      }).filter(c => c.dias === null || c.dias > 30).sort((a, b) => (b.dias || 9999) - (a.dias || 9999));
      return { tipo: "inactivos", periodo: "Tiempo real", inactivos };
    }
    if (tipoRep === "cobros") {
      const pendientes = cobros.filter(c => !c.pagado).sort((a, b) => a.fechaVence?.localeCompare(b.fechaVence));
      const vencidos = pendientes.filter(c => c.fechaVence && c.fechaVence < today());
      const proximos = pendientes.filter(c => !c.fechaVence || c.fechaVence >= today());
      return { tipo: "cobros", periodo: "Tiempo real", pendientes, vencidos, proximos, totalPendiente: pendientes.reduce((a, c) => a + Number(c.monto || 0), 0) };
    }
  };

  const TIPOS = [
    { id: "ventas",    label: "Ventas",                needsPeriod: true  },
    { id: "recompra",  label: "Recompra (tiempo real)", needsPeriod: false },
    { id: "margenes",  label: "Márgenes por producto",  needsPeriod: true  },
    { id: "inactivos", label: "Clientes inactivos",     needsPeriod: false },
    { id: "cobros",    label: "Cobros pendientes",      needsPeriod: false },
  ];
  const tipoActual = TIPOS.find(t => t.id === tipoRep);
  const rep = vista;
  const txPeriodo = ventas.filter(v => v.fecha >= fechaIni && v.fecha <= fechaFin).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: C.text }}>Reportes</h2>
        <div style={{ fontSize: 12, color: C.textDim }}>Genera y descarga reportes de tu negocio</div>
      </div>

      <Card>
        <div style={{ fontSize: 11, color: C.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Configurar reporte</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Select label="Tipo de reporte" value={tipoRep} onChange={v => { setTipoRep(v); setVista(null); }} options={TIPOS.map(t => ({ value: t.id, label: t.label }))} />
          {tipoActual?.needsPeriod && (
            <div>
              <div style={{ fontSize: 11, color: C.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Período</div>
              <div style={{ display: "flex", gap: 10 }}>
                <Input label="Desde" type="date" value={fechaIni} onChange={v => { setFechaIni(v); setVista(null); }} />
                <Input label="Hasta" type="date" value={fechaFin} onChange={v => { setFechaFin(v); setVista(null); }} />
              </div>
              <div style={{ fontSize: 11, color: C.accent, marginTop: 6 }}>{txPeriodo} transacciones en este período</div>
            </div>
          )}
          {!tipoActual?.needsPeriod && (
            <div style={{ background: C.accentDim, borderRadius: 8, padding: "8px 12px", fontSize: 12, color: C.accent }}>
              Este reporte usa datos en tiempo real — no requiere período
            </div>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <Btn onClick={() => setVista(generarReporte())} style={{ flex: 1 }}><Icon name="trend" size={14} /> Generar reporte</Btn>
            {vista && <Btn variant="ghost" onClick={() => window.print()}><Icon name="send" size={14} /> PDF</Btn>}
          </div>
        </div>
      </Card>

      {rep && (
        <div>
          <Card style={{ background: "#0d2b22", border: `1px solid ${C.green}33`, marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: C.green, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>AJ Medical — Reporte</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginTop: 2 }}>{TIPOS.find(t => t.id === rep.tipo)?.label}</div>
            <div style={{ fontSize: 12, color: C.textDim, marginTop: 2 }}>{rep.periodo}</div>
          </Card>

          {rep.tipo === "ventas" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", gap: 10 }}>
                <StatCard label="Total ventas" value={fMXN(rep.total)} color={C.accent} />
                <StatCard label="Utilidad bruta" value={fMXN(rep.utilidad)} color={C.green} />
              </div>
              <StatCard label="Margen bruto" value={`${rep.margen}%`} color={Number(rep.margen) >= 40 ? C.green : Number(rep.margen) >= 20 ? C.yellow : C.red} sub={`${rep.detalle.length} transacciones`} />
              <Card>
                <div style={{ fontSize: 11, color: C.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Por cliente</div>
                {rep.porCliente.map(([nombre, total]) => <MiniBar key={nombre} label={nombre} value={total} max={rep.porCliente[0]?.[1] || 1} color={C.accent} />)}
              </Card>
              <Card>
                <div style={{ fontSize: 11, color: C.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Por producto</div>
                {rep.porProducto.map(([nombre, total]) => <MiniBar key={nombre} label={nombre} value={total} max={rep.porProducto[0]?.[1] || 1} color={C.blue} />)}
              </Card>
              <Card>
                <div style={{ fontSize: 11, color: C.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Detalle de transacciones</div>
                {rep.detalle.map(v => (
                  <div key={v.id} style={{ padding: "6px 0", borderBottom: `1px solid ${C.border}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{v.producto}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: C.accent }}>{fMXN(v.total)}</span>
                    </div>
                    <div style={{ fontSize: 11, color: C.textDim }}>{fDate(v.fecha)} · {v.cliente} · {v.cantidad} uds</div>
                  </div>
                ))}
              </Card>
            </div>
          )}

          {rep.tipo === "recompra" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {rep.enReorden.length === 0 ? (
                <Card style={{ background: C.green + "18", border: `1px solid ${C.green}44` }}>
                  <div style={{ fontSize: 14, color: C.green, fontWeight: 700, textAlign: "center", padding: 16 }}>✓ Todo el inventario está por encima del punto de reorden</div>
                </Card>
              ) : (<>
                <Card style={{ background: C.orange + "18", border: `1px solid ${C.orange}44` }}>
                  <div style={{ fontSize: 13, color: C.orange, fontWeight: 700 }}>📦 {rep.enReorden.length} producto(s) en punto de recompra ahora mismo</div>
                </Card>
                {rep.enReorden.map(i => (
                  <Card key={i.id} style={{ borderColor: i.critico ? C.red + "88" : C.orange + "55" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{i.nombre}</span>
                          {i.critico ? <Tag color={C.red}>SIN STOCK</Tag> : <Tag color={C.orange}>REORDENAR</Tag>}
                        </div>
                        <div style={{ fontSize: 12, color: C.textDim }}>Stock: <strong style={{ color: i.critico ? C.red : C.orange }}>{i.stock}</strong>{i.puntoReorden && ` · Reorden: ${i.puntoReorden}`}{i.velocidadMes > 0 && ` · Vel: ${i.velocidadMes} uds/mes`}</div>
                      </div>
                      <div style={{ textAlign: "right", marginLeft: 12 }}>
                        <div style={{ fontSize: 10, color: C.textDim }}>Comprar</div>
                        <div style={{ fontSize: 22, fontWeight: 900, color: i.critico ? C.red : C.orange }}>{Math.ceil(i.sugerido)}</div>
                        <div style={{ fontSize: 10, color: C.textDim }}>uds</div>
                        {i.costoUnitario && <div style={{ fontSize: 11, color: C.textDim, marginTop: 2 }}>≈ {fMXN(Math.ceil(i.sugerido) * Number(i.costoUnitario))}</div>}
                      </div>
                    </div>
                  </Card>
                ))}
                <Card style={{ background: C.bg }}>
                  <div style={{ fontSize: 11, color: C.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Costo total estimado de recompra</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: C.accent }}>{fMXN(rep.enReorden.reduce((a, i) => a + (Math.ceil(i.sugerido) * Number(i.costoUnitario || 0)), 0))}</div>
                </Card>
              </>)}
            </div>
          )}

          {rep.tipo === "margenes" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {rep.porProducto.length === 0 ? <Card><div style={{ fontSize: 13, color: C.textDim, textAlign: "center", padding: 20 }}>Sin ventas en este período.</div></Card>
                : rep.porProducto.map(p => (
                  <Card key={p.nombre} style={{ padding: "12px 14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{p.nombre}</div>
                        <div style={{ fontSize: 11, color: C.textDim, marginTop: 2 }}>{p.qty} uds · Venta: {fMXN(p.total)} · Utilidad: {fMXN(p.utilidad)}</div>
                        <div style={{ height: 4, background: C.bg, borderRadius: 2, marginTop: 6, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${Math.min(100, Math.max(0, Number(p.margen)))}%`, background: Number(p.margen) >= 40 ? C.green : Number(p.margen) >= 20 ? C.yellow : C.red, borderRadius: 2 }} />
                        </div>
                      </div>
                      <div style={{ marginLeft: 12, fontSize: 20, fontWeight: 900, color: Number(p.margen) >= 40 ? C.green : Number(p.margen) >= 20 ? C.yellow : C.red }}>{p.margen}%</div>
                    </div>
                  </Card>
                ))}
            </div>
          )}

          {rep.tipo === "inactivos" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Card style={{ background: C.orange + "18", border: `1px solid ${C.orange}44` }}>
                <div style={{ fontSize: 13, color: C.orange, fontWeight: 700 }}>{rep.inactivos.length} cliente(s) sin comprar en +30 días</div>
              </Card>
              {rep.inactivos.map(c => (
                <Card key={c.id} style={{ padding: "12px 14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{c.nombre}</div>
                      <div style={{ fontSize: 11, color: C.textDim }}>Última compra: {c.ultimaVenta ? fDate(c.ultimaVenta) : "Nunca"} · Histórico: {fMXN(c.totalHistorico)}</div>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: C.orange }}>{c.dias ?? "—"} días</div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {rep.tipo === "cobros" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <StatCard label="Total por cobrar" value={fMXN(rep.totalPendiente)} color={C.yellow} sub={`${rep.pendientes.length} cobros pendientes`} />
              {rep.vencidos.length > 0 && (
                <Card style={{ borderColor: C.red + "55" }}>
                  <div style={{ fontSize: 11, color: C.red, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>🔴 Vencidos ({rep.vencidos.length})</div>
                  {rep.vencidos.map(c => (
                    <div key={c.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${C.border}` }}>
                      <div><div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{c.cliente}</div><div style={{ fontSize: 11, color: C.textDim }}>{c.concepto} · Venció: {fDate(c.fechaVence)}</div></div>
                      <span style={{ fontSize: 14, fontWeight: 800, color: C.red }}>{fMXN(c.monto)}</span>
                    </div>
                  ))}
                </Card>
              )}
              {rep.proximos.length > 0 && (
                <Card>
                  <div style={{ fontSize: 11, color: C.yellow, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>🟡 Por vencer ({rep.proximos.length})</div>
                  {rep.proximos.map(c => (
                    <div key={c.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${C.border}` }}>
                      <div><div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{c.cliente}</div><div style={{ fontSize: 11, color: C.textDim }}>{c.concepto}{c.fechaVence ? ` · Vence: ${fDate(c.fechaVence)}` : ""}</div></div>
                      <span style={{ fontSize: 14, fontWeight: 800, color: C.yellow }}>{fMXN(c.monto)}</span>
                    </div>
                  ))}
                </Card>
              )}
            </div>
          )}
        </div>
      )}
      <style>{`@media print { .ajm-sidebar, .ajm-topnav { display: none !important; } }`}</style>
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
  { id: "hospital", label: "Hospitales", icon: "hospital" },
  { id: "calendario", label: "Calendario", icon: "check" },
  { id: "reportes", label: "Reportes", icon: "alert" },
  { id: "chat", label: "Asesor", icon: "chat" },
];

export default function App() {
  const [authed, setAuthed] = useState(() => localStorage.getItem(SESSION_KEY) === "1");
  const [currentUser, setCurrentUser] = useState(() => localStorage.getItem(SESSION_USER_KEY) || "JacoboVera05");
  const [tab, setTab] = useState("home");
  const [ventas, setVentas] = useState([]);
  const [compras, setCompras] = useState([]);
  const [gastos, setGastos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [inventario, setInventario] = useState([]);
  const [cobros, setCobros] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [cotizaciones, setCotizaciones] = useState([]);
  const [settings, setSettings] = useState({ saldoInicial: 0, metaMensual: 3000000 });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      loadData(KEYS.ventas), loadData(KEYS.compras), loadData(KEYS.gastos),
      loadData(KEYS.clientes), loadData(KEYS.inventario), loadData(KEYS.cobros),
      loadData(KEYS.proveedores), loadSettings(), loadData(KEYS.cotizaciones),
    ]).then(([v, c, g, cl, i, co, pr, s, cot]) => {
      setVentas(v); setCompras(c); setGastos(g); setClientes(cl); setInventario(i); setCobros(co); setProveedores(pr);
      setSettings(s); setCotizaciones(cot);
      setLoaded(true);
    });
  }, []);

  if (!authed) return <Login onLogin={(usr) => { setCurrentUser(usr); setAuthed(true); }} />;

  if (!loaded) return (
    <div style={{ background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: C.accent, fontSize: 14 }}>Cargando AJ Medical...</div>
    </div>
  );

  const logout = () => {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_USER_KEY);
    setAuthed(false);
  };

  const userData = USERS[currentUser] || USERS["JacoboVera05"];
  const tabsPermitidas = userData.tabsPermitidas; // null = todas
  const tabsVisibles = tabsPermitidas ? TABS.filter(t => tabsPermitidas.includes(t.id)) : TABS;
  const esAdmin = userData.rol === "admin";

  // Si el tab activo no está permitido para este usuario, ir a home
  const activeTab = tabsVisibles.find(t => t.id === tab) || tabsVisibles[0];

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
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{userData.nombre}</div>
              <div style={{ fontSize: 10, color: C.textDim }}>{esAdmin ? "Administrador" : "Operaciones"}</div>
            </div>
            <button onClick={logout} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 8, padding: "4px 10px", color: C.textDim, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>Salir</button>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: C.accentDim, border: `2px solid ${C.accent}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: C.accent }}>{userData.inicial}</div>
          </div>
        </div>

        {/* Nav — solo tabs permitidas */}
        <div style={{ display: "flex", gap: 4, overflowX: "auto", paddingBottom: 2, scrollbarWidth: "none" }}>
          {tabsVisibles.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "6px 10px",
              background: activeTab?.id === t.id ? C.accentDim : "transparent",
              border: activeTab?.id === t.id ? `1px solid ${C.accent}44` : "1px solid transparent",
              borderRadius: 10, cursor: "pointer", color: activeTab?.id === t.id ? C.accent : C.textDim,
              minWidth: 52, flexShrink: 0, fontFamily: "inherit", transition: "all .15s",
            }}>
              <Icon name={t.icon} size={16} />
              <span style={{ fontSize: 9, fontWeight: 600, whiteSpace: "nowrap" }}>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content — con guard de rol */}
      <div style={{ padding: 16, paddingBottom: 32 }}>
        {/* Guard: si el tab activo no está en tabsPermitidas, mostrar acceso denegado */}
        {tabsPermitidas && !tabsPermitidas.includes(activeTab?.id) ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🔒</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>Acceso restringido</div>
            <div style={{ fontSize: 13, color: C.textDim, marginTop: 6 }}>No tienes permiso para ver esta sección.</div>
          </div>
        ) : (<>
        {activeTab?.id === "home" && <Dashboard ventas={ventas} compras={compras} gastos={gastos} cobros={cobros} inventario={inventario} settings={settings} />}
        {activeTab?.id === "highlights" && esAdmin && <Highlights ventas={ventas} compras={compras} gastos={gastos} clientes={clientes} inventario={inventario} settings={settings} />}
        {activeTab?.id === "ventas" && <Ventas data={ventas} setData={setVentas} clientes={clientes} inventario={inventario} setInventario={setInventario} cobros={cobros} setCobros={setCobros} />}
        {activeTab?.id === "compras" && <Compras data={compras} setData={setCompras} inventario={inventario} setInventario={setInventario} proveedores={proveedores} />}
        {activeTab?.id === "gastos" && <Gastos data={gastos} setData={setGastos} />}
        {activeTab?.id === "clientes" && <Clientes data={clientes} setData={setClientes} ventas={ventas} />}
        {activeTab?.id === "proveedores" && esAdmin && <Proveedores data={proveedores} setData={setProveedores} compras={compras} inventario={inventario} />}
        {activeTab?.id === "inventario" && <Inventario data={inventario} setData={setInventario} ventas={ventas} />}
        {activeTab?.id === "cobros" && <Cobros data={cobros} setData={setCobros} ventas={ventas} setVentas={setVentas} />}
        {activeTab?.id === "hospital" && esAdmin && <CanalHospitalario data={cotizaciones} setData={setCotizaciones} clientes={clientes} inventario={inventario} setInventario={setInventario} ventas={ventas} setVentas={setVentas} cobros={cobros} setCobros={setCobros} />}
        {activeTab?.id === "calendario" && <Calendario ventas={ventas} compras={compras} gastos={gastos} cobros={cobros} inventario={inventario} cotizaciones={cotizaciones} />}
        {activeTab?.id === "reportes" && esAdmin && <Reportes ventas={ventas} compras={compras} gastos={gastos} clientes={clientes} cobros={cobros} inventario={inventario} />}
        {activeTab?.id === "chat" && esAdmin && <ChatClaude ventas={ventas} compras={compras} gastos={gastos} clientes={clientes} inventario={inventario} cobros={cobros} />}
        {activeTab?.id === "config" && esAdmin && <Configuracion settings={settings} setSettings={setSettings} />}
        </>)}
      </div>
    </div>
  );
}
