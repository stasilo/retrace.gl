import React from 'react';
import ReactDOM from 'react-dom';
import {observer} from 'mobx-react-lite';
import saveCanvas from "save-canvas-to-image";

import getStore from '../../../../store';

import './index.scss';

const canvasId = 'gl-img-canvas';

const SaveEditControls = observer(() => {
    const store = getStore();
    const sceneName = `${store.sceneName ? store.sceneName : 'retrace-scene'}-${store.currentRandomSeed}`;

    return (
        <div className="header-item save-controls">
            <button
                onClick={() => saveCanvas.saveJPEG(canvasId, sceneName)}
                disabled={store.renderInProgress}
            >
                save as image
            </button>
        </div>
    )
});

export default SaveEditControls;
