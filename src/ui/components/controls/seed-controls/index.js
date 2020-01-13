import React, {useState} from "react";
import ReactDOM from 'react-dom';

import {reaction} from 'mobx';
import {observer, useObservable} from 'mobx-react-lite';

import getStore from '../../../../store';

import './index.scss';

const SeedControls = observer(() => {
    let store = getStore();

    const handleChange = (e) => {
        e.preventDefault();
        store.currentRandomSeed = e.target.value.replace(/[^\d.-]/g, '');
    };

    return (
        <div className="header-item render-controls">
            <form onSubmit={handleChange}>
                <label htmlFor="seed">
                    seed:
                </label>
                <input
                    value={store.currentRandomSeed}
                    onChange={handleChange}
                    type="text"
                    name="seed"
                    required
                />
            </form>
        </div>
    )
});

export default SeedControls;
