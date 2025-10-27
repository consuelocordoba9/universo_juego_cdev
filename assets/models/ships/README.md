# Modelos de Naves

Coloca aquí los modelos 3D de las naves en formato .glb o .gltf

## Estructura requerida:

```
assets/models/ships/
├── ship1.glb          # Nave Explorador
├── ship2.glb          # Nave Crucero
├── ship3.glb          # Nave Carguero
└── README.md
```

## Nombres de archivo:

- **ship1.glb** o **ship1.gltf** - Nave Explorador (rápida)
- **ship2.glb** o **ship2.gltf** - Nave Crucero (equilibrada)
- **ship3.glb** o **ship3.gltf** - Nave Carguero (resistente)

## Recomendaciones:

- Tamaño óptimo: entre 1-5 unidades de Three.js
- Orientación: La nave debe "mirar" hacia el eje -Z
- Formato preferido: .glb (es más compacto que .gltf)
- Peso máximo recomendado: 5MB por modelo

Si no hay modelos, el juego usará las naves geométricas predeterminadas.
