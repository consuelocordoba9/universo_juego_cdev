# 🔧 Visor de Modelos 3D - Herramienta de Desarrollo# Pruebas - Visor de Modelos

Esta es una herramienta de desarrollo para previsualizar y probar los modelos 3D de las naves espaciales antes de integrarlos en el juego principal.Esta carpeta contiene una página de prueba (`index_prueba.html`) y un pequeño visor (`viewer_prueba.js`) para previsualizar los modelos .glb usados en el juego.

## 📋 DescripciónUso rápido (recomendado: abrir con servidor local):

El **Visor de Modelos 3D** (`index_prueba.html`) es una aplicación web standalone que permite:Desde PowerShell en la raíz del proyecto:

- 🛸 **Visualizar modelos 3D**: Carga y renderiza los modelos de naves en formato `.glb````powershell

- 🔄 **Rotación interactiva**: Gira los modelos automáticamente o manualmente con el mouse# Usando Python 3 (si está instalado)

- 🎨 **Previsualización en tiempo real**: Ve exactamente cómo se verán las naves en el juegopython -m http.server 8000

- ⚙️ **Ajustes visuales**: Controla la velocidad de rotación y otros parámetros

- 📐 **Inspección detallada**: Examina la geometría, texturas y materiales de cada modelo# o usando npx http-server (si tienes NodeJS y npx disponibles)

npx http-server -p 8000

## 🚀 Cómo Abrir el Visor```

### Método 1: Con Live Server (Recomendado)Luego abre en tu navegador:

1. **Abre con Live Server**:http://localhost:8000/pruebas/index_prueba.html

   - Haz clic derecho en `index_prueba.html`

   - Selecciona "Open with Live Server"Notas:

   - El visor se abrirá automáticamente en tu navegador

- Los modelos están en `../assets/models/ships`.

### Método 2: Con http-server (Node.js)- Si el modelo no carga, revisa la consola del navegador para más detalles.

Desde la raíz del proyecto ejecuta:

```powershell
# Usando npx (si tienes Node.js instalado)
npx http-server -p 8000
```

Luego abre en tu navegador:

```
http://localhost:8000/pruebas/index_prueba.html
```

### Método 3: Con Python

Desde la raíz del proyecto ejecuta:

```powershell
# Python 3
python -m http.server 8000
```

Luego abre en tu navegador:

```
http://localhost:8000/pruebas/index_prueba.html
```

⚠️ **Importante**: No abras el archivo HTML directamente desde el explorador de archivos, ya que causará errores CORS. Siempre usa un servidor local.

## 🎮 Cómo Usar el Visor

### Controles e Interfaz:

1. **Selector de Modelo**:

   - Usa el menú desplegable "Elegir modelo de nave"
   - Opciones disponibles:
     - Nave de exploración (ship1.glb)
     - Ovni (ship2.glb)
     - Cohete (ship3.glb)
   - El modelo se cargará automáticamente al seleccionarlo

2. **Panel de Opciones**:

   - **Botón "Ocultar"**: Esconde el panel para una vista sin obstáculos
   - **Información de estado**: Muestra si el modelo se cargó correctamente
   - **Controles de visualización**: (según implementación)

3. **Vista del Modelo**:
   - Los modelos rotan automáticamente en 360°
   - Fondo espacial oscuro para mejor visualización
   - Iluminación optimizada para resaltar detalles

## 📁 Estructura de Archivos

```
pruebas/
├── index_prueba.html        # Visor principal de modelos 3D
├── viewer_prueba.js         # Lógica del visor (si existe)
└── README.md               # Esta documentación
```

### Modelos Referenciados:

El visor carga modelos desde la carpeta:

```
../assets/models/ships/
├── ship1.glb              # Nave de exploración
├── ship2.glb              # Ovni (desbloqueable en el juego)
└── ship3.glb              # Cohete
```

## 🛠️ Funcionalidades Técnicas

### Tecnologías Utilizadas:

- **Three.js** (v0.128.0) - Motor de renderizado 3D
- **GLTFLoader** - Cargador de modelos `.glb` / `.gltf`
- **WebGLRenderer** - Renderizado acelerado por GPU
- **ES6 Modules** - Arquitectura modular
- **Import Maps** - Resolución de dependencias

### Características del Renderizado:

- **Iluminación realista**:

  - Luz ambiental para visibilidad uniforme
  - Luz direccional para definir volúmenes
  - Configuración optimizada para modelos espaciales

- **Cámara configurada**:

  - Campo de visión (FOV) optimizado
  - Posición automática según tamaño del modelo
  - Aspecto responsivo al tamaño de ventana

- **Ambiente espacial**:
  - Fondo oscuro (#0a0a12) simulando el espacio
  - Sin estrellas para mejor visualización del modelo
  - Estilo consistente con el juego principal

## 📐 Especificaciones de Modelos

### Formato Requerido:

- **Formato**: `.glb` (GLTF Binary 2.0)
- **Unidades**: Metros (recomendado para escala)
- **Orientación**: Y-up axis (estándar Three.js)
- **Texturas**: Embebidas en el archivo `.glb`
- **Materiales**: PBR (Physically Based Rendering)

### Buenas Prácticas:

- **Geometría**: Mantén los polígonos bajo control (< 50k triángulos)
- **Texturas**: Usa resoluciones razonables (1024x1024 o 2048x2048)
- **Nombres**: Usa nombres descriptivos para objetos y materiales
- **Limpieza**: Elimina geometría oculta o duplicada antes de exportar

## 🔍 Casos de Uso

### 1. Verificación de Assets Nuevos

Antes de integrar una nave al juego:

- ✅ Verifica que el modelo carga sin errores
- ✅ Comprueba que las texturas se ven correctamente
- ✅ Evalúa la escala y proporciones
- ✅ Confirma la orientación del modelo

### 2. Testing y Debugging

Identifica y corrige problemas:

- 🐛 Normales invertidas (superficies oscuras)
- 🐛 Texturas faltantes o incorrectas
- 🐛 Problemas de escala
- 🐛 Errores en la jerarquía de objetos

### 3. Documentación y Presentación

- 📸 Captura screenshots para documentación
- 📸 Muestra modelos al equipo
- 📸 Crea material de referencia

### 4. Comparación de Versiones

- 🔄 Compara diferentes iteraciones de un modelo
- 🔄 Evalúa cambios en texturas o geometría
- 🔄 Valida exportaciones desde Blender u otro software 3D



### Ajustar Iluminación

En el código JavaScript del visor:

```javascript
// Luz ambiental (iluminación general)
const ambient = new THREE.AmbientLight(0x404040, 2); // color, intensidad

// Luz direccional (iluminación focal)
const directional = new THREE.DirectionalLight(0xffffff, 1.5); // color, intensidad
```

### Modificar Velocidad de Rotación

Dentro del loop de animación:

```javascript
if (loadedModel) {
  loadedModel.rotation.y += 0.01; // Ajusta este valor (más alto = más rápido)
}
```

### Cambiar Posición de Cámara

```javascript
camera.position.set(0, 1, 5); // x, y, z (distancia y ángulo)
camera.lookAt(0, 0, 0); // punto al que mira la cámara
```

## 📚 Recursos Útiles

- [Three.js Documentation](https://threejs.org/docs/)
- [GLTF Format Specification](https://github.com/KhronosGroup/glTF)
- [Blender to Three.js Guide](https://threejs.org/docs/#manual/en/introduction/Loading-3D-models)
- [Online GLTF Viewer](https://gltf-viewer.donmccurdy.com/)
- [Three.js Examples](https://threejs.org/examples/)

## 💡 Tips para Mejores Resultados

1. **Exporta desde Blender con estos ajustes**:

   - Format: glTF Binary (.glb)
   - Include: Selected Objects (si solo quieres la nave)
   - Transform: +Y Up
   - Geometry: Apply Modifiers ✓

2. **Optimiza texturas antes de exportar**:

   - Empaqueta todas las texturas en el .blend
   - Usa compresión JPEG para texturas difusas
   - Mantén resoluciones potencia de 2 (512, 1024, 2048)

3. **Limpia tu modelo**:

   - Elimina vértices duplicados
   - Merge by distance
   - Elimina caras internas
   - Aplica todas las transformaciones

4. **Prueba en el visor antes del juego**:
   - Carga siempre el modelo aquí primero
   - Verifica desde todos los ángulos
   - Confirma que todo se ve como esperas

---