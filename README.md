

2 ideas

main.py

main2.py
.................

click derecho en main2.py -> abrir con live server

..................

npm i
usar live server

.......
npm install three
npm install -g http-server



-- proximamente

(principal)
texturas
control de velocidad
anillos saturnmop, mejor editados
mas infomacion en los planetas
posision de espectador en el sol
choque de dos planetas para generar luz?
musica
el usuario puede dejar comentarios en los planetas

auroras boreales
estaciones
satelites
otras galaxias
mas lunas, lunas de jupiter

cinturon de asteroides entre marte y jupiter
lluevia de estrellas
nevulosas
supernovas


## Cómo correr el juego

Opción rápida (recomendado):

- Con VS Code, abre `main_juego.html` y usa "Open with Live Server".

Alternativas por terminal (PowerShell):

1) npx http-server

```
cd 'C:\Users\USUARIO\Desktop\Repositorios\universo_juego_cdev'
npx http-server -p 8080
# abre http://localhost:8080/main_juego.html
```

2) Python 3:

```
cd 'C:\Users\USUARIO\Desktop\Repositorios\universo_juego_cdev'
py -m http.server 8080
# abre http://localhost:8080/main_juego.html
```

## Novedades educativas y gameplay

- HUD con Puntos, Vidas, Nivel y Mejor puntaje.
- Dificultad progresiva: la velocidad aumenta por nivel.
- Tokens de conocimiento: recógelos para activar una pregunta corta (quiz).
- Sistema de preguntas: aciertos suman puntos; errores restan 1 vida.
- Pausa/Reanudar y Silencio/Activar sonido (SFX simples con Web Audio).
- Game Over con reinicio y guardado de Mejor puntaje (localStorage).
- Enciclopedia: panel con fichas de planetas y datos clave.

Controles:

- Flechas: mover nave.
- Botones HUD: Pausa, Silencio, Enciclopedia.
- Menú inicial: selecciona modelo de nave.


