import React from 'react';
import ReactDOM from 'react-dom';
import {observer} from 'mobx-react-lite';

import getStore from '../../../store';

import './index.scss';

const RenderStatus = observer(() => {
    const store = getStore();

    return (
        <div className="header-item render-status">
            rendering: {store.currentFrameCount} / {store.currentMaxSampleCount},
            time: {store.currentRenderTime}s
            {store.renderInProgress &&
                ` / ~${store.renderTimeRemaining}s`
            }
        </div>
    )
});

export default RenderStatus;
