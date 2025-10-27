# Pruebas - Visor de Modelos

Esta carpeta contiene una página de prueba (`index_prueba.html`) y un pequeño visor (`viewer_prueba.js`) para previsualizar los modelos .glb usados en el juego.

Uso rápido (recomendado: abrir con servidor local):

Desde PowerShell en la raíz del proyecto:

```powershell
# Usando Python 3 (si está instalado)
python -m http.server 8000

# o usando npx http-server (si tienes NodeJS y npx disponibles)
npx http-server -p 8000
```

Luego abre en tu navegador:

http://localhost:8000/pruebas/index_prueba.html

Notas:

- Los modelos están en `../assets/models/ships`.
- Si el modelo no carga, revisa la consola del navegador para más detalles.
