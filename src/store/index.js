import queryString from 'query-string';
import {
    observable,
    computed,
    action,
    reaction
} from 'mobx';

import fps from 'fps';

import raytraceApp from '../raytracer';
import exportSdfApp from '../sdf-exporter';
import dynamicScene from '../dtos/dynamic-scene';

import SceneStorage from '../scene-storage';

import {createCamera} from '../camera';
import {resetCanvas} from '../gl';

import {
    defined,
    definedNotNull,
    range
} from '../utils';

const shaderSampleCount = 1;
const defaultMaxSampleCount = 10;

import baseSceneSrc from '../assets/scenes/basic-scene/index.js.rtr';

// const defaultSceneUrl = 'assets/scenes/basic-scene/index.js.rtr';
// const defaultSceneUrl = 'assets/scenes/example-scene/index.js.rtr';
// const defaultSceneUrl = 'assets/scenes/example-volume-fbm-scene/index.js.rtr';

// const defaultSceneUrl = 'assets/scenes/normal-map-test-scene/index.js.rtr';
// const defaultSceneUrl = 'assets/scenes/volume-test-scene/index.js.rtr';
// const defaultSceneUrl = 'assets/scenes/aniso-volume-test-scene/index.js.rtr';

// const defaultSceneUrl = 'assets/scenes/volume-3d-texture-tileable-test-scene/index.js.rtr';
// const defaultSceneUrl = 'assets/scenes/example-model-scene/index.js.rtr';
// const defaultSceneUrl = 'assets/scenes/model-test-scene/index.js.rtr';
// const defaultSceneUrl = 'assets/scenes/material-test-scene/index.js.rtr';


// const defaultSceneUrl = 'assets/scenes/sdf-test-scene-1/index.js.rtr';

// first created scene + union demo
// const defaultSceneUrl = 'assets/scenes/sdf-test-scene-2/index.js.rtr';

// const defaultSceneUrl = 'assets/scenes/sdf-test-scene-3/index.js.rtr';

// const defaultSceneUrl = 'assets/scenes/sdf-displacement-map-scene/index.js.rtr';
// const defaultSceneUrl = 'assets/scenes/sdf-displacement-func-test-scene/index.js.rtr';

// const defaultSceneUrl = 'assets/scenes/sdf-export-test/index.js.rtr';

// const defaultSceneUrl = 'assets/scenes/sdf-sculpture-1/index.js.rtr';
// const defaultSceneUrl = 'assets/scenes/sdf-sculpture-2/index.js.rtr';
// const defaultSceneUrl = 'assets/scenes/sdf-sculpture-3/index.js.rtr';
// const defaultSceneUrl = 'assets/scenes/sdf-sculpture-4/index.js.rtr';

// const defaultSceneUrl = 'assets/scenes/sdf-geometries-test-scene/index.js.rtr';

// const defaultSceneUrl = 'assets/scenes/sdf-union-op-scene/index.js.rtr';
// const defaultSceneUrl = 'assets/scenes/sdf-subtract-op-scene/index.js.rtr';
// const defaultSceneUrl = 'assets/scenes/sdf-intersect-op-scene/index.js.rtr';

// const defaultSceneUrl = 'assets/scenes/sdf-repeat-op-scene/index.js.rtr';
const defaultSceneUrl = 'assets/scenes/sdf-domain-op-scene/index.js.rtr';


let instance = null;
class Store {
    appArgs = null;

    @observable _realTimeMode = false;
    @observable _loadingApp = true;
    @observable _hasLoadingError = false;
    @observable _loadingError = null;
    @observable _renderInProgress = false;
    @observable _renderMode = 'raytrace';

    @observable _sdfExportProgress = -1;
    @observable _sdfExportSettings = {
        resolution: 30,
        minCoords: [-1, -1, -1],
        maxCoords: [-1, -1, -1]
    }


    @observable _editorVisible = true;
    @observable _editorFocused = false;

    @observable _sceneName = null;
    @observable _sceneSrc = '';

    @observable _sceneCompilationInProgress = false;
    @observable _hasSceneEvalError = false;
    @observable _sceneSrcEvalError = [];

    @observable _scene = null;

    @observable _currentFps = 0;
    @observable _currentFrameCount = 0;
    @observable _currentMaxSampleCount = defaultMaxSampleCount;
    @observable _currentRenderTime = 0;
    @observable _currentRandomSeed = 0;
    @observable _lastRenderedRandomSeed = 0;

    _isInitialRender = true;
    _activeRenderInstance = null;
    _camera = null;

    fpsTicker = null;
    currentrendererSettings = null;
    sceneStorage = null;

    constructor() {
        this.appArgs = queryString.parse(window.location.search);

        this.fpsTicker = fps({every: 5});
        this.fpsTicker.on('data', (frameRate) => {
            this._currentFps = frameRate.toFixed(3);
        });

        this.sceneStorage = new SceneStorage();
        console.log('SAVED SCENES: ', this.sceneStorage.getAllScenes());
        console.log('LAST EDITED SCENE: ', this.sceneStorage.getLastEditedScene());
    }

    setupDefaultCamera() {
        this._camera = createCamera({
            lookFrom: [3.1, 1.4, 1.9],
            lookAt: [-0.25, 0.75, -1.5],
            vUp: [0, 1, 0],
            vfov: 45,
            aperture: 0.001,
        });
    }

    // actions

    @action
    async loadScene(sceneName) {
        this._isInitialRender = true;
        this.sceneName = sceneName;
        this.sceneSrc = await this.sceneStorage.getScene(sceneName);
    }

    @action
    async loadSceneFromUrl(url) {
        this._isInitialRender = true;

        const sceneUrl = definedNotNull(url)
            ? url
            : definedNotNull(this.appArgs.scene)
                ? this.appArgs.scene
                : defaultSceneUrl;

        // const sceneUrl = definedNotNull(this.appArgs.scene)
        //     ? this.appArgs.scene
        //     : definedNotNull(url)
        //         ? url
        //         : defaultSceneUrl;

        try {
            let resp = await fetch(sceneUrl, {cache: 'no-store'});

            if(!resp.ok) {
                throw `Could not fetch scene: ${resp.status}`;
            }

            this._sceneSrc = await resp.text();

        } catch(e) {
            this.loadingError = defined(e.message)
                ? e.message
                : e;
            this.hasLoadingError = true;
        }
    }

    @action
    async newScene() {
        this._isInitialRender = true;

        this.sceneName = null;
        this.sceneSrc = baseSceneSrc;

        await this.compileScene();
    }

    @action
    async saveCurrentScene(name) {
        this.sceneName = name;
        await this.sceneStorage.saveScene(name, this.sceneSrc);
    }

    @action
    async compileScene() {
        // handle random seed if this is the initial render
        if(this._isInitialRender) {
            const seedRegex = /(scene\(\{.*initialRandomSeed:)\s*([\d.]*)/gs;
            const matches = seedRegex.exec(this.sceneSrc);

            if(matches && matches[2] && this._isInitialRender) {
                this.currentRandomSeed = matches[2];
            } else {
                this.currentRandomSeed = parseInt(Math.random() * 100000);
            }
        }

        try {
            this._scene = await dynamicScene(this.sceneSrc, this.currentRandomSeed);
            this.currentrendererSettings = this._scene.rendererSettings;

            // init settings from scene on initial render
            if(this._isInitialRender) {
                this._isInitialRender = false;

                const sdfExportSettings = this._scene.sdfExportSettings;

                if(defined(sdfExportSettings)) {
                    if(defined(sdfExportSettings.resolution)) {
                        this.sdfExportSettings.resolution = sdfExportSettings.resolution;
                    }

                    if(defined(sdfExportSettings.minCoords)) {
                        this.sdfExportSettings.minCoords = sdfExportSettings.minCoords;
                    }

                    if(defined(sdfExportSettings.maxCoords)) {
                        this.sdfExportSettings.maxCoords = sdfExportSettings.maxCoords;
                    }
                } else {
                    this.sdfExportSettings = {
                        resolution: 100,
                        minCoords: {x: 0, y: 0, z: 0},
                        maxCoords: {x: 0, y: 0, z: 0}
                    };
                }

                this.renderMode = defined(this.currentrendererSettings.renderMode)
                    ? this.currentrendererSettings.renderMode
                    : 'raytrace';
            }

            resetCanvas();

            this.hasSceneEvalError = false;
            this.sceneSrcEvalError = null;

            if(this._scene.camera) {
                this._camera = createCamera(this._scene.camera);
            } else {
                this.setupDefaultCamera();
            }
        } catch(evalError) {
            const errorStr = evalError.toString();
            const errorLocation = /\((.*):(.*)\)/
                .exec(errorStr.split('\n')[0]);

            if(errorLocation) {
                const row = errorLocation[1];
                const column = errorLocation[2];

                this.sceneSrcEvalError = {
                    row: parseInt(row) - 2,
                    column: parseInt(column) - 2,
                    text: errorStr,
                    type: "error"
                };

            } else {
                this.sceneSrcEvalError = {
                    row: -1,
                    column: -1,
                    text: errorStr,
                    type: "error"
                };
            }

            this.hasSceneEvalError = true;
            this.editorVisible = true;

            throw evalError;
        }
    }

    @action
    async deleteCurrentScene() {
        await this.sceneStorage.deleteScene(this.sceneName);
    }

    @action
    async render() {
        if(this.lastRenderedRandomSeed !== this.currentRandomSeed) {
            await this.compileScene();
        }

        this.realTimeMode = false;
        this.trace();
    }

    @action
    async realTime() {
        if(this.lastRenderedRandomSeed !== this.currentRandomSeed) {
            await this.compileScene();
        }

        this.realTimeMode = true;
        this.trace();
    }

    @action
    async exportSdf() {
        // if(this._activeRenderInstance) {
        //     this.cancelTrace();
        // }

        // this._activeRenderInstance = await exportSdfApp({
        this.sdfExportProgress = 0;

        this.sdfExportSettings = {
            resolution: parseFloat(this.sdfExportSettings.resolution),
            minCoords: {
                x: parseFloat(this.sdfExportSettings.minCoords.x),
                y: parseFloat(this.sdfExportSettings.minCoords.y),
                z: parseFloat(this.sdfExportSettings.minCoords.z),
            },
            maxCoords: {
                x: parseFloat(this.sdfExportSettings.maxCoords.x),
                y: parseFloat(this.sdfExportSettings.maxCoords.y),
                z: parseFloat(this.sdfExportSettings.maxCoords.z),
            }
        };

        await exportSdfApp({
            sdfExportSettings: this.sdfExportSettings,
            scene: this._scene,
            camera: this._camera,
            shaderSampleCount: this.realTimeMode
                ? 1
                : shaderSampleCount,
            maxSampleCount: this._currentMaxSampleCount,
            realTime: this.realTimeMode,
            debug: false
        });

        this.sdfExportProgress = -1;
    }

    @action
    async trace() {
        if(this._activeRenderInstance) {
            this.cancelTrace();
        }

        this._activeRenderInstance = await raytraceApp({
            scene: this._scene,
            camera: this._camera,
            shaderSampleCount: this.realTimeMode
                ? 1
                : shaderSampleCount,
            maxSampleCount: this._currentMaxSampleCount,
            realTime: this.realTimeMode,
            debug: false
        });

        this.lastRenderedRandomSeed = this.currentRandomSeed;
    }

    @action
    async regenerateScene() {
        this.currentRandomSeed = parseInt(Math.random() * 100000);

        await this.compileScene();
        this.currentMaxSampleCount = defaultMaxSampleCount;
        this.trace();
    }

    @action
    cancelTrace() {
        if(this._activeRenderInstance) {
            this._activeRenderInstance.cancel();
            delete this._activeRenderInstance;
            this.renderInProgress = false;
        }
    }

    @action
    updateSceneSrc() {
        if(this.editorFocused) {
            return;
        }

        const indentMatches = /(.*)(camera:)/
            .exec(this.sceneSrc);
        const noOfSpacesBeforeCamera = indentMatches[1].length;

        this.sceneSrc = this.sceneSrc
            .replace(
                /camera:\s*{((\n|.)*?\s+)}/,
                this._camera.getCurrentSceneSrcDefinition({
                    cameraIndent: noOfSpacesBeforeCamera
                })
            );
    }

    @action
    handleUiKeyShortcut = (keyName, e, handle) => {
        switch(keyName) {
            case 'alt+r':
                this.render();
                break;

            case 'alt+e':
                this.realTimeMode = true;
                this.trace();
                break;

            case 'alt+g':
                this.regenerateScene();
                break;

            case 'alt+h':
                this.editorVisible = !this.editorVisible;
                break;

            default:
                break;
        }
    }

    // main state

    @computed
    get loadingApp() {
        return this._loadingApp;
    }

    set loadingApp(val) {
        this._loadingApp = val;
    }

    @computed
    get hasLoadingError() {
        return this._hasLoadingError;
    }

    set hasLoadingError(val) {
        this._hasLoadingError = val;
    }

    @computed
    get loadingError() {
        return this._loadingError;
    }

    set loadingError(val) {
        this._loadingError = val;
    }

    @computed
    get realTimeMode() {
        return this._realTimeMode;
    }

    set realTimeMode(val) {
        this._realTimeMode = val;
    }

    @computed
    get renderInProgress() {
        return this._renderInProgress;
    }

    set renderInProgress(val) {
        this._renderInProgress = val;
    }

    @computed
    get sdfExportProgress() {
        return this._sdfExportProgress;
    }

    set sdfExportProgress(val) {
        this._sdfExportProgress = val;
    }

    @computed
    get sdfExportSettings() {
        return this._sdfExportSettings;
    }

    set sdfExportSettings(val) {
        this._sdfExportSettings = val;
    }

    @computed
    get renderMode() {
        return this._renderMode;
    }

    set renderMode(val) {
        this._renderMode = val;
    }

    @computed
    get editorVisible() {
        return this._editorVisible;
    }

    set editorVisible(val) {
        this._editorVisible = val;
    }

    @computed
    get editorFocused() {
        return this._editorFocused;
    }

    set editorFocused(val) {
        this._editorFocused = val;
    }

    @computed
    get scene() {
        return this._scene;
    }

    @computed
    get sceneName() {
        return this._sceneName;
    }

    set sceneName(val) {
        document.title = val
            ? `retrace.gl - ${val}`
            : 'retraice.gl';

        this._sceneName = val;
    }

    @computed
    get sceneSrc() {
        return this._sceneSrc;
    }

    set sceneSrc(val) {
        this._sceneSrc = val;
    }

    @computed
    get sceneCompilationInProgress() {
        return this._sceneCompilationInProgress;
    }

    set sceneCompilationInProgress(val) {
        this._sceneCompilationInProgress = val;
    }

    @computed
    get hasSceneEvalError() {
        return this._hasSceneEvalError;
    }

    set hasSceneEvalError(val) {
        this._hasSceneEvalError = val;
    }

    @computed
    get sceneSrcEvalError() {
        return this._sceneSrcEvalError;
    }

    set sceneSrcEvalError(val) {
        this._sceneSrcEvalError = val;
    }

    // sdf

    @computed
    get sceneHasSdfGeometries() {
        return this._scene
            ? this._scene.hasSdfGeometries
            : false;
    }

    // stats

    @computed
    get currentFps() {
        return this._currentFps;
    }

    @computed
    get currentFrameCount() {
        return this._currentFrameCount;
    }

    set currentFrameCount(val) {
        this._currentFrameCount = val;
    }

    @computed
    get currentMaxSampleCount() {
        return this.renderMode == 'sdf'
            ? 8 //4 //2
            : this._currentMaxSampleCount;
    }

    set currentMaxSampleCount(val) {
        if(this._renderMode == 'sdf') {
            return;
        }

        this._currentMaxSampleCount = val;
    }

    @computed
    get currentRenderTime() {
        return (this._currentRenderTime*0.001).toFixed(2);
    }

    set currentRenderTime(val) {
        this._currentRenderTime = val;
    }

    @computed
    get currentRandomSeed() {
        return this._currentRandomSeed;
    }

    set currentRandomSeed(val) {
        this._currentRandomSeed = Number(val);
    }

    @computed
    get lastRenderedRandomSeed() {
        return this._lastRenderedRandomSeed;
    }

    set lastRenderedRandomSeed(val) {
        this._lastRenderedRandomSeed = Number(val);
    }

    @computed
    get renderTimeRemaining() {
        const remainSecs = (this.currentMaxSampleCount / this._currentFrameCount)
            * this.currentRenderTime;
        return (remainSecs).toFixed(0);
    }

    @computed
    get renderProgress() {
        return this._currentFrameCount / this.currentMaxSampleCount;
    }
}

export default () => {
    if(!instance) {
        instance = new Store();
    }

    return instance;
}
