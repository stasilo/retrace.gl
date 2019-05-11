import React from 'react';
import ReactDOM from 'react-dom';

import UI from './ui';
import 'normalize.css/normalize.css';
import './styles/index.scss';

import getStore from './store';

document.addEventListener('DOMContentLoaded', async () => {
    const store = getStore();

    await store.loadScene();
    store.finishLoad();
    store.trace();

    ReactDOM.render(
        <UI/>,
        document.getElementById('react-root')
    );
});
