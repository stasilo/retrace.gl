// import queryString from 'query-string';

import {
    observable,
    computed,
    action
} from 'mobx';

import raytraceApp from '../raytracer';

import createIsoFogScene from '../scenes/generative-iso-fog-test';
import createAnisoFogScene from '../scenes/generative-aniso-fog-test';
import createDynEvalScene from '../scenes/dyn-eval-test-scene';

const shaderSampleCount = 1;
const defaultMaxSampleCount = 10;

let instance = null;
class Store {
    @observable _currentFrameCount = 0;
    @observable _currentMaxSampleCount = defaultMaxSampleCount;
    @observable _currentRenderTime = 0;
    @observable _renderInProgress = false;

    @observable _scene = null;

    constructor() {
        // let params = queryString.parse(location.search);;
        // this.params = params;
    }

    @action async loadScene() {
        // this._scene = await createAnisoFogScene();
        this._scene = await createDynEvalScene(); 
    }

    trace() {
        raytraceApp({
            scene: this._scene,
            shaderSampleCount,
            maxSampleCount: this._currentMaxSampleCount,
            realTime: false,
            debug: false
        });
    }

    // renderer state

    @computed
    get renderInProgress() {
        return this._renderInProgress;
    }

    set renderInProgress(val) {
        this._renderInProgress = val;
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
        return this._currentMaxSampleCount;
    }

    set currentMaxSampleCount(val) {
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
    get renderTimeRemaining() {
        const remainMs = (this.currentMaxSampleCount / this._currentFrameCount)
            * this.currentRenderTime;
        return (remainMs).toFixed(0);
    }

    @computed
    get renderProgress() {
        return this._currentFrameCount / this._currentMaxSampleCount;
    }

    // actions

    @action async regenerateScene() {
        await this.loadScene();
        this.currentMaxSampleCount = defaultMaxSampleCount;
        this.trace();
    }
}

export default () => {
    if(!instance) {
        instance = new Store();
    }

    return instance;
}
