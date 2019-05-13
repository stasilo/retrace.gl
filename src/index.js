import React from 'react';
import ReactDOM from 'react-dom';

import UI from './ui';
import 'normalize.css/normalize.css';
import './styles/index.scss';

import getStore from './store';

document.addEventListener('DOMContentLoaded', async () => {
    const store = getStore();

    store.setupCamera();
    await store.loadScene();

    store.loadingApp = false;
    let loader = document.querySelector('.loader');
    loader.remove();

    store.trace({realTime: true});

    ReactDOM.render(
        <UI/>,
        document.getElementById('react-root')
    );
});
