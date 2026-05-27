# TODO - Posibles mejoras para Giros Ball

## Estado actual del proyecto

### Tecnologías
- **Framework**: Expo SDK 54 + React Native 0.81.5
- **Navegación**: React Navigation Native Stack
- **Sensores**: expo-sensors (acelerómetro)
- **Persistencia**: @react-native-async-storage/async-storage
- **Orientación**: Portrait bloqueado

### Lo que tiene el juego

| Característica | Estado |
|---|---|
| Menú principal con 3 botones | ✅ |
| Juego con control por acelerómetro | ✅ |
| Física con fricción y rebotes | ✅ |
| 20 niveles generados proceduralmente | ✅ |
| Verificación BFS de alcanzabilidad | ✅ |
| 3 materiales de bola (metal, plastic, feather) | ✅ |
| Power-ups: escudo, agrandar, encoger, cambio de material | ✅ |
| Zonas interactivas (viento, magnético, hielo, lodo) | ✅ |
| Obstáculos estáticos y móviles | ✅ |
| HUD con vidas, score, nivel, indicadores | ✅ |
| Game Over y pantalla de victoria | ✅ |
| High Scores persistente (top 10) | ✅ |
| Selector de niveles con desbloqueo progresivo | ✅ |
| +1 vida cada 3 niveles superados | ✅ |
| **Sistema de pausa** | ✅ |
| **Temporizador de nivel** | ✅ |
| **Delay inicial al cargar nivel** | ✅ |
| **Vibración háptica al perder vida** | ✅ |

---

## Mejoras priorizadas

### Prioridad alta — Jugabilidad base
- [x] ~~**Pausa**: Botón de pausa durante la partida~~ (implementado)
- [x] ~~**Power-up timer visual**: Indicador de tiempo restante~~ (en HUD)
- [x] ~~**Delay inicial al cargar nivel**: Evitar muerte instantánea al cruzar entre niveles~~ (implementado)
- [x] ~~**Vibración háptica**: Feedback táctil al perder vida~~ (implementado)
- [ ] **Power-up timer bar**: Barra de progreso visual mostrando tiempo restante de power-ups activos
- [ ] **Combo/racha**: Multiplicador de score por recolectar seguido
- [ ] **Bonificación por tiempo**: Puntos extra por completar nivel rápido
- [ ] **Tutorial interactivo**: Nivel guiado inicial explicando controles
- [ ] **Trampas**: Nuevo tipo de obstáculo (pinchos, plataformas que desaparecen, teletransporte forzado)

### Prioridad media — Contenido y retos
- [ ] **Jefes de nivel**: Obstáculo grande con mecánica especial cada 5 niveles
- [ ] **Mapas personalizados**: Reemplazar generación procedural con niveles diseñados manualmente
- [ ] **Refinar power-ups actuales**: Ajustar duración, efecto, rareza y balance
- [ ] **Refinar materiales actuales**: Ajustar físicas de metal/plastic/feather
- [ ] **Dificultad dinámica**: Ajustar obstáculos según rendimiento del jugador

### Prioridad baja — Pulido visual y audio
- [ ] **Efectos de partículas**: Al recolectar monedas, al morir, al pasar de nivel
- [ ] **Animaciones de transición**: Entre niveles y pantallas más vistosas
- [ ] **Temas visuales**: Variación de color/fondo por rango de niveles
- [ ] **Screen shake**: Animación de vibración de pantalla al chocar
- [ ] **Bola con iluminación/brillo**: Degradado radial, sombra
- [ ] **Efectos de sonido**: Recoger moneda, golpe, muerte, power-up, cambio de nivel
- [ ] **Música de fondo**: Bucle musical que acelere en niveles altos

### A futuro (post-MVP)
- [ ] **Más power-ups**: Inmunidad temporal, ralentización, magneto de monedas, multiplicador x2
- [ ] **Más materiales**: Vidrio, goma, roca
- [ ] **Niveles especiales**: Mecánicas únicas (oscuridad, gravedad invertida, teletransportadores)
- [ ] **Personajes/skins**: Desbloquear aspectos para la bola
- [ ] **Logros**: Completar sin perder vidas, speedrun, recolectar todo en X nivel
- [ ] **Online leaderboard**: Tabla de puntuaciones global
- [ ] **Ajustes**: Sensibilidad del acelerómetro, vibrar on/off, control de audio

### Técnico
- [ ] **Refactorizar GameScreen**: Separar en componentes (HUD, Bola, Obstáculos, PowerUps, Overlays)
- [ ] **Tests unitarios**: Tests para colisiones, generación de niveles, high scores
- [ ] **Optimización de memoria**: Evitar recrear objetos en cada frame
- [ ] **Pantalla de carga**: Mientras se genera el nivel proceduralmente
- [ ] **Estadísticas**: Pantalla con stats totales (partidas jugadas, monedas totales, tiempo jugado)
