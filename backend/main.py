from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd

app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print("Cargando base de datos...")
try:
    df_clientes = pd.read_csv("data/hey_clientes.csv")
    df_clientes = df_clientes.fillna("") 
    print("¡Datos cargados con éxito!")
except Exception as e:
    print(f"Error al cargar los datos: {e}")


@app.get("/")
def ruta_raiz():
    return {"mensaje": "¡El servidor de Havi está corriendo perfecto!"}

@app.get("/api/cliente/{user_id}")
def obtener_cliente(user_id: str):
    cliente = df_clientes[df_clientes['user_id'] == user_id]
    
    if cliente.empty:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    datos_cliente = cliente.to_dict(orient="records")[0]
    return datos_cliente