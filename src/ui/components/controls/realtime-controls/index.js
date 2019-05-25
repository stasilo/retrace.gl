import React, {useState} from "react";
import ReactDOM from 'react-dom';

import {reaction} from 'mobx';
import {observer, useObservable} from 'mobx-react-lite';

import getStore from '../../../../store';

import './index.scss';

const RealtimeControls = observer(() => {
    let store = getStore();

    return (
        <div className="header-item realtime-controls">
            <button
                onClick={() => store.realTime()}
                disabled={store.realTimeMode}
            >
                r(e)altime
            </button>
        </div>
    )
});

export default RealtimeControls;
