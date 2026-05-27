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
| Sistema de pausa | ✅ |
| Temporizador de nivel en HUD | ✅ |
| Delay inicial al cargar nivel | ✅ |
| Vibración háptica al perder vida | ✅ |
| **Power-up timer bar** | ✅ |
| **Sistema de combo/racha** | ✅ |
| **Bonificación por tiempo** | ✅ |
| **Trampas: pinchos y plataformas que desaparecen** | ✅ |
| **Sistema de sprites (sprite sheet + GameSprite)** | ✅ |
| **Modo debug de hitboxes** | ✅ |
| **Efectos de partículas** | ✅ |
| **Transición suave entre niveles** | ✅ |
| **Temas visuales por rango de niveles** | ✅ |

---

## Mejoras priorizadas

### Prioridad alta — Jugabilidad base
- [ ] **Balance de power-ups**: Refinar duración, rareza, spawn rate
- [ ] **Ajuste fino de físicas**: Balancear materiales metal/plastic/feather
- [ ] **Tutorial interactivo**: Nivel guiado inicial explicando controles
- [ ] **Dificultad dinámica**: Ajustar generación según rendimiento

### Prioridad media — Contenido y retos
- [ ] **Jefes de nivel**: Obstáculo grande con mecánica especial cada 5 niveles
- [ ] **Mapas personalizados**: Reemplazar generación procedural con niveles diseñados manualmente
- [ ] **Más tipos de trampa**: Teletransporte forzado, suelo que se rompe

### Prioridad baja — Pulido visual y audio
- [x] **Efectos de partículas**: Al recolectar monedas, al morir, al pasar de nivel
- [x] **Animaciones de transición**: Fade in al cargar nivel
- [x] **Temas visuales**: Color de fondo variable por rango de niveles
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
