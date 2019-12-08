import React, {useState} from "react";
import ReactDOM from 'react-dom';

import {reaction} from 'mobx';
import {observer, useObservable} from 'mobx-react-lite';

import getStore from '../../../../store';

import './index.scss';

const RenderControls = observer(() => {
    let store = getStore();

    let state = useObservable({
        maxSampleCount: store.currentMaxSampleCount,
        setMaxSampleCount(val) {
            state.maxSampleCount = val;
        }
    });

    reaction(
        () => store.currentMaxSampleCount,
        c => state.setMaxSampleCount(c)
    );

    return (
        <div className="header-item render-controls">
            <form
                onSubmit={e => {
                    e.preventDefault();
                    if(store.renderInProgress) {
                        store.cancelTrace();
                    } else {
                        store.currentMaxSampleCount = state.maxSampleCount;
                        store.render();
                    }
                }}
            >
                <label htmlFor="maxSampleCount">
                    samples:
                </label>
                <input
                    value={state.maxSampleCount}
                    onChange={e => state.setMaxSampleCount(e.target.value)}
                    type="text"
                    name="maxSampleCount"
                    disabled={store.renderMode === 'sdf'}
                    required
                />
                <button>
                    {!store.renderInProgress
                        ? '(r)ender'
                        : 'stop'
                    }
                </button>
            </form>
        </div>
    )
});

export default RenderControls;
