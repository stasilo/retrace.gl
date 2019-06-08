
# Retrace.gl
![retrace](https://github.com/stasilo/retrace.gl/raw/master/docs/assets/retrace.jpg)

Retrace.gl is a physically based path tracer written in webgl2/glsl. It has a declarative scene api geared towards generative art. It is currently in a pre-alpha stage (kinda).

This project started as a glsl implementation of the path tracer described by Peter Shirley in his book ["Raytracing in one weekend"](http://in1weekend.blogspot.com/2016/01/ray-tracing-in-one-weekend.html) - many of the techniques used here are described in Shirley's book.

## Features
  - Renders triangles, spheres and volumes
  - Wavefront Obj model support (partial)
  - Smooth/flat shading of models
  - Lambert, metal, dialectric, clearcoat & emissive materials
  - Regular & dynamic textures
  - Normal maps
  - Realtime mode with a positionable turntable camera
  - Bounding Volume Hierarchy (BVH) acceleration (many, many thanks to [Erich Loftis](https://github.com/erichlof) for helping me out with this)
  - Isotripic (homogenous) & anisotropic (inhomogenous) volume support
  - 3d texture support for volumes
  - Syntactically sugared declarative API with an integrated source editor
  - Scene description sources support the latest ES features (including pipes!) via Babel
  - ...probably some other stuff I can't think of now :)

## Example scenes
![retrace](https://github.com/stasilo/retrace.gl/raw/master/docs/assets/pattern-example.jpg)
-
[Live demo](https://stasilo.github.io/raytracer-demo/?scene=assets/scenes/example-scene/index.js.rtr)


![retrace](https://github.com/stasilo/retrace.gl/raw/master/docs/assets/model-example.jpg)
-
[Live demo](https://stasilo.github.io/raytracer-demo/?scene=assets/scenes/model-test-scene/index.js.rtr)

## Demo scenes
todo

## Todo/ideas
  - GLTF model support
  - Instancing (would allow BVH caching & other nice stuff)
  - Ping-pong feedback support for dynamic textures
  - Per pixel camera transforms & other crazy stuff :)
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
