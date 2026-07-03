# VXplore Animation Engine

`AnimationEngine` is the shared animation command layer for Editor, Player, and future VR/AR modes.

## Public API

```js
const animation = createAnimationEngine()

animation.setAnimations(clips)
animation.setSelectedAnimations(selectedMap)

animation.play({ selectedAnimations })
animation.playChapter(chapter.animations)
animation.pause()
animation.resume()
animation.stop({ reset: true })
animation.seek(1.5)
animation.setSpeed(0.75)
```

The engine does not directly depend on React or Three Fiber. It creates serializable commands consumed by the render layer (`Model.jsx`). This keeps UI, controller, engine, and renderer responsibilities separated.
