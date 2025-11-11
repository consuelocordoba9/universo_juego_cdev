# 🚀 Viaje Espacial - Juego Educativo del Sistema Solar

Un juego 3D interactivo donde piloteas una nave espacial a través del sistema solar, aprendiendo sobre los planetas mientras completas misiones de exploración.

## 🎮 Descripción del Juego

**Viaje Espacial** es un juego educativo en 3D donde debes visitar los 8 planetas del sistema solar en el orden correcto. Pilota tu nave espacial esquivando planetas incorrectos mientras aprendes información fascinante sobre cada cuerpo celeste.

### Características Principales:

- 🌍 **8 Planetas Únicos**: Mercurio, Venus, Tierra, Marte, Júpiter, Saturno, Urano y Neptuno
- 🛸 **3 Naves Desbloqueables**: Comienza con naves básicas y desbloquea el Ovni completando el juego
- 💝 **Plutón Curativo**: Encuentra a Plutón (planeta enano) para recuperar vidas perdidas
- 🎵 **Sistema de Audio Completo**: Música ambiental, efectos de sonido y audio inmersivo
- 📚 **Contenido Educativo**: Aprende datos reales sobre cada planeta al visitarlo
- ⭐ **Gráficos 3D**: Texturas realistas, efectos de partículas y atmósferas planetarias

### Mecánicas de Juego:

- **Sistema de Vidas**: Comienzas con 3 vidas (corazones)
- **Objetivos Aleatorios**: Los planetas se presentan en orden aleatorio cada partida
- **Colisión Correcta**: Choca con el planeta objetivo para aprender sobre él (+1 punto)
- **Colisión Incorrecta**: Choca con el planeta equivocado y pierdes 1 vida
- **Plutón Especial**: Aparece ocasionalmente y te cura +1 vida (máximo 3)
- **Victoria**: Completa los 8 planetas para ganar y desbloquear el Ovni
- **Derrota**: Perder todas las vidas termina el juego

## 🚀 Cómo Abrir el Juego

### Método 1: Con Live Server (Recomendado)

1. **Instala las dependencias**:

   ```bash
   npm install
   ```

2. **Abre con Live Server**:
   - Haz clic derecho en `main_juego.html`
   - Selecciona "Open with Live Server"
   - El juego se abrirá automáticamente en tu navegador

### Método 2: Con http-server

1. **Instala http-server globalmente**:

   ```bash
   npm install -g http-server
   ```

2. **Ejecuta el servidor**:

   ```bash
   http-server
   ```

3. **Abre el navegador**:
   - Ve a `http://localhost:8080/main_juego.html`

### Método 3: Directamente en el Navegador

⚠️ **Nota**: Algunos navegadores pueden bloquear recursos por políticas CORS. Usa Live Server o http-server para evitar problemas.

## 🎮 Controles

- **↑ Flecha Arriba**: Mover nave hacia arriba
- **↓ Flecha Abajo**: Mover nave hacia abajo
- **← Flecha Izquierda**: Mover nave hacia la izquierda
- **→ Flecha Derecha**: Mover nave hacia la derecha

## 📁 Estructura del Proyecto

```
universo_juego_cdev/
├── main_juego.html          # Archivo principal del juego
├── main_juego.js            # Lógica principal del juego
├── style.css                # Estilos del juego
├── assets/
│   ├── models/
│   │   ├── ships/           # Modelos 3D de naves (.glb)
│   │   └── previews/        # Imágenes de vista previa de naves
│   └── backgrounds/         # Videos y fondos
├── textures/                # Texturas de planetas (.jpg, .webp)
├── sonidos/                 # Efectos de sonido y música
├── src/
│   ├── audio/
│   │   └── soundManager.js  # Sistema de gestión de audio
│   └── ship/
│       ├── shipManager.js   # Cargador de modelos 3D
│       └── shipConfig.js    # Configuración de naves
└── pruebas/                 # Herramientas de desarrollo
    └── index_prueba.html    # Visor de modelos 3D
```

## 🔊 Sonidos Necesarios

Coloca los siguientes archivos de audio en la carpeta `sonidos/`:

- `movimiento.mp3` - Sonido al mover la nave
- `exposion.mp3` - Sonido de colisión incorrecta
- `fondoMenu.mp3` - Música del menú principal
- `sonidoNave.mp3` - Sonido ambiental de la nave
- `cuentaRegresiva.mp3` - Cuenta regresiva (usa beeps sintéticos si no existe)
- `victoria.mp3` - Sonido de victoria
- `derrota.mp3` - Sonido de derrota
- `choqueexito.mp3` - Sonido de colisión correcta
- `curacion.mp3` - Sonido de curación con Plutón

## 🎨 Texturas de Planetas

Las texturas deben estar en la carpeta `textures/`:

- `mercury.jpg` - Mercurio
- `venus.jpg` - Venus
- `earth.jpg` - Tierra
- `mars.jpg` - Marte
- `jupiter.jpg` - Júpiter
- `saturn.jpg` - Saturno
- `uranus.jpg` - Urano
- `neptune.jpg` - Neptuno
- `pluton.webp` - Plutón

## 🛸 Modelos 3D de Naves

Coloca los modelos en formato `.glb` en `assets/models/ships/`:

- `ship1.glb` - Nave de exploración (desbloqueada)
- `ship2.glb` - Ovni (se desbloquea al completar el juego)
- `ship3.glb` - Cohete (desbloqueada)

## 🛠️ Tecnologías Utilizadas

- **Three.js** (v0.128.0) - Motor de renderizado 3D
- **WebGL** - Gráficos acelerados por hardware
- **Web Audio API** - Sistema de audio avanzado
- **HTML5 Canvas** - Renderizado en tiempo real
- **ES6 Modules** - Arquitectura modular
- **GLB/GLTF** - Formato de modelos 3D

## 🎓 Objetivos Educativos

El juego enseña:

- Características únicas de cada planeta
- Orden y composición del sistema solar
- Diferencias entre planetas rocosos y gigantes gaseosos
- Datos científicos reales de astronomía
- Coordinación mano-ojo y toma de decisiones rápidas

## 📝 Notas de Desarrollo

- El Ovni (ship2) se desbloquea al completar el juego por primera vez
- El desbloqueo se guarda en `sessionStorage` (se resetea al recargar la página)
- Plutón aparece con menor frecuencia (70% de probabilidad) y con aura roja distintiva
- El juego incluye un sistema de velocidad ajustable desde el menú
- Todas las colisiones pausan el juego temporalmente para mostrar información

## 🔧 Herramientas de Desarrollo

### 🔬 Visor de Modelos 3D (Enciclopedia de Naves)

El proyecto incluye una herramienta interactiva para previsualizar y probar los modelos 3D de las naves antes de integrarlos al juego.

**📍 Ubicación**: `pruebas/index_prueba.html`

**🚀 Cómo Abrirlo**:

1. **Con Live Server** (Método más rápido):

   - Navega a la carpeta `pruebas/`
   - Haz clic derecho en `index_prueba.html`
   - Selecciona "Open with Live Server"

2. **Con http-server**:

   ```powershell
   npx http-server -p 8000
   ```

   Luego abre: `http://localhost:8000/pruebas/index_prueba.html`

3. **Con Python**:
   ```powershell
   python -m http.server 8000
   ```
   Luego abre: `http://localhost:8000/pruebas/index_prueba.html`

**✨ Funcionalidades del Visor**:

- 🛸 **Visualización 3D interactiva** de todos los modelos de naves
- 🔄 **Rotación automática** para ver el modelo desde todos los ángulos
- 📐 **Inspección detallada** de geometría, texturas y materiales
- ⚙️ **Selector de modelos** con menú desplegable:
  - Nave de exploración (ship1.glb)
  - Ovni (ship2.glb)
  - Cohete (ship3.glb)
- 🎨 **Renderizado profesional** con iluminación optimizada
- 👁️ **Vista previa exacta** de cómo se verán en el juego

**📚 Documentación Completa**:

Para más detalles sobre el visor, configuración avanzada, solución de problemas y tips de exportación desde Blender, consulta:

```
pruebas/README.md
```

**🎯 Casos de Uso**:

- ✅ Verificar modelos nuevos antes de integrarlos
- ✅ Detectar problemas de texturas o geometría
- ✅ Comparar diferentes versiones de un modelo
- ✅ Documentar visualmente los assets 3D
- ✅ Probar exportaciones desde Blender

⚠️ **Nota**: El visor es una herramienta de desarrollo y no forma parte del juego jugable.
