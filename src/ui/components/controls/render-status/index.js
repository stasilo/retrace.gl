import React, {Fragment} from 'react';
import ReactDOM from 'react-dom';
import {observer} from 'mobx-react-lite';

import getStore from '../../../../store';

import './index.scss';

const RenderingInfo = observer(() => {
    const store = getStore();

    return (
        <Fragment>
            rendering: {store.currentFrameCount} / {store.currentMaxSampleCount},
            time: {store.currentRenderTime}s
            {store.renderInProgress &&
                ` / ~${store.renderTimeRemaining}s`
            }
        </Fragment>
    );
});

const RealtimeInfo = observer(() => {
    const store = getStore();

    return (
        <Fragment>
            fps: {store.currentFps}
        </Fragment>
    );
});


const RenderStatus = observer(() => {
    const store = getStore();

    return (
        <div className="header-item render-status">
            {store.realTimeMode
                ? <RealtimeInfo/>
                : <RenderingInfo/>
            }
        </div>
    )
});

export default RenderStatus;
