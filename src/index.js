import React from 'react';
import ReactDOM from 'react-dom';
import queryString from 'query-string';

import raytraceApp from './raytracer';
import createScene from './scenes/generative-iso-fog-test';

import 'normalize.css/normalize.css';
import './styles/index.scss';

import UI from './ui';
import getStore from './store';

document.addEventListener('DOMContentLoaded', async () => {
    const store = getStore();

    await store.loadScene();
    store.trace();

    ReactDOM.render(
        <UI/>,
        document.getElementById('react-root')
    );
});
