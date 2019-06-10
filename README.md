
# Retrace.gl
![retrace](https://github.com/stasilo/retrace.gl/raw/master/docs/assets/retrace.png)


[Live demo](https://stasilo.github.io/raytracer-demo/)
-

Retrace.gl is a physically based path tracer written in webgl2/glsl. It has a declarative scene api geared towards generative art. It is currently in a pre-alpha stage (kinda).

This project started as a glsl implementation of the path tracer described by Peter Shirley in his book ["Raytracing in one weekend"](http://in1weekend.blogspot.com/2016/01/ray-tracing-in-one-weekend.html) - many of the techniques used here are described in Shirley's book series on ray tracing.

*As this project is mainly a means to teach myself computer graphics, much of the code can probably be heavily optimized. Got tips or pointers to resources? Please let me know!*


## Features
  - GPU implementation via webgl2
  - Renders triangles, spheres and volumes
  - Wavefront .obj model support (partial - no mtl support)
  - Smooth/flat shading of models
  - Lambert, metal, dialectric, clearcoat & emissive materials
  - Regular & dynamic textures
  - Normal maps
  - Bounding Volume Hierarchy (BVH) acceleration (many, many thanks to [Erich Loftis](https://github.com/erichlof) for helping me out with this)
  - Isotropic (homogenous) & anisotropic (inhomogenous) volume support
  - Realtime mode with a positionable turntable camera (moving the camera updates camera definition in scene description)
  - Depth of field
  - 3d texture support for volumes
  - Syntactically sugared declarative API with an integrated source editor
  - Scene description sources support the latest ES features (including pipes!) via Babel
  - ...probably some other stuff I can't think of now :)

## Example scenes
NOTE: Example scenes should manage ~10-15 fps in realtime mode on newer integrated GPU's (i.e. macbook pro 2017). Users of dedicated GPU's shouldn't need to worry.

You should primarily run this app on newer versions of Chrome. Newer versions of Firefox should do as well, but haven't been tested with all scenes. Mobile support is nonexistent.

![retrace](https://github.com/stasilo/retrace.gl/raw/master/docs/assets/pattern-example.jpg)

[Live demo](https://stasilo.github.io/raytracer-demo/?scene=assets/scenes/example-scene/index.js.rtr)



![retrace](https://github.com/stasilo/retrace.gl/raw/master/docs/assets/model-example.jpg)

[Live demo](https://stasilo.github.io/raytracer-demo/?scene=assets/scenes/example-model-scene/index.js.rtr)

## Demo scenes

#### Materials
![retrace](https://github.com/stasilo/retrace.gl/raw/master/docs/assets/material-test-scene.jpg)

[Live demo](https://stasilo.github.io/raytracer-demo/?scene=assets/scenes/material-test-scene/index.js.rtr)

#### Model smooth/flat shading
![retrace](https://github.com/stasilo/retrace.gl/raw/master/docs/assets/model-test-scene.jpg)

[Live demo](https://stasilo.github.io/raytracer-demo/?scene=assets/scenes/model-test-scene/index.js.rtr)



#### Normal mapping
![retrace](https://github.com/stasilo/retrace.gl/raw/master/docs/assets/normal-map-test-scene.jpg)

[Live demo](https://stasilo.github.io/raytracer-demo/?scene=assets/scenes/normal-map-test-scene/index.js.rtr)



#### Dynamic volumes
![retrace](https://github.com/stasilo/retrace.gl/raw/master/docs/assets/volume-test-scene.jpg)

[Live demo](https://stasilo.github.io/raytracer-demo/?scene=assets/scenes/volume-test-scene/index.js.rtr)



#### Tiled 3d texture volume
![retrace](https://github.com/stasilo/retrace.gl/raw/master/docs/assets/3d-texture-tileable-test-scene.jpg)

[Live demo](https://stasilo.github.io/raytracer-demo/?scene=assets/scenes/volume-3d-texture-tileable-test-scene/index.js.rtr)


## Todo/ideas
  - Scene api documentation
  - Better error handling/reporting
  - GLTF model support
  - Instancing (would allow BVH caching & other nice stuff)
  - Ping-pong feedback support for dynamic textures
  - Per pixel camera transforms & other crazy stuff :)
  - SDF/raymarching support?
  - Overhaul of materials

## Building from source
For development release & webpack dev server:
```sh
$ npm install ; npm run start
```

For production release:
```sh
$ npm install ; npm run build
```
