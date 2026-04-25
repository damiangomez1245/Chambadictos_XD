import React, { useState, useEffect } from "react";

export default function Dashboard() {
  const [cliente, setCliente] = useState(null);

  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState([
    {
      sender: "user",
      text: "¿La tarjeta de crédito Hey Negocios es diferente de la TDC normal?",
    },
    {
      sender: "havi",
      text: "¡Claro! La Tarjeta de Crédito Hey Negocios está diseñada específicamente para personas que tienen un negocio, ofreciendo beneficios adicionales para financiar compras de tu empresa.",
    }
  ]);

  useEffect(() => {
    fetch("http://localhost:8000/api/cliente/USR-00002")
      .then((respuesta) => respuesta.json())
      .then((datos) => {
        console.log("¡Datos recibidos de Python!", datos);
        setCliente(datos); 
      })
      .catch((error) => console.error("Error al conectar con la API:", error));
  }, []);

  const handleSendMessage = () => {
    if (message.trim() !== "") {
      const newUserMsg = { sender: "user", text: message };
      setChatHistory((prev) => [...prev, newUserMsg]);
      setMessage("");

      setTimeout(() => {
        const haviResponse = { 
          sender: "havi", 
          text: "Entiendo tu duda. Por el momento soy un prototipo, pero pronto estaré conectado a la base de datos de Hey Banco para darte una respuesta exacta sobre tus productos." 
        };
        setChatHistory((prev) => [...prev, haviResponse]);
      }, 1000);
    }
  };

  return (
    <div className="flex h-screen w-full bg-gray-50">
      <aside className="w-[30%] bg-white border-r border-gray-200 flex flex-col overflow-y-auto">
        
        <section className="p-6 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Perfil del Cliente
          </h2>
          
          {!cliente ? (
            <div className="text-sm text-gray-500 animate-pulse">Cargando datos desde Python...</div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">ID</span>
                <span className="text-sm font-medium text-gray-900">{cliente.user_id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Edad</span>
                <span className="text-sm font-medium text-gray-900">{cliente.edad} años</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Ocupación</span>
                <span className="text-sm font-medium text-gray-900">{cliente.ocupacion}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Ingreso</span>
                <span className="text-sm font-medium text-gray-900">
                  ${cliente.ingreso_mensual_mxn.toLocaleString()}
                </span>
              </div>
              <div className="pt-2">
                {cliente.es_hey_pro ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-white text-xs font-semibold shadow-sm">
                    <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    Hey Pro Activado
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-200 text-gray-600 text-xs font-semibold shadow-sm">
                    Hey Estándar
                  </span>
                )}
              </div>
            </div>
          )}
        </section>

        <section className="p-6 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Mis Productos (Demo)
          </h2>
          <div className="flex flex-col gap-3">
            <div className="p-4 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl text-white">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-white/10 rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
                    <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
                  </svg>
                </div>
                <span className="text-sm font-medium">Cuenta de Débito</span>
              </div>
              <div className="text-2xl font-bold">$80,954.60</div>
              <div className="text-xs text-gray-400 mt-1">Saldo disponible</div>
            </div>
          </div>
        </section>

      </aside>
      <main className="w-[70%] flex flex-col">
        <header className="bg-gray-900 px-6 py-4 shadow-md z-10">
          <h1 className="text-white text-lg font-semibold flex items-center gap-2">
            Havi - Asistente Financiero Inteligente
            <span className="text-xl">🤖</span>
          </h1>
        </header>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 bg-gray-100">
          {chatHistory.map((msg, index) => (
            <div key={index} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
              <div 
                className={`max-w-[70%] px-4 py-3 shadow-sm ${
                  msg.sender === "user" 
                  ? "bg-blue-600 text-white rounded-2xl rounded-br-md" 
                  : "bg-white border border-gray-200 text-gray-800 rounded-2xl rounded-bl-md"
                }`}
              >
                <p className="text-sm">{msg.text}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 bg-white border-t border-gray-200">
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              placeholder="Escribe tu mensaje a Havi..."
              className="flex-1 px-4 py-3 bg-gray-100 rounded-xl text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
            <button
              onClick={handleSendMessage}
              className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z" />
                <path d="m21.854 2.147-10.94 10.939" />
              </svg>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}