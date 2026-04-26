import React, { useState, useEffect } from "react";

export default function Dashboard() {
  const [busqueda, setBusqueda] = useState("USR-00001");
  const [idActual, setIdActual] = useState("USR-00001");
  const [cliente, setCliente] = useState(null);
  
  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState([
    { sender: "havi", text: "¡Hola! Soy Havi, tu asistente financiero impulsado por IA. ¿En qué te ayudo?" }
  ]);

  const [mostrarPopup, setMostrarPopup] = useState(false);
  const [prediccion, setPrediccion] = useState(null);

  useEffect(() => {
    fetch(`http://localhost:8000/api/cliente/${idActual}`)
      .then((res) => res.json())
      .then((data) => setCliente(data))
      .catch((err) => console.error("Error:", err));
  }, [idActual]);

  useEffect(() => {
    setMostrarPopup(false); 
    
    const timer = setTimeout(() => {
      fetch(`http://localhost:8000/api/prediccion/${idActual}`)
        .then((res) => res.json())
        .then((data) => {
          setPrediccion(data);
          setMostrarPopup(true);
        })
        .catch((err) => console.error("Error IA:", err));
    }, 3500); 

    return () => clearTimeout(timer);
  }, [idActual]);

  const handleSendMessage = () => {
    if (message.trim()) {
      setChatHistory([...chatHistory, { sender: "user", text: message }]);
      setMessage("");
      setTimeout(() => {
        setChatHistory(prev => [...prev, { sender: "havi", text: "Procesando tu solicitud usando nuestro modelo de IA..." }]);
      }, 1000);
    }
  };

  return (
    <div className="flex h-screen w-full bg-slate-50 relative font-sans text-slate-900">
      
      {mostrarPopup && prediccion && (
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-300 border border-indigo-100">
            <div className="flex justify-between items-start mb-4">
              <div className="bg-indigo-100 p-2 rounded-lg text-indigo-700 font-bold flex items-center gap-2">
                <span className="animate-pulse h-2 w-2 bg-indigo-600 rounded-full"></span>
                Insight Predictivo VRNN
              </div>
              <button onClick={() => setMostrarPopup(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <p className="text-sm text-slate-600 mb-4">{prediccion.mensaje}</p>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-5 shadow-inner">
              <div className="flex justify-between text-xs text-slate-500 mb-2 uppercase tracking-wider">
                <span>Comercio / Categoría</span>
                <span>Monto Est.</span>
              </div>
              <div className="flex justify-between font-bold text-sm items-end">
                <span className="text-indigo-900">{prediccion.comercio}</span>
                <span className="text-lg text-green-600">{prediccion.monto_estimado}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setMostrarPopup(false)} className="flex-1 bg-slate-100 text-slate-600 py-2.5 rounded-xl font-bold hover:bg-slate-200 text-sm">Ignorar</button>
              <button onClick={() => setMostrarPopup(false)} className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl font-bold hover:bg-indigo-700 shadow-md text-sm">Separar Fondeo</button>
            </div>
          </div>
        </div>
      )}

      <div className="absolute top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 flex items-center px-6 justify-between z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-inner">H</div>
          <h1 className="font-bold text-slate-800 text-lg">Havi</h1>
        </div>
        <div className="flex items-center gap-2">
          <input 
            type="text" 
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && setIdActual(busqueda)}
            placeholder="Buscar ID (ej: USR-00002)"
            className="bg-slate-100 border border-slate-200 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 w-56 outline-none transition-all"
          />
          <button 
            onClick={() => setIdActual(busqueda)}
            className="bg-slate-900 text-white text-xs px-4 py-2.5 rounded-lg font-bold hover:bg-slate-800 transition-colors shadow-sm"
          >
            CARGAR DATOS
          </button>
        </div>
      </div>

      <aside className="w-[30%] bg-white border-r border-slate-200 flex flex-col pt-16 h-full shadow-[4px_0_24px_-15px_rgba(0,0,0,0.1)] z-0">
        <div className="p-6 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Perfil del Cliente</h2>
            <span className="bg-indigo-100 text-indigo-700 border border-indigo-200 text-[10px] px-2.5 py-1 rounded-md font-bold shadow-sm">
              CLUSTER {cliente?.cluster || "..."}
            </span>
          </div>

          {!cliente ? (
            <div className="space-y-4 animate-pulse mt-4">
              <div className="h-4 bg-slate-100 rounded w-full"></div>
              <div className="h-4 bg-slate-100 rounded w-3/4"></div>
              <div className="h-4 bg-slate-100 rounded w-1/2"></div>
            </div>
          ) : (
            <div className="space-y-4 fade-in">
              <div className="grid grid-cols-1 gap-1">
                <InfoRow label="ID Usuario" value={cliente.user_id} />
                <InfoRow label="Ingreso Mensual" value={`$${Number(cliente.ingreso_mensual_n || cliente.ingreso_mensual_neto || cliente.ingreso_mensual_mxn || 0).toLocaleString('es-MX')} MXN`} highlight />
                <InfoRow label="Score Buró" value={Math.round(cliente.score_buro || 0)} />
                <InfoRow label="Utilización Crédito" value={`${((cliente.utilizacion_pct || 0.45) * 100).toFixed(1)}%`} alert={(cliente.utilizacion_pct || 0.45) > 0.7} />
                <InfoRow label="Días sin Actividad" value={`${cliente.dias_desde_u || cliente.dias_desde_ultimo_movimiento || 0} días`} />
                <InfoRow label="Productos Activos" value={cliente.num_producto || cliente.num_productos_activos || 0} />
              </div>

              <div className="mt-8 space-y-3">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase">Servicios Activos</h3>
                <div className="grid grid-cols-2 gap-2">
                  <StatusTag label="Hey Pro" active={cliente.es_hey_pro === 1 || String(cliente.es_hey_pro).toLowerCase() === 'true'} />
                  <StatusTag label="Seguro" active={cliente.tiene_seguro === 1 || String(cliente.tiene_seguro).toLowerCase() === 'true'} />
                  <StatusTag label="Nómina" active={cliente.nomina_domi === 1 || cliente.nomina_domiciliada === 1} />
                  <StatusTag label="Remesas" active={cliente.recibe_remes === 1 || cliente.recibe_remesas === 1} />
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>

      <main className="flex-1 flex flex-col pt-16 bg-[#f8fafc]">
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {chatHistory.map((msg, i) => (
            <div key={i} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"} animate-in slide-in-from-bottom-2`}>
              <div className={`max-w-[75%] p-4 rounded-2xl shadow-sm text-sm leading-relaxed ${
                msg.sender === "user" 
                  ? "bg-indigo-600 text-white rounded-tr-none" 
                  : "bg-white border border-slate-200 text-slate-700 rounded-tl-none"
              }`}>
                {msg.text}
              </div>
            </div>
          ))}
        </div>

        <div className="p-6 bg-white border-t border-slate-200">
          <div className="flex gap-3 max-w-4xl mx-auto">
            <input 
              type="text" 
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Pregúntale a Havi sobre inversiones, créditos o análisis..."
              className="flex-1 bg-slate-100 border border-slate-200 rounded-xl px-5 py-3 focus:ring-2 focus:ring-indigo-500 focus:bg-white text-sm outline-none transition-all"
            />
            <button 
              onClick={handleSendMessage} 
              className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-md flex items-center justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

function InfoRow({ label, value, highlight, alert }) {
  return (
    <div className="flex justify-between items-center py-2.5 border-b border-slate-100 last:border-0">
      <span className="text-xs text-slate-500 font-medium">{label}</span>
      <span className={`text-sm font-bold ${highlight ? 'text-green-600' : alert ? 'text-red-500' : 'text-slate-800'}`}>
        {value}
      </span>
    </div>
  );
}

function StatusTag({ label, active }) {
  return (
    <div className={`flex items-center justify-between px-3 py-2 rounded-xl border text-[10px] font-bold shadow-sm transition-colors ${
      active ? 'bg-green-50 border-green-200 text-green-700' : 'bg-slate-50 border-slate-200 text-slate-400'
    }`}>
      <span>{label}</span>
      <div className={`w-2 h-2 rounded-full ${active ? 'bg-green-500' : 'bg-slate-300'}`}></div>
    </div>
  );
}