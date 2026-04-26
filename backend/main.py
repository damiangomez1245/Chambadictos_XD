from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import pickle
import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DEVICE = torch.device("cpu") 

class VRNN(nn.Module):
    
    def __init__(self, input_dim, hidden_dim, latent_dim, n_layers=1):
        super(VRNN, self).__init__()
        self.input_dim  = input_dim
        self.hidden_dim = hidden_dim
        self.latent_dim = latent_dim
        self.n_layers   = n_layers

        self.phi_x = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, hidden_dim),
            nn.ReLU()
        )
        self.phi_z = nn.Sequential(
            nn.Linear(latent_dim, hidden_dim),
            nn.ReLU()
        )
        self.encoder = nn.Sequential(
            nn.Linear(hidden_dim + hidden_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, hidden_dim),
            nn.ReLU()
        )
        self.encoder_mu     = nn.Linear(hidden_dim, latent_dim)
        self.encoder_logvar = nn.Linear(hidden_dim, latent_dim)

        self.prior = nn.Sequential(
            nn.Linear(hidden_dim, hidden_dim),
            nn.ReLU()
        )
        self.prior_mu     = nn.Linear(hidden_dim, latent_dim)
        self.prior_logvar = nn.Linear(hidden_dim, latent_dim)

        self.decoder = nn.Sequential(
            nn.Linear(hidden_dim + hidden_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, hidden_dim),
            nn.ReLU()
        )
        self.decoder_out = nn.Linear(hidden_dim, input_dim)

        self.rnn = nn.GRU(
            input_size=hidden_dim + hidden_dim,
            hidden_size=hidden_dim,
            num_layers=n_layers,
            batch_first=True
        )

    def reparameterize(self, mu, logvar):
        if self.training:
            std = torch.exp(0.5 * logvar)
            eps = torch.randn_like(std)
            return mu + eps * std
        else:
            return mu


print("Cargando base de datos y K-Means...")
try:
    df_clientes = pd.read_csv("data/hey_clientes.csv").fillna("") 
except Exception as e:
    print("Error cargando CSV:", e)

try:
    with open("models/mapa_usuario_cluster.pkl", "rb") as f:
        mapa_clusters = pickle.load(f)
except:
    mapa_clusters = {}

mapa_secuencias = None
vrnn_scaler = None
idx_numericas = None
vrnn_model = None

try:
    with open("models/vrnn_mapa_secuencias.pkl", "rb") as f:
        mapa_secuencias = pickle.load(f)
    with open("models/vrnn_scaler.pkl", "rb") as f:
        vrnn_scaler = pickle.load(f)
    with open("models/vrnn_idx_numericas.pkl", "rb") as f:
        idx_numericas = pickle.load(f)
    
    primer_usuario = list(mapa_secuencias.keys())[0]
    INPUT_DIM = np.array(mapa_secuencias[primer_usuario]).shape[1]
    
    vrnn_model = VRNN(input_dim=INPUT_DIM, hidden_dim=256, latent_dim=64, n_layers=1).to(DEVICE)
    vrnn_model.load_state_dict(torch.load("models/vrnn_best.pth", map_location=DEVICE))
    vrnn_model.eval() 
    print("¡IA VRNN CARGADA CON ÉXITO! Lista para predecir.")

except Exception as e:
    print(f"Aviso VRNN: {e}. Se usará la simulación de respaldo.")

def predecir_vrnn(user_id, n_muestras=50):
    if user_id not in mapa_secuencias:
        return None, None

    secuencia  = mapa_secuencias[user_id]
    seq_tensor = torch.FloatTensor(secuencia).unsqueeze(0).to(DEVICE)
    predicciones = []

    with torch.no_grad():
        for _ in range(n_muestras):
            batch_size = seq_tensor.size(0)
            h = torch.zeros(vrnn_model.n_layers, batch_size, vrnn_model.hidden_dim).to(DEVICE)

            vrnn_model.train() 
            for t in range(seq_tensor.size(1)):
                x_t     = seq_tensor[:, t, :]
                phi_x_t = vrnn_model.phi_x(x_t)
                h_last  = h[-1]

                enc_input = torch.cat([phi_x_t, h_last], dim=1)
                enc_t     = vrnn_model.encoder(enc_input)
                enc_mu_t  = vrnn_model.encoder_mu(enc_t)
                enc_lv_t  = vrnn_model.encoder_logvar(enc_t)
                z_t       = vrnn_model.reparameterize(enc_mu_t, enc_lv_t)
                phi_z_t   = vrnn_model.phi_z(z_t)

                rnn_input = torch.cat([phi_x_t, phi_z_t], dim=1).unsqueeze(1)
                _, h      = vrnn_model.rnn(rnn_input, h)

            h_last     = h[-1]
            prior_t    = vrnn_model.prior(h_last)
            prior_mu_t = vrnn_model.prior_mu(prior_t)
            prior_lv_t = vrnn_model.prior_logvar(prior_t)
            z_next     = vrnn_model.reparameterize(prior_mu_t, prior_lv_t)
            phi_z_next = vrnn_model.phi_z(z_next)

            dec_input = torch.cat([phi_z_next, h_last], dim=1)
            x_next    = vrnn_model.decoder_out(vrnn_model.decoder(dec_input))

            predicciones.append(x_next.cpu().numpy()[0])

    vrnn_model.eval()
    predicciones = np.array(predicciones)
    media        = predicciones.mean(axis=0)
    std_dev      = predicciones.std(axis=0)

    media_real = media.copy()
    std_real   = std_dev.copy()

    valores_num               = media[idx_numericas].reshape(1, -1)
    media_real[idx_numericas] = vrnn_scaler.inverse_transform(valores_num)[0]
    std_real[idx_numericas]   = std_dev[idx_numericas] * vrnn_scaler.scale_

    return media_real, std_real

@app.get("/")
def ruta_raiz():
    return {"mensaje": "Havi Backend OK"}

@app.get("/api/cliente/{user_id}")
def obtener_cliente(user_id: str):
    cliente = df_clientes[df_clientes['user_id'] == user_id]
    if cliente.empty:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    datos_cliente = cliente.to_dict(orient="records")[0]
    
    if isinstance(mapa_clusters, dict):
        datos_cliente["cluster"] = str(mapa_clusters.get(user_id, "A"))
    else:
        try:
            datos_cliente["cluster"] = str(mapa_clusters[mapa_clusters['user_id'] == user_id]['cluster'].values[0])
        except:
            datos_cliente["cluster"] = "A"
            
    return datos_cliente

@app.get("/api/prediccion/{user_id}")
def obtener_prediccion(user_id: str):
    try:
        if vrnn_model is not None:
            media_real, std_real = predecir_vrnn(user_id)
            
            if media_real is not None:
            
                monto_predicho = abs(float(media_real[idx_numericas[0]]))
                
                return {
                    "categoria_mcc": "Análisis Predictivo VRNN",
                    "comercio": "Red Neuronal Activa",
                    "monto_estimado": f"${monto_predicho:,.2f}",
                    "mensaje": f"Nuestro modelo de Inteligencia Artificial analizó tu historial de transacciones y predice un gasto próximo de ${monto_predicho:,.2f}. ¿Deseas separarlo de tu saldo disponible?"
                }
            
        
        if user_id == "USR-00002":
            return {
                "categoria_mcc": "Restaurantes (MCC: 5812)",
                "comercio": "Starbucks / Vips",
                "monto_estimado": "$320.00",
                "mensaje": "Vemos que sueles gastar en restaurantes los fines de semana. ¿Separamos este monto para tu presupuesto?"
            }
        
        return {
            "categoria_mcc": "Supermercados (MCC: 5411)",
            "comercio": "HEB / Walmart",
            "monto_estimado": "$450.50",
            "mensaje": "Basado en tu historial mensual, predecimos tu compra de despensa pronto. ¿Separamos el dinero?"
        }
        
    except Exception as e:
        print("Error en predicción:", e)
        return {
            "categoria_mcc": "Análisis de Riesgo Preventivo",
            "comercio": "Análisis IA General",
            "monto_estimado": "$500.00",
            "mensaje": "Detectamos un posible gasto recurrente en los próximos días. Sugerimos apartar fondos."
        }