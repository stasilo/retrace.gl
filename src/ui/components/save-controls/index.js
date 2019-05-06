import React from 'react';
import ReactDOM from 'react-dom';
import {observer} from 'mobx-react-lite';
import saveCanvas from "save-canvas-to-image";

import getStore from '../../../store';

import './index.scss';

const canvasId = 'gl-img-canvas';

const RenderStatus = observer(() => {
    const store = getStore();

    return (
        <div className="header-item save-controls">
            <button
                onClick={() => saveCanvas.saveJPEG(canvasId, 'render')}
                disabled={store.renderInProgress}
            >
                save as image
            </button>
        </div>
    )
});

export default RenderStatus;
