// Datos de planetas para la enciclopedia y el juego
// Mantén rutas relativas a la raíz del proyecto (main_juego.html)

export const planetData = [
  {
    name: "Mercurio",
    size: 0.5,
    texture: "./textures/mercury.jpg",
    info: "Mercurio es el planeta más cercano al Sol y el más pequeño del sistema solar.",
    more: "Su superficie está llena de cráteres y presenta enormes variaciones de temperatura entre el día y la noche al carecer de una atmósfera densa.",
    stats: {
      distanceAU: 0.39, radiusKm: 2439.7, mass10e24kg: 0.330,
      dayHours: 1407.6, yearDays: 88, moons: 0, tempC: "−173 a 427"
    },
    facts: [
      "No tiene lunas.",
      "Su día solar es más largo que su año.",
      "Presenta escarpes gigantes causados por su enfriamiento."
    ]
  },
  {
    name: "Venus",
    size: 0.8,
    texture: "./textures/venus.jpg",
    info: "Venus es el planeta más caliente por su efecto invernadero desbocado.",
    more: "Su densa atmósfera de CO₂ y nubes de ácido sulfúrico atrapan el calor. Rota en sentido retrógrado y muy lentamente.",
    stats: {
      distanceAU: 0.72, radiusKm: 6051.8, mass10e24kg: 4.87,
      dayHours: 5832.5, yearDays: 224.7, moons: 0, tempC: "≈ 462"
    },
    facts: [
      "Brilla como ‘lucero’ al amanecer o atardecer.",
      "Rota al revés que la mayoría de planetas.",
      "Su presión en superficie es 90 veces la terrestre."
    ]
  },
  {
    name: "Tierra",
    size: 0.9,
    texture: "./textures/earth.jpg",
    info: "Nuestro hogar, el único planeta con vida confirmada.",
    more: "Posee agua líquida abundante, campo magnético protector y una atmósfera rica en oxígeno y nitrógeno.",
    stats: {
      distanceAU: 1.0, radiusKm: 6371, mass10e24kg: 5.97,
      dayHours: 24, yearDays: 365.25, moons: 1, tempC: "−88 a 58"
    },
    facts: [
      "El 71% de su superficie está cubierta por océanos.",
      "La Luna estabiliza su eje de rotación.",
      "El campo magnético desvía el viento solar."
    ]
  },
  {
    name: "Marte",
    size: 0.7,
    texture: "./textures/mars.jpg",
    info: "Marte, el planeta rojo, tiene una atmósfera delgada.",
    more: "Alberga el volcán más grande del sistema solar (Monte Olimpo) y antiguas evidencias de agua líquida.",
    stats: {
      distanceAU: 1.52, radiusKm: 3389.5, mass10e24kg: 0.642,
      dayHours: 24.6, yearDays: 687, moons: 2, tempC: "−125 a 20"
    },
    facts: [
      "Sus lunas se llaman Fobos y Deimos.",
      "Las tormentas de polvo pueden envolver todo el planeta.",
      "Numeras misiones buscan rastros de vida pasada."
    ]
  },
  {
    name: "Júpiter",
    size: 1.2,
    texture: "./textures/jupiter.jpg",
    info: "El planeta más grande: un gigante gaseoso.",
    more: "La Gran Mancha Roja es una tormenta gigantesca milenaria. Su sistema de lunas es como un ‘mini sistema solar’.",
    stats: {
      distanceAU: 5.20, radiusKm: 69911, mass10e24kg: 1898,
      dayHours: 9.9, yearDays: 4331, moons: 95, tempC: "≈ −145"
    },
    facts: [
      "Ío, Europa, Ganímedes y Calisto son lunas destacadas.",
      "Su intenso campo magnético es el más fuerte de los planetas.",
      "Emite más calor del que recibe del Sol."
    ]
  },
  {
    name: "Saturno",
    size: 1.0,
    texture: "./textures/saturn.jpg",
    info: "Famoso por sus anillos de hielo y roca.",
    more: "Sus anillos tienen miles de km de diámetro pero apenas metros de espesor. Titán, su luna, posee atmósfera densa.",
    stats: {
      distanceAU: 9.58, radiusKm: 58232, mass10e24kg: 568,
      dayHours: 10.7, yearDays: 10747, moons: 83, tempC: "≈ −178"
    },
    facts: [
      "Los anillos están compuestos principalmente por hielo.",
      "Titán tiene mares de metano líquido.",
      "Su densidad es menor que la del agua."
    ]
  },
  {
    name: "Urano",
    size: 0.8,
    texture: "./textures/uranus.jpg",
    info: "Gira ‘de costado’, probablemente por un gran impacto.",
    more: "Es un gigante de hielo con atmósfera de hidrógeno, helio y metano; presenta estaciones extremas por su gran inclinación.",
    stats: {
      distanceAU: 19.2, radiusKm: 25362, mass10e24kg: 86.8,
      dayHours: 17.2, yearDays: 30589, moons: 27, tempC: "≈ −224"
    },
    facts: [
      "Sus anillos son tenues y oscuros.",
      "Tiene rotación retrógrada como Venus.",
      "El metano le da su color azul verdoso."
    ]
  },
  {
    name: "Neptuno",
    size: 0.7,
    texture: "./textures/neptune.jpg",
    info: "El planeta más lejano, con vientos supersónicos.",
    more: "Su color azul profundo se debe al metano. La luna Tritón podría ser un objeto capturado del Cinturón de Kuiper.",
    stats: {
      distanceAU: 30.05, radiusKm: 24622, mass10e24kg: 102,
      dayHours: 16.1, yearDays: 59800, moons: 14, tempC: "≈ −214"
    },
    facts: [
      "La Gran Mancha Oscura fue una tormenta observada por Voyager 2.",
      "Tritón tiene géiseres de nitrógeno.",
      "Recibe poca luz solar por su gran distancia."
    ]
  }
];
