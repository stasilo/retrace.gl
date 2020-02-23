
# retrace.gl - SDF sculpting & path tracing app
Create programatically defined geometries with an API suited for generative art - in your browser! :tada:

![retrace](https://github.com/stasilo/retrace.gl/raw/master/docs/assets/sdf-sculpture-screen.png)

[Live demo](https://stasilo.github.io/raytracer-demo/?scene=assets/scenes/sdf-sculpture/index.js.rtr) - press *regenerate scene* to generate a new goemetry.

---
Retrace.gl is an SDF sculptor software and physically based path tracer written in webgl2/glsl. It has a declarative scene API geared towards generative art, with support for dynamic composition of SDF CSG's (Constructive Solid Geometries composed of Signed Distance Functions), using Javascript.

You can also export your SDF composition as a regular mesh in STL-format, ready for 3d-printing:

<p align="center">
    <img width="40%" alt="Printed SDF mesh" src="https://github.com/stasilo/retrace.gl/raw/master/docs/assets/printed-sculpture.jpg" />
</p>

## SDF CSG!?
"Constructive Solid Geometries" composed of "Signed Distance Functions" sounds a bit daunting, but is a "simple" way of representing more or less complex geometry, suitable for ray marching.

If you haven't heard about this concept before I can recommend Jamie Wong's great article ["Ray Marching and Signed Distance Functions"](http://jamie-wong.com/2016/07/15/ray-marching-signed-distance-functions/) which explains SDF's and the composition of them in the context of ray marching using GLSL shaders.

The purpose of retrace.gl is to simplify the creation of these objects, by providing a declarative API suitable for generative work.

## Scene API documentation
The scene API is fully documented [here](https://stasilo.github.io/retrace-docs/global.html).

## Editor/app documentation
More info coming shortly.

The most important part to note about the editor is the random seed value which determines the outcome
of the [random family of functions in the API](https://stasilo.github.io/retrace-docs/module-random.html). This enables you to recreate a generated / random scene - just use the same seed value! See the SDF example in the header for more details.

## Features
  - GPU implementation via webgl2
  - Renders signed distance functions, triangles, spheres and volumes
  - Signed distance function constructive solid geometry bool operations (unions, differences and intersections) declarative API
  - Boolean SDF CSG operations (union, difference and intersection) implemented with all variations thereof from the hg_sdf library (stairs, columns, round, chamfer, etc.)
  - Domain deformations for SDF's (repeat, twist, etc.)
  - Deformation maps & functions for SDF's
  - SDF rendering mode for performance
  - Ray trace your SDF CSG creation
  - Export your SDF creation as an STL mesh file
  - Wavefront .obj model support (partial - no mtl support)
  - Smooth/flat shading of .obj models
  - Lambert, metal, dialectric, clearcoat & emissive materials
  - Regular & dynamic textures
  - Normal maps
  - Bounding Volume Hierarchy (BVH) acceleration (many, many thanks to [Erich Loftis](https://github.com/erichlof) for helping me out with this), including for SDF's
  - Isotropic (homogenous) & anisotropic (inhomogeneous) volume support
  - Realtime mode with a positionable turntable camera (moving the camera updates camera definition in scene description)
  - Depth of field
  - 3d texture support for volumes
  - Syntactically sugared declarative API with an integrated source editor
  - Scene description sources support the latest ES features (including pipes!) via Babel
  - ...probably some other stuff I can't think of now :)

## Example scenes
The scenes below demonstrate the capabilities of retrace.gl. Look below for scenes demoing single features for easy reference.

NOTE: Example scenes should manage ~10-15 fps in realtime mode on newer integrated GPU's (i.e. macbook pro 2017). Users of dedicated GPU's shouldn't need to worry.

You should primarily run this app on newer versions of Chrome. Newer versions of Firefox should do as well, but haven't been tested with all scenes. Mobile support is nonexistent.

*WARNING!* Some scene shaders will unfortunately take too long to compile on Windows environments due to the use of ANGLE instead of a native OpenGL implementation, especially if you're ray tracing SDF's. This will most likely crash your browser - beware!

#### SDF feature example scene 1
![retrace](https://github.com/stasilo/retrace.gl/raw/master/docs/assets/sdf-demo-scene-1.png)
*Note: to ray trace this scene, change render mode in the app ui*

[Live demo](https://stasilo.github.io/raytracer-demo/?scene=assets/scenes/sdf-test-scene-2/index.js.rtr)

#### Dynamic texture, mesh rendering, anisotropic volume example scene
![retrace](https://github.com/stasilo/retrace.gl/raw/master/docs/assets/pattern-example.jpg)

[Live demo](https://stasilo.github.io/raytracer-demo/?scene=assets/scenes/example-scene/index.js.rtr)

#### Wavefront .obj model & normal mapping example scene
![retrace](https://github.com/stasilo/retrace.gl/raw/master/docs/assets/model-example.jpg)

[Live demo](https://stasilo.github.io/raytracer-demo/?scene=assets/scenes/example-model-scene/index.js.rtr)

#### SDF feature example scene 2
![retrace](https://github.com/stasilo/retrace.gl/raw/master/docs/assets/sdf-demo-scene-3.png)

*Note: to ray trace this scene, change render mode in the app ui*

[Live demo](https://stasilo.github.io/raytracer-demo/?scene=assets/scenes/sdf-test-scene-3/index.js.rtr)



## Scenes demonstrating features

#### Material show case (and a little depth of field)
![retrace](https://github.com/stasilo/retrace.gl/raw/master/docs/assets/material-test-scene.jpg)

[Live demo](https://stasilo.github.io/raytracer-demo/?scene=assets/scenes/material-test-scene/index.js.rtr)


#### SDF geometries show case
![retrace](https://github.com/stasilo/retrace.gl/raw/master/docs/assets/sdf-geometries-example-scene.png)

*Note: to ray trace this scene, change render mode in the app ui, but beware that this scene is particularly resource intensive and may crash your browser*

[Live demo](https://stasilo.github.io/raytracer-demo/?scene=assets/scenes/sdf-geometries-test-scene/index.js.rtr)


#### SDF union operators show case
![retrace](https://github.com/stasilo/retrace.gl/raw/master/docs/assets/sdf-op-union-example.png)

*Note: to ray trace this scene, change render mode in the app ui*

[Live demo](https://stasilo.github.io/raytracer-demo/?scene=assets/scenes/sdf-union-op-scene/index.js.rtr)


#### SDF difference / subtract operators show case
![retrace](https://github.com/stasilo/retrace.gl/raw/master/docs/assets/sdf-op-subtract-example.png)

*Note: to ray trace this scene, change render mode in the app ui*

[Live demo](https://stasilo.github.io/raytracer-demo/?scene=assets/scenes/sdf-subtract-op-scene/index.js.rtr)


#### SDF intersection operators show case
![retrace](https://github.com/stasilo/retrace.gl/raw/master/docs/assets/sdf-op-intersect-example.png)

*Note: to ray trace this scene, change render mode in the app ui*

[Live demo](https://stasilo.github.io/raytracer-demo/?scene=assets/scenes/sdf-intersect-op-scene/index.js.rtr)


#### SDF export mesh example
![retrace](https://github.com/stasilo/retrace.gl/raw/master/docs/assets/sdf-export-example.png)

*Note: to ray trace this scene, change render mode in the app ui*

[Live demo](https://stasilo.github.io/raytracer-demo/?scene=assets/scenes/sdf-export-test/index.js.rtr)

[Example exported .STL file from the above scene](https://github.com/stasilo/retrace.gl/tree/master/docs/assets/sdf-export-example.stl)


#### SDF glsl displacement function example
![retrace](https://github.com/stasilo/retrace.gl/raw/master/docs/assets/sdf-displacement-func-example.png)

*Note: to ray trace this scene, change render mode in the app ui*

[Live demo](https://stasilo.github.io/raytracer-demo/?scene=assets/scenes/sdf-displacement-func-test-scene/index.js.rtr)


#### SDF displacement map example
![retrace](https://github.com/stasilo/retrace.gl/raw/master/docs/assets/sdf-displacement-map-example.png)

*Note: to ray trace this scene, change render mode in the app ui*

[Live demo](https://stasilo.github.io/raytracer-demo/?scene=assets/scenes/sdf-displacement-map-scene/index.js.rtr)

#### SDF domain op example
![retrace](https://github.com/stasilo/retrace.gl/raw/master/docs/assets/sdf-domain-op-example.png)

*Note: to ray trace this scene, change render mode in the app ui*

[Live demo](https://stasilo.github.io/raytracer-demo/?scene=assets/scenes/sdf-domain-op-scene/index.js.rtr)


#### SDF domain repetition show case
![retrace](https://github.com/stasilo/retrace.gl/raw/master/docs/assets/sdf-domain-rep-example.png)

*Note: to ray trace this scene, change render mode in the app ui*

[Live demo](https://stasilo.github.io/raytracer-demo/?scene=assets/scenes/sdf-repeat-op-scene/index.js.rtr)



#### Model smooth/flat shading
![retrace](https://github.com/stasilo/retrace.gl/raw/master/docs/assets/model-test-scene.jpg)

[Live demo](https://stasilo.github.io/raytracer-demo/?scene=assets/scenes/model-test-scene/index.js.rtr)


#### Normal mapping
![retrace](https://github.com/stasilo/retrace.gl/raw/master/docs/assets/normal-map-test-scene.jpg)

[Live demo](https://stasilo.github.io/raytracer-demo/?scene=assets/scenes/normal-map-test-scene/index.js.rtr)


#### Dynamic volumes
![retrace](https://github.com/stasilo/retrace.gl/raw/master/docs/assets/volume-test-scene.jpg)

[Live demo](https://stasilo.github.io/raytracer-demo/?scene=assets/scenes/volume-test-scene/index.js.rtr)

#### Volume texture FBM
![retrace](https://github.com/stasilo/retrace.gl/raw/master/docs/assets/volume-fbm-texture-scene.jpg)

*NOTE: this scene may take up to 20s to load as the 3d texture is generated on the fly in the main thread.*

[Live demo](https://stasilo.github.io/raytracer-demo/?scene=assets/scenes/example-volume-fbm-scene/index.js.rtr)

#### Tiled 3d texture volume
![retrace](https://github.com/stasilo/retrace.gl/raw/master/docs/assets/3d-texture-tileable-test-scene.jpg)

[Live demo](https://stasilo.github.io/raytracer-demo/?scene=assets/scenes/volume-3d-texture-tileable-test-scene/index.js.rtr)


## Todo/feature ideas
  - Fix syntax highlighting
  - Automatic bounds calculation for SDF exports
  - Rasterization rendering mode (export SDF content etc. as meshes automatically before rendering everything). Would allow for more complex SDF CSG's.
  - Handle animations? Maybe a scene definition per frame or something.
  - Better error handling/reporting
  - GLTF model support
  - Ping-pong feedback support for dynamic textures
  - Per pixel camera transforms & other crazy stuff :)
  - Overhaul of materials

## Building from source
For development release & a Webpack dev server @ http://localhost:8080/:
```sh
$ npm install ; npm run start
```

For production release:
```sh
$ npm install ; npm run build
```

## Credits
This app would not be possible without the efforts of the following people and groups, who have freely published their work in the domains of ray tracing and signed distance functions, many thanks!

 - [Peter Shirley](https://www.cs.utah.edu/~shirley/) for his book series ["Raytracing in one weekend"](http://in1weekend.blogspot.com/2016/01/ray-tracing-in-one-weekend.html), without which this app wouldn't exist.

 - Inigo Quilez, creator of [Shadertoy](https://www.shadertoy.com/) and prolific computer graphics programmer & writer. Check out his [articles](http://www.iquilezles.org/www/index.htm) on everything from SDF's, raymarching to ray tracing.

 - Demo scene group [Mercury](http://mercury.sexy), who's [hg_sdf](http://mercury.sexy/hg_sdf/) library powers this engine's SDF CSG boolean operations. And [Jeremy Cowles](https://github.com/jcowles), for the [WebGL port](https://github.com/jcowles/hg_sdf) of the same library.

 - [Thomas Hooper](https://github.com/tdhooper), for his [glsl-marching-cubes](https://github.com/tdhooper/glsl-marching-cubes) implementation which this engine uses for exporting SDF CSG's.

 - [Erich Loftis](https://github.com/erichlof), for the BVH acceleration structure implementation that made this project possible in its infancy. Check out Erich's ThreeJS path tracer [here](https://github.com/erichlof/THREE.js-PathTracing-Renderer).
